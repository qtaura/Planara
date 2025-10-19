import { Router } from "express";
import { getComments, createComment, deleteComment } from "../controllers/commentsController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", getComments);
router.post("/", createComment);
router.delete("/:id", deleteComment);

export default router;