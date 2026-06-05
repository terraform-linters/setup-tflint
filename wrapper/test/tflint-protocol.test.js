import path from 'path';

import { BIN_SUFFIX, CLI_PATH_ENV, resolveBinPath } from '../lib/tflint-protocol';

describe('tflint-protocol', () => {
  it('exposes the protocol constants', () => {
    expect(BIN_SUFFIX).toBe('tflint-bin');
    expect(CLI_PATH_ENV).toBe('TFLINT_CLI_PATH');
  });

  it('resolves the binary path under a directory', () => {
    expect(resolveBinPath('/some/dir')).toBe(`/some/dir${path.sep}tflint-bin`);
  });
});
