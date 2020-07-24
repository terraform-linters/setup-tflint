const fs = require('fs')
const os = require('os')
const path = require('path')
const process = require('process')

const core = require('@actions/core')
const tc = require('@actions/tool-cache')
const { Octokit } = require('@octokit/rest')


async function run() {
  if (isSupportedPlatform(process.platform)) {
    const version = await getTfLintVersion()
    const url = getDownloadUrl(version, process.platform)

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

function getOctokit() {
  const options = {}
  const token = core.getInput("token")
  if (token) {
    core.debug("Using tokne authentication for Octokit")
    options.auth = token
  }
  return new Octokit(options)
}

async function getTfLintVersion() {
  const inputVersion = core.getInput('tflint_version', {required: true})
  if (inputVersion == "latest") {
    core.debug("Requesting for [latest] version ...")
    const octokit = getOctokit()
    const response = await octokit.repos.getLatestRelease({
      owner: 'terraform-linters',
      repo: 'tflint'
    })
    core.debug(`... version resolved to [${response.data.name}]`)
    return response.data.name
  } else {
    return inputVersion
  }
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
