import { Router } from "express";
import { getComments, createComment, deleteComment } from "../controllers/commentsController.js";
import { authenticate, requireVerified } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);
router.use(requireVerified);

router.get("/", getComments);
router.post("/", createComment);
router.delete("/:id", deleteComment);

export default router;