import { describe, it, expect, vi } from 'vitest';
import { apiFetch } from '../../lib/api';

// Helper to set navigator.onLine in JSDOM
function setOnlineState(isOnline: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { value: isOnline, configurable: true });
}

describe('apiFetch offline retry behavior', () => {
  it('waits for online event and completes the request', async () => {
    setOnlineState(false);

    // Mock fetch to resolve after we dispatch online
    const mockRes = new Response('{}', { status: 200 });
    const fetchSpy = vi.fn().mockResolvedValue(mockRes);
    // @ts-ignore
    global.fetch = fetchSpy;

    // Mock sonner to avoid real UI interaction
    vi.mock('sonner', () => ({
      toast: {
        error: vi.fn(),
        success: vi.fn(),
        loading: vi.fn().mockReturnValue('id' as any),
        dismiss: vi.fn(),
      },
    }));

    const promise = apiFetch('/health');

    // Simulate network connectivity restoration
    window.dispatchEvent(new Event('online'));

    const res = await promise;
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalled();
  });
});