import { Router } from "express";
import { getComments, createComment, deleteComment } from "../controllers/commentsController.js";
import { authenticate, requireVerified } from "../middlewares/auth.js";
import { requirePermission } from "../middlewares/rbac.js";

const router = Router();

router.use(authenticate);
router.use(requireVerified);

router.get("/", requirePermission("comment", "read"), getComments);
router.post("/", requirePermission("comment", "create"), createComment);
router.delete("/:id", requirePermission("comment", "delete"), deleteComment);

export default router;