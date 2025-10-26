import express from "express";
import { authenticate, requireVerified } from "../middlewares/auth.js";
import { listPreferences, upsertPreference, updatePreference, deletePreference } from "../controllers/notificationPreferencesController.js";

const router = express.Router();

router.use(authenticate);
router.use(requireVerified);

// GET /api/notifications/preferences - list user's preferences
router.get("/", listPreferences);

// POST /api/notifications/preferences - upsert preference by (type, channel)
router.post("/", upsertPreference);

// PUT /api/notifications/preferences/:id - update preference toggles/frequency
router.put("/:id", updatePreference);

// DELETE /api/notifications/preferences/:id - delete a preference
router.delete("/:id", deletePreference);

export default router;