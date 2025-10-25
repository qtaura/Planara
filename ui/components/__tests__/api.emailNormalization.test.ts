import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendVerificationCode, verifyEmailCode, getVerificationStatus, adminUnlock, getLockoutState } from '../../lib/api';

function okJson(data: any) {
  return Promise.resolve({
    ok: true,
    status: 200,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => data,
  } as Response);
}

describe('API email normalization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes email to lowercase and trimmed for sendVerificationCode', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init?: any) => {
      const body = JSON.parse(String(init?.body || '{}'));
      expect(body.email).toBe('user@example.com');
      return okJson({ success: true });
    });
    await sendVerificationCode('  USER@Example.com  ');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('normalizes email for verifyEmailCode', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init?: any) => {
      const body = JSON.parse(String(init?.body || '{}'));
      expect(body.email).toBe('user@example.com');
      expect(body.code).toBe('123456');
      return okJson({ success: true });
    });
    await verifyEmailCode('UsEr@Example.COM', '123456');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('normalizes email in getVerificationStatus path', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      expect(String(url)).toMatch(/verification-status\/user@example.com$/);
      return okJson({ success: true });
    });
    await getVerificationStatus('USER@Example.com');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('normalizes email in adminUnlock body', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init?: any) => {
      const body = JSON.parse(String(init?.body || '{}'));
      expect(body.email).toBe('user@example.com');
      return okJson({ success: true });
    });
    await adminUnlock('User@Example.com');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('normalizes email in getLockoutState path', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      expect(String(url)).toMatch(/lockout\/user@example.com$/);
      return okJson({ success: true });
    });
    await getLockoutState('USER@Example.com');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});