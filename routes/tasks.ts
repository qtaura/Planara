import { Router } from "express";
import { getTasks, createTask, updateTask, deleteTask } from "../controllers/tasksController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", getTasks);
router.post("/", createTask);
router.put("/:id", updateTask);
router.delete("/:id", deleteTask);

export default router;