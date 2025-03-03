import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { dirname } from 'path';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';

import core from '@actions/core';
import io from '@actions/io';
import * as tc from '@actions/tool-cache';
import { Octokit } from '@octokit/rest';

const __filename = fileURLToPath(import.meta.url);
const localDir = dirname(__filename);

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
    core.debug('Requesting for [latest] version ...');
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

async function downloadCLI(url, checksums) {
  core.debug(`Downloading tflint CLI from ${url}`);
  const pathToCLIZip = await tc.downloadTool(url);

  if (checksums.length > 0) {
    core.debug('Verifying checksum of downloaded file');

    const checksum = await fileSHA256(pathToCLIZip);

    if (!checksums.includes(checksum)) {
      throw new Error(`Mismatched checksum: expected one of ${checksums.join(', ')}, but got ${checksum}`);
    }

    core.debug('SHA256 hash verified successfully');
  }

  core.debug('Extracting tflint CLI zip file');
  const pathToCLI = await tc.extractZip(pathToCLIZip);
  core.debug(`tflint CLI path is ${pathToCLI}.`);

  if (!pathToCLIZip || !pathToCLI) {
    throw new Error(`Unable to download tflint from ${url}`);
  }

  return pathToCLI;
}

async function installWrapper(pathToCLI) {
  let source;
  let target;

  // Rename tflint to tflint-bin
  try {
    source = [pathToCLI, `tflint`].join(path.sep);
    target = [pathToCLI, `tflint-bin`].join(path.sep);
    core.debug(`Moving ${source} to ${target}.`);
    await io.mv(source, target);
  } catch (e) {
    core.error(`Unable to move ${source} to ${target}.`);
    throw e;
  }

  // Install wrapper as tflint
  try {
    source = path.resolve([localDir, '..', 'wrapper', 'dist', 'index.js'].join(path.sep));
    target = [pathToCLI, 'tflint'].join(path.sep);
    core.debug(`Copying ${source} to ${target}.`);
    await io.cp(source, target);
  } catch (e) {
    core.error(`Unable to copy ${source} to ${target}.`);
    throw e;
  }

  // Export a new environment variable, so our wrapper can locate the binary
  core.exportVariable('TFLINT_CLI_PATH', pathToCLI);
}

async function run() {
  try {
    const inputVersion = core.getInput('tflint_version');
    const checksums = core.getMultilineInput('checksums');
    const wrapper = core.getInput('tflint_wrapper') === 'true';
    const version = await getTFLintVersion(inputVersion);
    const platform = mapOS(os.platform());
    const arch = mapArch(os.arch());

    core.debug(`Getting download URL for tflint version ${version}: ${platform} ${arch}`);
    const url = `https://github.com/terraform-linters/tflint/releases/download/${version}/tflint_${platform}_${arch}.zip`;

    const pathToCLI = await downloadCLI(url, checksums);

    if (wrapper) {
      await installWrapper(pathToCLI);
    }

    core.addPath(pathToCLI);

    const matchersPath = path.join(localDir, '..', '.github', 'matchers.json');
    core.info(`##[add-matcher]${matchersPath}`);

    return version;
  } catch (ex) {
    core.error(ex);
    throw ex;
  }
}

export default run;
