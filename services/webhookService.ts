import crypto from 'crypto';
import { Request } from 'express';

// HMAC signing and verification utilities for inbound/outbound webhooks
// Supports generic HMAC (sha256 of body) and Slack's v0 signature scheme

export function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verifySlackSignature(req: Request & { rawBody?: Buffer }, secret: string): boolean {
  const sigHeader = (req.headers['x-slack-signature'] as string | undefined) || '';
  const tsHeader = (req.headers['x-slack-request-timestamp'] as string | undefined) || '';
  if (!sigHeader || !tsHeader || !req.rawBody) return false;

  // Prevent replay attacks: default to 5 minute tolerance
  const tolerance = parseInt(process.env.SLACK_MAX_SKEW_SECONDS || '300', 10);
  const ts = parseInt(tsHeader, 10);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > tolerance) return false;

  const baseString = `v0:${ts}:${req.rawBody.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', secret).update(baseString).digest('hex');

  // Header format: v0=hex
  if (!sigHeader.startsWith('v0=')) return false;
  const provided = sigHeader.slice('v0='.length);

  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function verifySignature(req: Request & { rawBody?: Buffer }, secret: string): boolean {
  // If Slack headers present, use Slack-specific verification
  if (req.headers['x-slack-signature']) {
    return verifySlackSignature(req, secret);
  }

  try {
    const headerSig =
      (req.headers['x-signature'] as string | undefined) ||
      (req.headers['x-hub-signature-256'] as string | undefined) ||
      '';
    if (!headerSig) return false;

    // Use raw body bytes if available (strict verification), otherwise fall back to JSON.stringify
    const bodyStr = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body ?? {});
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
