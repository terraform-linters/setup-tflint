import { resolvePluginDir, cacheKey } from './plugin-cache.js';

describe('resolvePluginDir', () => {
  it('prefers the input over env and default', () => {
    expect(resolvePluginDir('/from/input', '/from/env', '/home/user')).toBe('/from/input');
  });

  it('falls back to env when input is empty', () => {
    expect(resolvePluginDir('', '/from/env', '/home/user')).toBe('/from/env');
  });

  it('falls back to the default when input and env are empty', () => {
    expect(resolvePluginDir('', undefined, '/home/user')).toBe('/home/user/.tflint.d/plugins');
  });

  it('expands a leading ~ to the home directory', () => {
    expect(resolvePluginDir('~/plugins', undefined, '/home/user')).toBe('/home/user/plugins');
  });
});

describe('cacheKey', () => {
  it('builds the prefix and primary key from platform and file hash', () => {
    expect(cacheKey('Linux', 'abc123')).toEqual({
      keyPrefix: 'tflint-plugins-Linux',
      primaryKey: 'tflint-plugins-Linux-abc123',
    });
  });
});
