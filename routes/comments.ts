import { Router } from "express";
import { getComments, createComment, deleteComment } from "../controllers/commentsController.js";

const router = Router();

router.get("/", getComments);
router.post("/", createComment);
router.delete("/:id", deleteComment);

export default router;