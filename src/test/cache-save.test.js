import saveCache from '../cache-save';

describe('cache-save', () => {
  it('exports saveCache function', () => {
    expect(typeof saveCache).toBe('function');
  });
});
