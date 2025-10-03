import {
  STATE_CACHE_PRIMARY_KEY,
  STATE_CACHE_MATCHED_KEY,
  STATE_CACHE_PATHS,
} from '../cache-restore';

describe('cache-restore', () => {
  it('exports state constants', () => {
    expect(STATE_CACHE_PRIMARY_KEY).toBe('TFLINT_CACHE_KEY');
    expect(STATE_CACHE_MATCHED_KEY).toBe('TFLINT_CACHE_MATCHED_KEY');
    expect(STATE_CACHE_PATHS).toBe('TFLINT_CACHE_PATHS');
  });
});
