import path from 'path';

export const BIN_SUFFIX = 'tflint-bin';
export const CLI_PATH_ENV = 'TFLINT_CLI_PATH';

export function resolveBinPath(dir) {
  return [dir, BIN_SUFFIX].join(path.sep);
}
