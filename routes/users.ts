import { Router } from "express";
import { getUsers, signup, login, updateProfile, startOAuth, oauthCallback } from "../controllers/usersController.js";
import { EmailVerificationController } from "../controllers/emailVerificationController.js";
import { authenticate } from "../middlewares/auth.js";
import { emailVerificationLimiter, emailVerificationAttemptLimiter, authLimiter, perEmailSendLimiter, perEmailVerifyLimiter } from "../middlewares/rateLimiter.js";

const router = Router();

router.get("/", getUsers);
router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.get("/oauth/:provider/start", startOAuth);
router.get("/oauth/:provider/callback", oauthCallback);
router.put("/:id", authenticate, updateProfile);

// Email verification routes with rate limiting
router.post("/auth/send-code", perEmailSendLimiter, emailVerificationLimiter, EmailVerificationController.sendCode);
router.post("/auth/verify-code", perEmailVerifyLimiter, emailVerificationAttemptLimiter, EmailVerificationController.verifyCode);
router.get("/auth/verification-status/:email", EmailVerificationController.getVerificationStatus);

export default router;