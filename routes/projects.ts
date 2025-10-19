import { Router } from "express";
import { getProjects, createProject, updateProject, deleteProject } from "../controllers/projectsController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", getProjects);
router.post("/", createProject);
router.put("/:id", updateProject);
router.delete("/:id", deleteProject);

export default router;