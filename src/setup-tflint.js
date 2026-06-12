import fs from 'fs';
import os from 'os';
import path from 'path';

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import { Octokit } from '@octokit/rest';

import { BIN_SUFFIX, CLI_PATH_ENV } from '../wrapper/lib/tflint-protocol.js';

import restoreCache from './cache-restore.js';
import { downloadCLI } from './installer.js';
import {
  mapArch,
  mapOS,
  normalizeVersion,
  parseVersionFile,
  resolveReleaseTarget,
} from './release-target.js';

function getOctokit() {
  return new Octokit({
    auth: core.getInput('github_token'),
  });
}

async function fetchLatestReleaseName() {
  const octokit = getOctokit();
  const response = await octokit.repos.getLatestRelease({
    owner: 'terraform-linters',
    repo: 'tflint',
  });
  core.debug(`... version resolved to [${response.data.name}]`);
  return response.data.name;
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

/**
 * Resolve the requested TFLint version, preferring an explicit `tflint_version`
 * and falling back to a version read from `tflint_version_file` when provided.
 * @returns {string} - The requested version ("latest", empty, or explicit/file)
 */
function resolveRequestedVersion() {
  const inputVersion = core.getInput('tflint_version');
  const versionFile = core.getInput('tflint_version_file');

  if (!versionFile) {
    return inputVersion;
  }

  // An explicit version wins over the file; warn so the file is not silently ignored.
  if (inputVersion && inputVersion !== 'latest') {
    core.warning(
      'Both tflint_version and tflint_version_file are set; using tflint_version and ignoring tflint_version_file.',
    );

    return inputVersion;
  }

  // The path comes from a trusted workflow input, not from untrusted runtime data.
  const filePath = path.resolve(versionFile);
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (!fs.existsSync(filePath)) {
    throw new Error(`tflint_version_file not found: ${versionFile}`);
  }

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const fileVersion = parseVersionFile(fs.readFileSync(filePath, 'utf8'));
  if (!fileVersion) {
    throw new Error(`Could not parse a TFLint version from tflint_version_file: ${versionFile}`);
  }

  core.info(`Resolved TFLint version ${fileVersion} from ${versionFile}`);

  return fileVersion;
}

async function installWrapper(pathToCLI) {
  // Move the original tflint binary to a new location
  await io.mv(path.join(pathToCLI, 'tflint'), path.join(pathToCLI, BIN_SUFFIX));

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

  core.exportVariable(CLI_PATH_ENV, pathToCLI);
}

async function run() {
  try {
    await restoreCache();

    const inputVersion = resolveRequestedVersion();
    const checksums = core.getMultilineInput('checksums');
    const wrapper = core.getInput('tflint_wrapper') === 'true';
    const platform = mapOS(os.platform());
    const arch = mapArch(os.arch());
    const { version, downloadUrl } = await resolveReleaseTarget({
      inputVersion,
      platform,
      arch,
      fetchLatestReleaseName,
    });
    const normalizedVersion = normalizeVersion(version);

    // Check if tool is already cached
    let pathToCLI = tc.find('tflint', normalizedVersion, arch);
    if (pathToCLI) {
      core.info(`Found TFLint ${version} in cache @ ${pathToCLI}`);
    } else {
      core.debug(`Getting download URL for tflint version ${version}: ${platform} ${arch}`);

      pathToCLI = await downloadCLI(downloadUrl, checksums, version);

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
