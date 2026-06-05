import { jest } from '@jest/globals';

import { mapArch, mapOS, normalizeVersion, resolveReleaseTarget } from './release-target.js';

describe('mapArch', () => {
  it('maps x32 to 386', () => {
    expect(mapArch('x32')).toBe('386');
  });

  it('maps x64 to amd64', () => {
    expect(mapArch('x64')).toBe('amd64');
  });

  it('passes through unknown architectures', () => {
    expect(mapArch('arm64')).toBe('arm64');
  });
});

describe('mapOS', () => {
  it('maps win32 to windows', () => {
    expect(mapOS('win32')).toBe('windows');
  });

  it('passes through unknown platforms', () => {
    expect(mapOS('linux')).toBe('linux');
    expect(mapOS('darwin')).toBe('darwin');
  });
});

describe('normalizeVersion', () => {
  it('strips a leading v', () => {
    expect(normalizeVersion('v0.50.0')).toBe('0.50.0');
  });

  it('leaves versions without a leading v unchanged', () => {
    expect(normalizeVersion('0.50.0')).toBe('0.50.0');
  });
});

describe('resolveReleaseTarget', () => {
  it('uses an explicit version without calling the fetcher', async () => {
    const fetchLatestReleaseName = jest.fn();

    const result = await resolveReleaseTarget({
      inputVersion: 'v0.50.0',
      platform: 'linux',
      arch: 'amd64',
      fetchLatestReleaseName,
    });

    expect(fetchLatestReleaseName).not.toHaveBeenCalled();
    expect(result).toEqual({
      version: 'v0.50.0',
      downloadUrl:
        'https://github.com/terraform-linters/tflint/releases/download/v0.50.0/tflint_linux_amd64.zip',
    });
  });

  it('calls the fetcher when the input is "latest"', async () => {
    const fetchLatestReleaseName = jest.fn().mockResolvedValue('v0.51.0');

    const result = await resolveReleaseTarget({
      inputVersion: 'latest',
      platform: 'windows',
      arch: '386',
      fetchLatestReleaseName,
    });

    expect(fetchLatestReleaseName).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      version: 'v0.51.0',
      downloadUrl:
        'https://github.com/terraform-linters/tflint/releases/download/v0.51.0/tflint_windows_386.zip',
    });
  });

  it('calls the fetcher when the input is empty', async () => {
    const fetchLatestReleaseName = jest.fn().mockResolvedValue('v0.52.0');

    const result = await resolveReleaseTarget({
      inputVersion: '',
      platform: 'darwin',
      arch: 'arm64',
      fetchLatestReleaseName,
    });

    expect(fetchLatestReleaseName).toHaveBeenCalledTimes(1);
    expect(result.version).toBe('v0.52.0');
    expect(result.downloadUrl).toBe(
      'https://github.com/terraform-linters/tflint/releases/download/v0.52.0/tflint_darwin_arm64.zip',
    );
  });
});
