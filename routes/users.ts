import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { adminOnly } from "../middlewares/admin.js";
import { authLimiter, strictLimiter, perEmailSendLimiter, emailVerificationLimiter, perEmailVerifyLimiter, emailVerificationAttemptLimiter } from "../middlewares/rateLimiter.js";
import { EmailVerificationController } from "../controllers/emailVerificationController.js";
import { getUsers, signup, login, refresh, startOAuth, oauthCallback, updateProfile, adminBanUser, adminSetUsername, inviteToTeam, acceptTeamInvite, listSessions, revokeSession, renameSession, revokeOtherSessions, changeEmail, changePassword, deleteAccount } from "../controllers/usersController.js";

const router = express.Router();

router.get("/", getUsers);
router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/refresh", refresh);
router.get("/oauth/:provider/start", authLimiter, startOAuth);
router.get("/oauth/:provider/callback", authLimiter, oauthCallback);
router.put("/:id", authenticate, updateProfile);
router.post("/change-email", authenticate, strictLimiter, changeEmail);
router.post("/change-password", authenticate, strictLimiter, changePassword);
router.post("/delete-account", authenticate, strictLimiter, deleteAccount);

// Sessions management
router.get("/sessions", authenticate, listSessions);
router.post("/sessions/revoke", authenticate, strictLimiter, revokeSession);
router.post("/sessions/rename", authenticate, renameSession);
router.post("/sessions/revoke-others", authenticate, strictLimiter, revokeOtherSessions);

// Email verification routes with rate limiting
router.post("/auth/send-code", perEmailSendLimiter, emailVerificationLimiter, EmailVerificationController.sendCode);
router.post("/auth/verify-code", perEmailVerifyLimiter, emailVerificationAttemptLimiter, EmailVerificationController.verifyCode);
router.get("/auth/verification-status/:email", EmailVerificationController.getVerificationStatus);

// Admin bypass to clear lockouts/backoffs
router.post("/auth/admin/unlock", authenticate, strictLimiter, adminOnly, EmailVerificationController.adminUnlock);
router.get("/auth/admin/lockout-state/:email", authenticate, adminOnly, EmailVerificationController.getLockoutState);
router.get("/auth/admin/events/:email", authenticate, adminOnly, EmailVerificationController.getSecurityEvents);
router.get("/auth/admin/rotations/:email", authenticate, adminOnly, EmailVerificationController.getRotationHistory);

// Admin user management
router.post("/admin/ban", authenticate, adminOnly, adminBanUser);
router.post("/admin/set-username", authenticate, adminOnly, adminSetUsername);
router.post("/auth/team/invite", authenticate, inviteToTeam);
router.post("/auth/team/accept", authenticate, acceptTeamInvite);

export default router;