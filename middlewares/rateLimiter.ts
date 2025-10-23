import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

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
    // Skip rate limiting for certain conditions if needed
    return false;
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
});

/**
 * General rate limiter for authentication endpoints
 * Allows 20 requests per 15 minutes per IP address
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for sensitive operations
 * Allows 5 requests per hour per IP address
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per hour
  message: {
    success: false,
    error: 'Rate limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
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
});