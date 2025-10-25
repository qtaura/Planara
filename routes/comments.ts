import { Router } from "express";
import { getComments, createComment, deleteComment } from "../controllers/commentsController.js";
import { authenticate, requireVerified } from "../middlewares/auth.js";
import { requirePermission } from "../middlewares/rbac.js";
import { createReply, getThread, reactToComment } from "../controllers/commentThreadsController.js";

const router = Router();

router.use(authenticate);
router.use(requireVerified);

router.get("/", requirePermission("comment", "read"), getComments);
router.post("/", requirePermission("comment", "create"), createComment);
router.delete("/:id", requirePermission("comment", "delete"), deleteComment);

// Threaded comments and reactions
router.post("/:id/replies", createReply); // body: { content, authorId? }
router.get("/threads/:threadId", getThread);
router.post("/:id/reactions", reactToComment); // body: { type, op }

export default router;