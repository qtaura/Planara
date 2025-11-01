import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendVerificationCode } from '../../lib/api';

describe('API offline detection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('retries when offline and succeeds after online event', async () => {
    // Mock offline
    Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true });
    const mockRes = new Response('{}', { status: 200 });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockRes);

    const promise = sendVerificationCode('user@example.com');
    // Simulate network connectivity restoration
    window.dispatchEvent(new Event('online'));

    await expect(promise).resolves.toBeTruthy();
    expect(fetchSpy).toHaveBeenCalled();

    // Restore online
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
  });
});
