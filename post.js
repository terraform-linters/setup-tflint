import core from '@actions/core';

import saveCache from './src/cache-save.js';

async function run() {
  try {
    await saveCache();
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

export { run };
