import path from 'path';

const pathToCLI = [process.env.TFLINT_CLI_PATH, `tflint-bin`].join(path.sep);

export default pathToCLI;
