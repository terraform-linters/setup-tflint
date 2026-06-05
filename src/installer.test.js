import fs from 'fs';
import os from 'os';
import path from 'path';

import { jest } from '@jest/globals';

jest.unstable_mockModule('@actions/core', () => ({
  info: jest.fn(),
  debug: jest.fn(),
}));

jest.unstable_mockModule('@actions/tool-cache', () => ({
  downloadTool: jest.fn(),
  extractZip: jest.fn(),
}));

const tc = await import('@actions/tool-cache');
const { downloadCLI, verifyChecksum } = await import('./installer.js');

describe('verifyChecksum', () => {
  it('does not throw when the checksum list is empty', () => {
    expect(() => verifyChecksum('abc123', [])).not.toThrow();
  });

  it('does not throw when the checksum matches', () => {
    expect(() => verifyChecksum('abc123', ['abc123', 'def456'])).not.toThrow();
  });

  it('throws on a mismatched checksum', () => {
    expect(() => verifyChecksum('zzz', ['abc123', 'def456'])).toThrow(
      'Mismatched checksum: expected one of abc123, def456, but got zzz',
    );
  });
});

describe('downloadCLI', () => {
  let zipPath;

  beforeEach(() => {
    jest.clearAllMocks();
    zipPath = path.join(os.tmpdir(), `installer-test-${Date.now()}.zip`);
    fs.writeFileSync(zipPath, 'tflint zip contents'); // eslint-disable-line security/detect-non-literal-fs-filename
  });

  afterEach(() => {
    fs.rmSync(zipPath, { force: true });
  });

  it('skips verification when the checksum list is empty', async () => {
    tc.downloadTool.mockResolvedValue(zipPath);
    tc.extractZip.mockResolvedValue('/tmp/tflint');

    const pathToCLI = await downloadCLI('https://example.com/tflint.zip', [], 'v0.50.0');

    expect(pathToCLI).toBe('/tmp/tflint');
    expect(tc.extractZip).toHaveBeenCalledWith(zipPath);
  });

  it('throws on a checksum mismatch', async () => {
    tc.downloadTool.mockResolvedValue(zipPath);
    tc.extractZip.mockResolvedValue('/tmp/tflint');

    await expect(
      downloadCLI('https://example.com/tflint.zip', ['not-the-real-checksum'], 'v0.50.0'),
    ).rejects.toThrow(/Mismatched checksum: expected one of not-the-real-checksum, but got/);

    expect(tc.extractZip).not.toHaveBeenCalled();
  });
});
