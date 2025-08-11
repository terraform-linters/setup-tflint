#!/usr/bin/env node

import core from '@actions/core';
import { exec } from '@actions/exec';
import io from '@actions/io';

import OutputListener from './lib/output-listener.js';
import pathToCLI from './lib/tflint-bin.js';

async function checkTflint() {
  // throws if `which` does not find a result
  return io.which(pathToCLI, true);
}

(async () => {
  // This will fail if tflint isn't found, which is what we want
  await checkTflint();

  // Create listeners to receive output (in memory) as well
  const stdout = new OutputListener();
  const stderr = new OutputListener();
  const listeners = {
    stdout: stdout.listener,
    stderr: stderr.listener,
  };

  // Execute tflint and capture output
  const args = process.argv.slice(2);
  const options = {
    listeners,
    ignoreReturnCode: true,
  };
  const exitCode = await exec(pathToCLI, args, options);
  core.debug(`tflint exited with code ${exitCode}.`);
  core.debug(`stdout: ${stdout.contents}`);
  core.debug(`stderr: ${stderr.contents}`);
  core.debug(`exitcode: ${exitCode}`);

  // Set outputs, result, exitcode, and stderr
  core.setOutput('stdout', stdout.contents);
  core.setOutput('stderr', stderr.contents);
  core.setOutput('exitcode', exitCode.toString(10));

  if (exitCode !== 0) {
    // Any non-zero exit code is considered a failure
    // Exit code 1: Errors in tflint execution
    // Exit code 2: Issues found above --minimum-failure-severity threshold
    // Exit code 3+: Other errors
    core.setFailed(`TFLint exited with code ${exitCode}.`);
  }
})();
