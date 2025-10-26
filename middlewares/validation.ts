import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

// Generic validation helpers using Zod
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.body ?? {});
      (req as any).validatedBody = parsed;
      // Replace body with parsed to normalize types
      req.body = parsed as any;
      next();
    } catch (err: any) {
      const issues = err?.issues || [];
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        details: issues.map((i: any) => ({ path: i.path?.join('.') || '', message: i.message }))
      });
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.query ?? {});
      (req as any).validatedQuery = parsed;
      req.query = parsed as any;
      next();
    } catch (err: any) {
      const issues = err?.issues || [];
      return res.status(400).json({
        success: false,
        error: 'invalid_query',
        details: issues.map((i: any) => ({ path: i.path?.join('.') || '', message: i.message }))
      });
    }
  };
}

// Common schemas
export const SignupSchema = z.object({
  username: z.string().min(2).max(64),
  email: z.string().email(),
  password: z.string().min(6).max(256)
});

export const LoginSchema = z.object({
  usernameOrEmail: z.string().min(1).max(256),
  password: z.string().min(6).max(256)
});

export const SendCodeSchema = z.object({
  email: z.string().email()
});

export const VerifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/)
});

export const InviteSchema = z.object({
  identifier: z.string().min(1)
});

export const AcceptInviteSchema = z.object({
  from: z.number().int().optional(),
  teamId: z.number().int().optional()
});