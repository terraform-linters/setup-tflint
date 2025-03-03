import core from '@actions/core';
import setup from './src/setup-tflint';

async function run() {
  try {
    await setup();
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

// Export the run function for testing
export { run };
