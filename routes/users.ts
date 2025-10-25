import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { inviteToTeam, acceptTeamInvite } from "../controllers/usersController.js";

const router = express.Router();

router.get("/", getUsers);
router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/refresh", refresh);
router.get("/oauth/:provider/start", startOAuth);
router.get("/oauth/:provider/callback", oauthCallback);
router.put("/:id", authenticate, updateProfile);

// Email verification routes with rate limiting
router.post("/auth/send-code", perEmailSendLimiter, emailVerificationLimiter, EmailVerificationController.sendCode);
router.post("/auth/verify-code", perEmailVerifyLimiter, emailVerificationAttemptLimiter, EmailVerificationController.verifyCode);
router.get("/auth/verification-status/:email", EmailVerificationController.getVerificationStatus);

// Admin bypass to clear lockouts/backoffs
router.post("/auth/admin/unlock", authenticate, adminOnly, EmailVerificationController.adminUnlock);
router.get("/auth/admin/lockout-state/:email", authenticate, adminOnly, EmailVerificationController.getLockoutState);
router.get("/auth/admin/events/:email", authenticate, adminOnly, EmailVerificationController.getSecurityEvents);
router.get("/auth/admin/rotations/:email", authenticate, adminOnly, EmailVerificationController.getRotationHistory);

// Admin user management
router.post("/admin/ban", authenticate, adminOnly, adminBanUser);
router.post("/admin/set-username", authenticate, adminOnly, adminSetUsername);
router.post("/auth/team/invite", authenticate, inviteToTeam);
router.post("/auth/team/accept", authenticate, acceptTeamInvite);

export default router;