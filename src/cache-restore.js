import os from 'os';

import * as cache from '@actions/cache';
import core from '@actions/core';
import * as glob from '@actions/glob';

const STATE_CACHE_PRIMARY_KEY = 'TFLINT_CACHE_KEY';
const STATE_CACHE_MATCHED_KEY = 'TFLINT_CACHE_MATCHED_KEY';
const STATE_CACHE_PATHS = 'TFLINT_CACHE_PATHS';

async function restoreCache() {
  const cacheEnabled = core.getInput('cache') === 'true';
  if (!cacheEnabled) {
    core.debug('Cache is not enabled');
    return;
  }

  const configPath = core.getInput('tflint_config_path');
  const pluginDir = (
    core.getInput('plugin_dir') ||
    process.env.TFLINT_PLUGIN_DIR ||
    '~/.tflint.d/plugins'
  ).replace(/^~/, os.homedir());

  core.debug(`Resolving config files matching pattern: ${configPath}`);
  const globber = await glob.create(configPath);
  const configFiles = await globber.glob();

  if (configFiles.length === 0) {
    core.warning(`No TFLint config files found matching pattern '${configPath}'. Skipping cache.`);
    return;
  }

  core.info(`Found ${configFiles.length} TFLint config file(s): ${configFiles.join(', ')}`);

  const fileHash = await glob.hashFiles(configPath);
  if (!fileHash) {
    core.warning('Unable to hash config files. Skipping cache.');
    return;
  }

  const platform = process.env.RUNNER_OS;
  const keyPrefix = `tflint-plugins-${platform}`;
  const primaryKey = `${keyPrefix}-${fileHash}`;

  core.debug(`Cache primary key: ${primaryKey}`);
  core.saveState(STATE_CACHE_PRIMARY_KEY, primaryKey);
  core.saveState(STATE_CACHE_PATHS, JSON.stringify([pluginDir]));

  const restoreKeys = [keyPrefix];
  const matchedKey = await cache.restoreCache([pluginDir], primaryKey, restoreKeys);

  core.setOutput('cache-hit', Boolean(matchedKey));

  if (!matchedKey) {
    core.info('TFLint plugin cache not found');
    return;
  }

  core.saveState(STATE_CACHE_MATCHED_KEY, matchedKey);
  core.info(`TFLint plugin cache restored from key: ${matchedKey}`);
}

export default restoreCache;
export { STATE_CACHE_PRIMARY_KEY, STATE_CACHE_MATCHED_KEY, STATE_CACHE_PATHS };
