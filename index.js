const core = require('@actions/core');

const setup = require('./src/setup-tflint');

(async () => {
  try {
    await setup();
  } catch (error) {
    core.setFailed(error.message);
  }
})();
