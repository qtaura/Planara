import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { AppDataSource } from '../db/data-source.js';
import { User, EmailVerificationCode } from '../models/index.js';
import { EmailService } from '../services/emailService.js';

// Validation schemas
const sendCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const verifyCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Code must be exactly 6 digits').regex(/^\d{6}$/, 'Code must contain only digits'),
});

export class EmailVerificationController {
  /**
   * POST /auth/send-code
   * Generates and sends a 6-digit verification code to the user's email
   */
  static async sendCode(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const { email } = sendCodeSchema.parse(req.body);

      // Check if user exists
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { email } });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found with this email address'
        });
        return;
      }

      // Check if user is already verified
      if (user.isVerified) {
        res.status(400).json({
          success: false,
          error: 'Email address is already verified'
        });
        return;
      }

      // Generate 6-digit code
      const code = crypto.randomInt(100000, 999999).toString();
      
      // Set expiration time (10 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      // Save verification code to database
      const codeRepository = AppDataSource.getRepository(EmailVerificationCode);
      
      // Invalidate any existing codes for this user
      await codeRepository.update(
        { userId: user.id, isUsed: false },
        { isUsed: true }
      );

      // Create new verification code
      const verificationCode = codeRepository.create({
        userId: user.id,
        code,
        expiresAt,
      });

      await codeRepository.save(verificationCode);

      // Send email
      await EmailService.sendVerificationCode({
        email: user.email,
        username: user.username,
        code,
      });

      res.status(200).json({
        success: true,
        message: 'Verification code sent successfully',
        expiresAt: expiresAt.toISOString(),
      });

    } catch (error) {
      console.error('Send code error:', error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid input',
          details: error.issues,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to send verification code. Please try again.',
      });
    }
  }

  /**
   * POST /auth/verify-code
   * Verifies the 6-digit code and marks the user as verified
   */
  static async verifyCode(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const { email, code } = verifyCodeSchema.parse(req.body);

      // Find user
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { email } });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found with this email address'
        });
        return;
      }

      // Check if user is already verified
      if (user.isVerified) {
        res.status(400).json({
          success: false,
          error: 'Email address is already verified'
        });
        return;
      }

      // Find valid verification code
      const codeRepository = AppDataSource.getRepository(EmailVerificationCode);
      const verificationCode = await codeRepository.findOne({
        where: {
          userId: user.id,
          code,
          isUsed: false,
        },
      });

      if (!verificationCode) {
        res.status(400).json({
          success: false,
          error: 'Invalid verification code'
        });
        return;
      }

      // Check if code has expired
      if (new Date() > verificationCode.expiresAt) {
        // Mark expired code as used
        await codeRepository.update(
          { id: verificationCode.id },
          { isUsed: true }
        );

        res.status(400).json({
          success: false,
          error: 'Verification code has expired. Please request a new one.'
        });
        return;
      }

      // Mark code as used
      await codeRepository.update(
        { id: verificationCode.id },
        { isUsed: true }
      );

      // Mark user as verified
      await userRepository.update(
        { id: user.id },
        { isVerified: true }
      );

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isVerified: true,
        },
      });

    } catch (error) {
      console.error('Verify code error:', error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid input',
          details: error.issues,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to verify code. Please try again.',
      });
    }
  }

  /**
   * GET /auth/verification-status/:email
   * Check verification status for an email (optional utility endpoint)
   */
  static async getVerificationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.params;

      if (!email || !z.string().email().safeParse(email).success) {
        res.status(400).json({
          success: false,
          error: 'Invalid email address'
        });
        return;
      }

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ 
        where: { email },
        select: ['id', 'email', 'username', 'isVerified']
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isVerified: user.isVerified,
        },
      });

    } catch (error) {
      console.error('Get verification status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get verification status',
      });
    }
  }
}