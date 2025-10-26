import crypto from 'crypto';
import { Request } from 'express';

// Simple HMAC SHA-256 signing and verification for outbound/inbound webhooks
// Note: For strict verification you usually need the raw body bytes. Since this
// app uses JSON parsing, we verify against JSON.stringify(req.body). Adjust if needed.

export function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifySignature(req: Request, secret: string): boolean {
  try {
    const headerSig =
      (req.headers['x-signature'] as string | undefined) ||
      (req.headers['x-hub-signature-256'] as string | undefined) ||
      (req.headers['x-slack-signature'] as string | undefined) ||
      '';
    if (!headerSig) return false;

    const bodyStr = JSON.stringify(req.body ?? {});
    const expected = signPayload(bodyStr, secret);

    // Some providers prefix with "sha256="; normalize for comparison
    const normalizedHeader = headerSig.startsWith('sha256=')
      ? headerSig.slice('sha256='.length)
      : headerSig;

    return crypto.timingSafeEqual(Buffer.from(normalizedHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

export type WebhookProvider = 'github' | 'jira' | 'slack' | 'custom';
