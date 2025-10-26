import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import { recordRateLimitHit } from '../services/securityTelemetry.js';

// Env-driven tuning for limiter windows and thresholds
const parseDuration = (val?: string | null): number | null => {
  if (!val) return null;
  const s = String(val).trim();
  const num = Number(s);
  if (!Number.isNaN(num)) return num; // assume milliseconds
  const m = s.match(/^([0-9]+)\s*([smh])$/i);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  if (unit === 's') return n * 1000;
  if (unit === 'm') return n * 60 * 1000;
  if (unit === 'h') return n * 60 * 60 * 1000;
  return null;
};
const getEnvInt = (key: string, def: number): number => {
  const v = process.env[key];
  const n = v != null ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : def;
};

const AUTH_WINDOW_MS = parseDuration(process.env.AUTH_LIMIT_WINDOW) ?? 10 * 60 * 1000;
const AUTH_MAX = getEnvInt('AUTH_LIMIT_MAX', 25);
const STRICT_WINDOW_MS = parseDuration(process.env.STRICT_LIMIT_WINDOW) ?? 60 * 60 * 1000;
const STRICT_MAX = getEnvInt('STRICT_LIMIT_MAX', 3);

// Repeat-hit sampling to aid abuse profiling
type HitEntry = { count: number; lastSample: number };
const hitMap: Map<string, HitEntry> = new Map();
const SAMPLE_THRESHOLD = getEnvInt('RL_SAMPLE_THRESHOLD', 3);
const SAMPLE_INTERVAL_MS = parseDuration(process.env.RL_SAMPLE_INTERVAL) ?? 5 * 60 * 1000;
const makeKey = (req: Request, limiter: string) => {
  const ip = req.ip || '';
  const ua = String(req.headers['user-agent'] || '');
  const path = req.originalUrl || '';
  return `${limiter}|${ip}|${ua}|${path}`;
};
const REDACT_KEYS = new Set(['password', 'newPassword', 'token', 'code']);
const sampleBody = (body: any): Record<string, any> => {
  if (!body || typeof body !== 'object') return { type: typeof body };
  const out: Record<string, any> = {};
  let i = 0;
  for (const [k, v] of Object.entries(body)) {
    if (i++ > 12) break; // cap number of fields
    if (REDACT_KEYS.has(k)) {
      out[k] = '[REDACTED]';
      continue;
    }
    if (typeof v === 'string') {
      out[k] = v.length > 100 ? v.slice(0, 100) + '…' : v;
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
    } else if (v == null) {
      out[k] = null;
    } else {
      out[k] = `{${typeof v}}`;
    }
  }
  return out;
};
const computeExtra = (req: Request, limiter: string): Record<string, any> => {
  const key = makeKey(req, limiter);
  const now = Date.now();
  const entry = hitMap.get(key) || { count: 0, lastSample: 0 };
  entry.count += 1;
  const extra: Record<string, any> = { hits: entry.count };
  if (entry.count >= SAMPLE_THRESHOLD && now - entry.lastSample > SAMPLE_INTERVAL_MS) {
    extra.sampledPayload = sampleBody(req.body);
    extra.sampleReason = 'repeat_hits';
    entry.lastSample = now;
  }
  hitMap.set(key, entry);
  return extra;
};

/**
 * Rate limiter for email verification code sending
 * Allows 3 requests per 15 minutes per IP address
 */
export const emailVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 requests per windowMs
  message: {
    success: false,
    error: 'Too many verification code requests. Please try again in 15 minutes.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests (only count failed attempts)
  skipSuccessfulRequests: false,
  // Skip requests that don't need rate limiting
  skip: (req: Request) => {
    // In test environment, disable IP-based rate limiting to avoid flakiness
    return process.env.NODE_ENV === 'test';
  },
  handler: async (req, res, _next, options) => {
    try {
      await recordRateLimitHit({ req, limiter: 'emailVerificationLimiter' });
    } catch {}
    res
      .status(options.statusCode)
      .json({
        success: false,
        error: 'Too many verification code requests. Please try again in 15 minutes.',
      });
  },
});

/**
 * Rate limiter for email verification code verification
 * Allows 10 attempts per 15 minutes per IP address
 */
export const emailVerificationAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 verification attempts per windowMs
  message: {
    success: false,
    error: 'Too many verification attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful verifications
  handler: async (req, res, _next, options) => {
    try {
      await recordRateLimitHit({ req, limiter: 'emailVerificationAttemptLimiter' });
    } catch {}
    res
      .status(options.statusCode)
      .json({
        success: false,
        error: 'Too many verification attempts. Please try again in 15 minutes.',
      });
  },
});

/**
 * General rate limiter for authentication endpoints
 * Allows ~25 requests per 10 minutes per IP address
 */
export const authLimiter = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  max: AUTH_MAX,
  message: {
    success: false,
    error: 'Too many authentication requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res, _next, options) => {
    const extra = computeExtra(req, 'authLimiter');
    try {
      await recordRateLimitHit({ req, limiter: 'authLimiter', extra });
    } catch {}
    res
      .status(options.statusCode)
      .json({ success: false, error: 'Too many authentication requests. Please try again later.' });
  },
});

/**
 * Strict rate limiter for sensitive operations
 * Allows 3 requests per hour per IP address
 */
export const strictLimiter = rateLimit({
  windowMs: STRICT_WINDOW_MS,
  max: STRICT_MAX,
  message: {
    success: false,
    error: 'Rate limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res, _next, options) => {
    const extra = computeExtra(req, 'strictLimiter');
    try {
      await recordRateLimitHit({ req, limiter: 'strictLimiter', extra });
    } catch {}
    res
      .status(options.statusCode)
      .json({ success: false, error: 'Rate limit exceeded. Please try again later.' });
  },
});

export const perEmailSendLimiter = rateLimit({
  windowMs: 60 * 1000, // 60 seconds cooldown per email
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = (req.body?.email ?? req.params?.email ?? req.query?.email) as string | undefined;
    if (email && typeof email === 'string') return `email:${email.toLowerCase()}`;
    const ip = req.ip || '';
    return ipKeyGenerator(ip);
  },
  message: {
    success: false,
    error: 'Please wait before requesting another code.',
  },
  handler: async (req, res, _next, options) => {
    try {
      await recordRateLimitHit({ req, limiter: 'perEmailSendLimiter' });
    } catch {}
    res
      .status(options.statusCode)
      .json({ success: false, error: 'Please wait before requesting another code.' });
  },
});

export const perEmailVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes window per email
  max: 5, // Limit to 5 verification attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = (req.body?.email ?? req.params?.email ?? req.query?.email) as string | undefined;
    if (email && typeof email === 'string') return `email:${email.toLowerCase()}`;
    const ip = req.ip || '';
    return ipKeyGenerator(ip);
  },
  message: {
    success: false,
    error: 'Too many verification attempts. Please try again later.',
  },
  handler: async (req, res, _next, options) => {
    try {
      await recordRateLimitHit({ req, limiter: 'perEmailVerifyLimiter' });
    } catch {}
    res
      .status(options.statusCode)
      .json({ success: false, error: 'Too many verification attempts. Please try again later.' });
  },
});
