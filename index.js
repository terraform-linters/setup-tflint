const fs = require('fs')
const os = require('os')
const path = require('path')
const process = require('process')

const core = require('@actions/core')
const tc = require('@actions/tool-cache')


async function run() {
  if (isSupportedPlatform(process.platform)) {
    const version = getTfLintVersion()
    const url = getDownloadUrl(getTfLintVersion(), process.platform)

    core.debug(`Downloading TFlint version [${version}] for platform [${process.platform}] from [${url}`)
    const tflintPath = await tc.downloadTool(url)

    const targetDirectory = getTargetDirectory()
    core.debug(`Extracting downloaded file [${tflintPath}] into target directory [${targetDirectory}`)
    const extractedDir = await tc.extractZip(tflintPath, targetDirectory)

    const tflintFile = path.join(extractedDir, 'tflint')
    makeFileExecutable(tflintFile)

    core.debug(`Adding [${extractedDir}] into PATH`)
    core.addPath(extractedDir)
  }
}

function getTargetDirectory() {
  return path.join(os.homedir(), 'tflint', 'bin')
}

function isSupportedPlatform(platform) {
  const supportedPlatforms = ['win32', 'linux', 'darwin']
  if (supportedPlatforms.includes(platform)) {
    return true;
  } else {
    throw new Error(
      `Your platform (${platform}) is not supported by the action.
      Supported platforms: ${supportedPlatforms}`
    )
  }
}

function isWindows() {
  return process.platform == 'win32'
}

function getTfLintVersion() {
  return core.getInput('tflint_version');
}

function getDownloadUrl(version, platform) {
  const baseUrl = "https://github.com/terraform-linters/tflint/releases/download";
  const fileNamePlatformMatrix = {
    win32: 'windows',
    darwin: 'darwin',
    linux: 'linux'
  }
  const fileName = `tflint_${fileNamePlatformMatrix[platform]}_amd64.zip`;
  return `${baseUrl}/${version}/${fileName}`
}

function makeFileExecutable(filename) {
  if (!isWindows()) {
    const chmod = '755'
    core.debug(`Setting chmod [${filename}] to [${chmod}]`)
    fs.chmodSync(`${filename}`, chmod)
  }
}


// RUN THE ACTION
run().catch((error) => core.setFailed(error.message))

module.exports = { run, makeFileExecutable }
