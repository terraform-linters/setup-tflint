import os from 'os';

import * as cache from '@actions/cache';
import * as core from '@actions/core';
import * as glob from '@actions/glob';

const STATE_CACHE_PRIMARY_KEY = 'TFLINT_CACHE_KEY';
const STATE_CACHE_MATCHED_KEY = 'TFLINT_CACHE_MATCHED_KEY';
const STATE_CACHE_PATHS = 'TFLINT_CACHE_PATHS';

/**
 * Resolves the directory where TFLint plugins are installed, expanding a leading
 * `~` to the user's home directory.
 * @param {string} input - The `plugin_dir` action input.
 * @param {string|undefined} env - The `TFLINT_PLUGIN_DIR` environment variable.
 * @param {string} homedir - The user's home directory.
 * @returns {string} The resolved plugin directory.
 */
function resolvePluginDir(input, env, homedir) {
  return (input || env || '~/.tflint.d/plugins').replace(/^~/, homedir);
}

/**
 * Builds the cache key prefix and primary key for the given platform and file hash.
 * @param {string} platform - The runner OS.
 * @param {string} fileHash - The hash of the config files.
 * @returns {{keyPrefix: string, primaryKey: string}} The cache key parts.
 */
function cacheKey(platform, fileHash) {
  const keyPrefix = `tflint-plugins-${platform}`;
  return { keyPrefix, primaryKey: `${keyPrefix}-${fileHash}` };
}

function cacheEnabled() {
  return core.getInput('cache') === 'true';
}

async function restore() {
  if (!cacheEnabled()) {
    core.debug('Cache is not enabled');
    return;
  }

  const configPath = core.getInput('tflint_config_path');
  const pluginDir = resolvePluginDir(
    core.getInput('plugin_dir'),
    process.env.TFLINT_PLUGIN_DIR,
    os.homedir(),
  );

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
  const { keyPrefix, primaryKey } = cacheKey(platform, fileHash);

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

async function save() {
  if (!cacheEnabled()) {
    core.debug('Cache is not enabled');
    return;
  }

  const primaryKey = core.getState(STATE_CACHE_PRIMARY_KEY);
  const matchedKey = core.getState(STATE_CACHE_MATCHED_KEY);

  if (!primaryKey) {
    core.debug('No cache primary key found, skipping save');
    return;
  }

  const cachePaths = JSON.parse(core.getState(STATE_CACHE_PATHS) || '[]');
  if (cachePaths.length === 0) {
    core.warning('No cache paths found, skipping save');
    return;
  }

  if (primaryKey === matchedKey) {
    core.info(`Cache hit on primary key ${primaryKey}, not saving cache`);
    return;
  }

  try {
    const cacheId = await cache.saveCache(cachePaths, primaryKey);
    if (cacheId === -1) {
      core.warning('Cache save failed');
      return;
    }

    core.info(`TFLint plugin cache saved with key: ${primaryKey}`);
  } catch (error) {
    if (error.name === 'ReserveCacheError') {
      core.info(error.message);
    } else {
      core.warning(`Failed to save cache: ${error.message}`);
    }
  }
}

export { restore, save, resolvePluginDir, cacheKey };
