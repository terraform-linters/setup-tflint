import { CLI_PATH_ENV, resolveBinPath } from './tflint-protocol.js';

export default resolveBinPath(process.env[CLI_PATH_ENV]);
