import { Router } from "express";
import { getProjects, createProject, updateProject, deleteProject } from "../controllers/projectsController.js";
import { authenticate, requireVerified } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);
router.use(requireVerified);

router.get("/", getProjects);
router.post("/", createProject);
router.put("/:id", updateProject);
router.delete("/:id", deleteProject);

export default router;