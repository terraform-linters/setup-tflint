const path = require('path');

module.exports = (() => {
  return [process.env.TFLINT_CLI_PATH, `tflint-bin`].join(path.sep);
})();
