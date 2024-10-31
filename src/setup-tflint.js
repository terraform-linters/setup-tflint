const os = require('os');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const fetch = require('node-fetch');

const core = require('@actions/core');
const io = require('@actions/io');
const tc = require('@actions/tool-cache');
const { Octokit } = require('@octokit/rest');

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
    request: {fetch}
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

async function computeSHA256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

async function downloadCLI(url, expectedHashes) {
  core.debug(`Downloading tflint CLI from ${url}`);
  const pathToCLIZip = await tc.downloadTool(url);

  if (expectedHashes) {
    core.debug('Verifying SHA256 hash of downloaded file');
    const computedHash = await computeSHA256(pathToCLIZip);
    if (!expectedHashes.includes(computedHash)) {
      throw new Error(`SHA256 hash mismatch: expected one of ${expectedHashes.join(', ')}, but got ${computedHash}`);
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
    source = path.resolve([__dirname, '..', 'wrapper', 'dist', 'index.js'].join(path.sep));
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
    const expectedHashes = core.getInput('expected_sha256')?.split(',').map(hash => hash.trim()) || undefined;
    const wrapper = core.getInput('tflint_wrapper') === 'true';
    const version = await getTFLintVersion(inputVersion);
    const platform = mapOS(os.platform());
    const arch = mapArch(os.arch());

    core.debug(`Getting download URL for tflint version ${version}: ${platform} ${arch}`);
    const url = `https://github.com/terraform-linters/tflint/releases/download/${version}/tflint_${platform}_${arch}.zip`;

    const pathToCLI = await downloadCLI(url, expectedHashes);

    if (wrapper) {
      await installWrapper(pathToCLI);
    }

    core.addPath(pathToCLI);

    const matchersPath = path.join(__dirname, '..', '.github', 'matchers.json');
    core.info(`##[add-matcher]${matchersPath}`);

    return version;
  } catch (ex) {
    core.error(ex);
    throw ex;
  }
}

module.exports = run;
