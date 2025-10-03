import * as cache from '@actions/cache';
import core from '@actions/core';

import {
  STATE_CACHE_PRIMARY_KEY,
  STATE_CACHE_MATCHED_KEY,
  STATE_CACHE_PATHS,
} from './cache-restore.js';

async function saveCache() {
  const cacheEnabled = core.getInput('cache') === 'true';
  if (!cacheEnabled) {
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

export default saveCache;
