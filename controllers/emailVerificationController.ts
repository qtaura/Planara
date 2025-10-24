import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { AppDataSource } from '../db/data-source.js';
import { User, EmailVerificationCode, SecurityEvent } from '../models/index.js';
import { EmailService } from '../services/emailService.js';

// Validation schemas
const sendCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const verifyCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Code must be exactly 6 digits').regex(/^\d{6}$/,'Code must contain only digits'),
});

// Backoff/lockout constants
const RESEND_COOLDOWN_MS = 60_000;
const BASE_VERIFY_BACKOFF_MS = 10_000; // 10s
const MAX_VERIFY_BACKOFF_MS = 5 * 60_000; // 5m
const LOCKOUT_INVALID_THRESHOLD = 5; // after 5 invalid attempts
const LOCKOUT_DURATION_MS = 15 * 60_000; // 15m lockout

function hmacCode(code: string, secret?: string) {
  const key = secret || process.env.CODE_SIGN_SECRET || 'dev-secret';
  return crypto.createHmac('sha256', key).update(code).digest('hex');
}

export class EmailVerificationController {
  /**
   * POST /auth/send-code
   * Generates and sends a 6-digit verification code to the user's email
   */
  static async sendCode(req: Request, res: Response): Promise<void> {
    try {
      const { email } = sendCodeSchema.parse(req.body);

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { email } });
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found with this email address' });
        return;
      }

      if ((user as any).isVerified) {
        res.status(400).json({ success: false, error: 'Email address is already verified' });
        return;
      }

      // Progressive backoff for frequent resend attempts
      const now = new Date();
      const sendBackoffUntil = (user as any).sendBackoffUntil as Date | undefined;
      if (sendBackoffUntil && now < new Date(sendBackoffUntil)) {
        const secondsLeft = Math.ceil((new Date(sendBackoffUntil).getTime() - now.getTime()) / 1000);
        // Log send backoff event
        try {
          const evRepo = AppDataSource.getRepository(SecurityEvent);
          await evRepo.save(evRepo.create({ email: (user as any).email, userId: (user as any).id, eventType: 'send_backoff', ip: req.ip, metadata: { secondsLeft }, createdAt: new Date() }));
        } catch {}
        res.status(429).json({ success: false, error: `Please wait ${secondsLeft}s before requesting another code.` });
        return;
      }

      const codeRepository = AppDataSource.getRepository(EmailVerificationCode);
      const lastActiveCode = await codeRepository.findOne({
        where: { userId: (user as any).id, isUsed: false },
        order: { createdAt: 'DESC' as any },
      });
      if (lastActiveCode) {
        const createdMs = new Date(lastActiveCode.createdAt).getTime();
        const elapsed = Date.now() - createdMs;
        if (elapsed < RESEND_COOLDOWN_MS) {
          // escalate backoff on cooldown violation
          const backoffUntil = new Date(Date.now() + RESEND_COOLDOWN_MS * 2);
          await userRepository.update({ id: (user as any).id }, { sendBackoffUntil: backoffUntil } as any);
          const secondsLeft = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
          // Log send backoff event
          try {
            const evRepo = AppDataSource.getRepository(SecurityEvent);
            await evRepo.save(evRepo.create({ email: (user as any).email, userId: (user as any).id, eventType: 'send_backoff', ip: req.ip, metadata: { secondsLeft }, createdAt: new Date() }));
          } catch {}
          res.status(429).json({ success: false, error: `Please wait ${secondsLeft}s before requesting another code.` });
          return;
        }
      }

      // Generate 6-digit code and HMAC
      const code = crypto.randomInt(100000, 999999).toString();
      // Rotate per-user verification secret for revocation control
      const newSecret = crypto.randomBytes(16).toString('hex');
      await userRepository.update({ id: (user as any).id }, { verificationSecret: newSecret } as any);
      // Log verification secret rotation
      try {
        const evRepo = AppDataSource.getRepository(SecurityEvent);
        await evRepo.save(evRepo.create({ email: (user as any).email, userId: (user as any).id, eventType: 'rotation', ip: req.ip, metadata: null, createdAt: new Date() }));
      } catch {}
      const codeHash = hmacCode(code, newSecret);

      // Set expiration time (10 minutes)
      const expiresAt = new Date(Date.now() + 10 * 60_000);

      // Invalidate any existing codes for this user
      await codeRepository.update({ userId: (user as any).id, isUsed: false }, { isUsed: true });
      // Purge expired codes
      await codeRepository.createQueryBuilder()
        .delete()
        .from(EmailVerificationCode)
        .where("userId = :uid AND expiresAt < :now", { uid: (user as any).id, now: new Date() })
        .execute();

      // Create new verification code
      const verificationCode = codeRepository.create({ userId: (user as any).id, code, codeHash, expiresAt });
      await codeRepository.save(verificationCode);

      console.log('[DEV] Email verification code issued', { email: (user as any).email, code });
      await EmailService.sendVerificationCode({ email: (user as any).email, username: (user as any).username, code });

      // Log code sent event
      try {
        const evRepo = AppDataSource.getRepository(SecurityEvent);
        await evRepo.save(evRepo.create({ email: (user as any).email, userId: (user as any).id, eventType: 'code_sent', ip: req.ip, metadata: { expiresAt: expiresAt.toISOString() }, createdAt: new Date() }));
      } catch {}

      res.status(200).json({ success: true, message: 'Verification code sent successfully', expiresAt: expiresAt.toISOString(), devCode: process.env.RESEND_API_KEY ? undefined : code });

    } catch (error) {
      console.error('Send code error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, error: 'Invalid input', details: error.issues });
        return;
      }
      res.status(500).json({ success: false, error: 'Failed to send verification code. Please try again.' });
    }
  }

  /**
   * POST /auth/verify-code
   * Verifies the 6-digit code and marks the user as verified
   */
  static async verifyCode(req: Request, res: Response): Promise<void> {
    try {
      const { email, code } = verifyCodeSchema.parse(req.body);

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { email } });
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found with this email address' });
        return;
      }
      if ((user as any).isVerified) {
        res.status(400).json({ success: false, error: 'Email address is already verified' });
        return;
      }

      const now = new Date();
      const lockedUntil = (user as any).verifyLockedUntil as Date | undefined;
      if (lockedUntil && now < new Date(lockedUntil)) {
        const secondsLeft = Math.ceil((new Date(lockedUntil).getTime() - now.getTime()) / 1000);
        // Log lockout event
        try {
          const evRepo = AppDataSource.getRepository(SecurityEvent);
          await evRepo.save(evRepo.create({ email, userId: (user as any).id, eventType: 'lockout', ip: req.ip, metadata: { secondsLeft }, createdAt: new Date() }));
        } catch {}
        res.status(429).json({ success: false, error: `Too many verification attempts. Account temporarily locked. Try again in ${secondsLeft}s.` });
        return;
      }
      const backoffUntil = (user as any).verifyBackoffUntil as Date | undefined;
      if (backoffUntil && now < new Date(backoffUntil)) {
        const secondsLeft = Math.ceil((new Date(backoffUntil).getTime() - now.getTime()) / 1000);
        // Log backoff event
        try {
          const evRepo = AppDataSource.getRepository(SecurityEvent);
          await evRepo.save(evRepo.create({ email, userId: (user as any).id, eventType: 'backoff', ip: req.ip, metadata: { secondsLeft }, createdAt: new Date() }));
        } catch {}
        res.status(429).json({ success: false, error: `Too many verification attempts. Please wait ${secondsLeft}s before next attempt.` });
        return;
      }

      const codeRepository = AppDataSource.getRepository(EmailVerificationCode);
      const candidate = await codeRepository.findOne({ where: { userId: (user as any).id, isUsed: false } });
      let valid = false;
      if (candidate) {
        const expectedHash = candidate.codeHash;
        if (expectedHash) {
          valid = hmacCode(code, (user as any).verificationSecret) === expectedHash;
        } else {
          // Fallback for legacy rows without codeHash
          valid = candidate.code === code;
        }
      }

      if (!candidate || !valid) {
        // invalid attempt: increase backoff; lockout if threshold reached
        const invalidCount = ((user as any).verifyInvalidCount || 0) + 1;
        let newBackoff = new Date(now.getTime() + Math.min(BASE_VERIFY_BACKOFF_MS * invalidCount, MAX_VERIFY_BACKOFF_MS));
        let updates: any = { verifyInvalidCount: invalidCount, verifyBackoffUntil: newBackoff };
        if (invalidCount >= LOCKOUT_INVALID_THRESHOLD) {
          updates.verifyLockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
        }
        await userRepository.update({ id: (user as any).id }, updates);
        // Log failed attempt
        try {
          const evRepo = AppDataSource.getRepository(SecurityEvent);
          await evRepo.save(evRepo.create({ email, userId: (user as any).id, eventType: 'verify_failed', ip: req.ip, metadata: { invalidCount }, createdAt: new Date() }));
        } catch {}
        res.status(400).json({ success: false, error: 'Invalid verification code' });
        return;
      }

      // Expiry check
      if (new Date() > candidate.expiresAt) {
        await codeRepository.update({ id: candidate.id }, { isUsed: true });
        const invalidCount = ((user as any).verifyInvalidCount || 0) + 1;
        let newBackoff = new Date(now.getTime() + Math.min(BASE_VERIFY_BACKOFF_MS * invalidCount, MAX_VERIFY_BACKOFF_MS));
        let updates: any = { verifyInvalidCount: invalidCount, verifyBackoffUntil: newBackoff };
        if (invalidCount >= LOCKOUT_INVALID_THRESHOLD) {
          updates.verifyLockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
        }
        await userRepository.update({ id: (user as any).id }, updates);
        // Log expired attempt
        try {
          const evRepo = AppDataSource.getRepository(SecurityEvent);
          await evRepo.save(evRepo.create({ email, userId: (user as any).id, eventType: 'verify_failed', ip: req.ip, metadata: { reason: 'expired', invalidCount }, createdAt: new Date() }));
        } catch {}
        res.status(400).json({ success: false, error: 'Verification code has expired. Please request a new one.' });
        return;
      }

      // Mark code as used and purge all codes for this user (replay protection)
      await codeRepository.update({ id: candidate.id }, { isUsed: true });
      await codeRepository.createQueryBuilder()
        .delete()
        .from(EmailVerificationCode)
        .where("userId = :uid", { uid: (user as any).id })
        .execute();

      // Mark user verified; reset counters and backoffs
      await userRepository.update({ id: (user as any).id }, { isVerified: true, verifyInvalidCount: 0, verifyBackoffUntil: null as any, verifyLockedUntil: null as any } as any);

      // Log success
      try {
        const evRepo = AppDataSource.getRepository(SecurityEvent);
        await evRepo.save(evRepo.create({ email, userId: (user as any).id, eventType: 'verify_success', ip: req.ip, metadata: null, createdAt: new Date() }));
      } catch {}

      res.status(200).json({ success: true, message: 'Email verified successfully', user: { id: (user as any).id, email: (user as any).email, username: (user as any).username, isVerified: true } });

    } catch (error) {
      console.error('Verify code error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, error: 'Invalid input', details: error.issues });
        return;
      }
      res.status(500).json({ success: false, error: 'Failed to verify code. Please try again.' });
    }
  }

  /**
   * GET /auth/verification-status/:email
   */
  static async getVerificationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.params;
      if (!email || !z.string().email().safeParse(email).success) {
        res.status(400).json({ success: false, error: 'Invalid email address' });
        return;
      }
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { email } });
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found with this email address' });
        return;
      }
      res.status(200).json({ success: true, user: { id: (user as any).id, email: (user as any).email, username: (user as any).username, isVerified: (user as any).isVerified } });
    } catch (error) {
      console.error('Verification status error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch verification status.' });
    }
  }

  /**
   * POST /auth/admin/unlock
   * Admin-only endpoint to clear lockouts/backoffs for a user
   */
  static async adminUnlock(req: Request, res: Response): Promise<void> {
    try {
      const emailSchema = z.object({ email: z.string().email() });
      const { email } = emailSchema.parse(req.body);
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { email } });
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }
      await userRepository.update({ id: (user as any).id }, { verifyInvalidCount: 0, verifyLockedUntil: null as any, verifyBackoffUntil: null as any, sendBackoffUntil: null as any } as any);
      // Log unlock
      try {
        const evRepo = AppDataSource.getRepository(SecurityEvent);
        await evRepo.save(evRepo.create({ email, userId: (user as any).id, eventType: 'unlock', ip: req.ip, metadata: null, createdAt: new Date() }));
      } catch {}
      res.status(200).json({ success: true, message: 'User lockouts cleared' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, error: 'Invalid input', details: error.issues });
        return;
      }
      res.status(500).json({ success: false, error: 'Failed to clear lockouts' });
    }
  }

  // Admin: get lockout/backoff state for a user
  static async getLockoutState(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.params as any;
      if (!email || !z.string().email().safeParse(email).success) {
        res.status(400).json({ success: false, error: 'Invalid email address' });
        return;
      }
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { email } });
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }
      res.status(200).json({
        success: true,
        state: {
          verifyInvalidCount: (user as any).verifyInvalidCount || 0,
          verifyLockedUntil: (user as any).verifyLockedUntil || null,
          verifyBackoffUntil: (user as any).verifyBackoffUntil || null,
          sendBackoffUntil: (user as any).sendBackoffUntil || null,
          isVerified: !!(user as any).isVerified,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch lockout state' });
    }
  }

  // Admin: list rotation history events for a user
  static async getRotationHistory(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.params as any;
      if (!email || !z.string().email().safeParse(email).success) {
        res.status(400).json({ success: false, error: 'Invalid email address' });
        return;
      }
      const { from, to, limit } = req.query as any;
      const evRepo = AppDataSource.getRepository(SecurityEvent);
      let qb = evRepo
        .createQueryBuilder('ev')
        .where('ev.email = :email', { email })
        .andWhere('ev.eventType = :etype', { etype: 'rotation' })
        .orderBy('ev.createdAt', 'DESC');
      if (from) qb = qb.andWhere('ev.createdAt >= :from', { from: new Date(String(from)) });
      if (to) qb = qb.andWhere('ev.createdAt <= :to', { to: new Date(String(to)) });
      qb = qb.limit(Math.max(1, Math.min(500, Number(limit) || 50)));
      const events = await qb.getMany();
      res.status(200).json({ success: true, events });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch rotation history' });
    }
  }

  // Admin: list recent security events for a user
  static async getSecurityEvents(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.params as any;
      if (!email || !z.string().email().safeParse(email).success) {
        res.status(400).json({ success: false, error: 'Invalid email address' });
        return;
      }
      const evRepo = AppDataSource.getRepository(SecurityEvent);
      const events = await evRepo
        .createQueryBuilder('ev')
        .where('ev.email = :email', { email })
        .orderBy('ev.createdAt', 'DESC')
        .limit(50)
        .getMany();
      res.status(200).json({ success: true, events });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch events' });
    }
  }
}