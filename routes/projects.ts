import { Router } from "express";
import { getProjects, createProject, updateProject, deleteProject } from "../controllers/projectsController.js";

const router = Router();

router.get("/", getProjects);
router.post("/", createProject);
router.put("/:id", updateProject);
router.delete("/:id", deleteProject);

export default router;