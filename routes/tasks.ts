import { Router } from "express";
import { getTasks, createTask, updateTask, deleteTask } from "../controllers/tasksController.js";
import { authenticate, requireVerified } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);
router.use(requireVerified);

router.get("/", getTasks);
router.post("/", createTask);
router.put("/:id", updateTask);
router.delete("/:id", deleteTask);

export default router;