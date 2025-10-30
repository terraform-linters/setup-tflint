import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pipeline } from 'stream/promises';

import core from '@actions/core';
import exec from '@actions/exec';
import io from '@actions/io';
import * as tc from '@actions/tool-cache';
import { Octokit } from '@octokit/rest';

import restoreCache from './cache-restore.js';

/**
 * Normalize version for tool-cache compatibility
 * @param {string} version - Version string (e.g., "v0.50.0" or "0.50.0")
 * @returns {string} - Normalized version without "v" prefix
 */
function normalizeVersion(version) {
  return version.replace(/^v/, '');
}

/**
 * Get the GitHub platform architecture name
 * @param {string} arch - https://nodejs.org/api/os.html#os_os_arch
 * @returns {string}
 */
function mapArch(arch) {
  const mappings = {
    x32: '386',
    x64: 'amd64',
  };
  return mappings[arch] || arch;
}

/**
 * Get the GitHub OS name
 * @param {string} osPlatform - https://nodejs.org/api/os.html#os_os_platform
 * @returns {string}
 */
function mapOS(osPlatform) {
  const mappings = {
    win32: 'windows',
  };
  return mappings[osPlatform] || osPlatform;
}

function getOctokit() {
  return new Octokit({
    auth: core.getInput('github_token'),
  });
}

async function getTFLintVersion(inputVersion) {
  if (!inputVersion || inputVersion === 'latest') {
    const octokit = getOctokit();
    const response = await octokit.repos.getLatestRelease({
      owner: 'terraform-linters',
      repo: 'tflint',
    });
    core.debug(`... version resolved to [${response.data.name}]`);
    return response.data.name;
  }

  return inputVersion;
}

async function fileSHA256(filePath) {
  const hash = crypto.createHash('sha256');
  const fileStream = fs.createReadStream(filePath); // eslint-disable-line security/detect-non-literal-fs-filename

  await pipeline(fileStream, hash);
  return hash.digest('hex');
}

async function downloadCLI(url, checksums, version) {
  core.info(`Attempting to download ${version}...`);
  core.info(`Acquiring ${version} from ${url}`);
  const pathToCLIZip = await tc.downloadTool(url);

  if (checksums.length > 0) {
    core.debug('Verifying checksum of downloaded file');

    const checksum = await fileSHA256(pathToCLIZip);

    if (!checksums.includes(checksum)) {
      throw new Error(
        `Mismatched checksum: expected one of ${checksums.join(', ')}, but got ${checksum}`,
      );
    }

    core.debug('SHA256 hash verified successfully');
  }

  core.info('Extracting...');
  const pathToCLI = await tc.extractZip(pathToCLIZip);
  core.debug(`tflint CLI path is ${pathToCLI}.`);

  if (!pathToCLIZip || !pathToCLI) {
    throw new Error(`Unable to download tflint from ${url}`);
  }

  return pathToCLI;
}

async function getInstalledVersion() {
  try {
    let stdout = '';
    await exec.exec('tflint', ['--version'], {
      listeners: {
        stdout: (data) => {
          stdout += data.toString();
        },
      },
    });

    const firstLine = stdout.split('\n')[0];
    const match = firstLine.match(/TFLint version (.+)/);
    if (match) {
      const installedVersion = match[1];
      core.setOutput('tflint-version', installedVersion);
    } else {
      core.warning('Unable to parse tflint version from output');
    }
  } catch (error) {
    core.warning(`Failed to get tflint version: ${error.message}`);
  }
}

async function installWrapper(pathToCLI) {
  // Move the original tflint binary to a new location
  await io.mv(path.join(pathToCLI, 'tflint'), path.join(pathToCLI, 'tflint-bin'));

  // Copy the wrapper script to the tflint binary location
  await io.cp(
    path.resolve(path.join(__dirname, '..', 'wrapper', 'dist', 'index.js')),
    path.join(pathToCLI, 'tflint'),
  );

  // Copy the wrapper script package.json to the tflint binary location
  await io.cp(
    path.resolve(path.join(__dirname, '..', 'wrapper', 'dist', 'package.json')),
    path.join(pathToCLI, 'package.json'),
  );

  core.exportVariable('TFLINT_CLI_PATH', pathToCLI);
}

async function run() {
  try {
    await restoreCache();

    const inputVersion = core.getInput('tflint_version');
    const checksums = core.getMultilineInput('checksums');
    const wrapper = core.getInput('tflint_wrapper') === 'true';
    const version = await getTFLintVersion(inputVersion);
    const platform = mapOS(os.platform());
    const arch = mapArch(os.arch());
    const normalizedVersion = normalizeVersion(version);

    // Check if tool is already cached
    let pathToCLI = tc.find('tflint', normalizedVersion, arch);
    if (pathToCLI) {
      core.info(`Found TFLint ${version} in cache @ ${pathToCLI}`);
    } else {
      core.debug(`Getting download URL for tflint version ${version}: ${platform} ${arch}`);
      const url = `https://github.com/terraform-linters/tflint/releases/download/${version}/tflint_${platform}_${arch}.zip`;

      pathToCLI = await downloadCLI(url, checksums, version);

      core.info('Adding to the tool cache...');
      pathToCLI = await tc.cacheDir(pathToCLI, 'tflint', normalizedVersion, arch);
      core.info(`Successfully cached TFLint to ${pathToCLI}`);
    }

    core.addPath(pathToCLI);

    const matchersPath = path.join(__dirname, '..', '.github', 'matchers.json');
    core.info(`##[add-matcher]${matchersPath}`);

    await getInstalledVersion();

    // Must happen after version detection and caching, which depend on the real binary
    if (wrapper) {
      await installWrapper(pathToCLI);
    }

    return version;
  } catch (ex) {
    core.error(ex);
    throw ex;
  }
}

export default run;
