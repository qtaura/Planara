import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendVerificationCode } from '../../lib/api';

function networkError() {
  const err = new Error('fetch failed');
  // Simulate typical network failure
  // @ts-ignore
  err.cause = 'network';
  return err;
}

describe('API offline detection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws Network offline when navigator is offline', async () => {
    // Mock offline
    Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => { throw networkError(); });

    await expect(sendVerificationCode('user@example.com')).rejects.toThrow(/Network offline/i);

    // Restore online
    Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });
  });
});