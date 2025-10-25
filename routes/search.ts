import { Router } from "express";
import { authenticate, requireVerified } from "../middlewares/auth.js";
import { searchTasks, searchProjects, searchComments } from "../controllers/searchController.js";
import { requirePermission } from "../middlewares/rbac.js";

const router = Router();

router.use(authenticate);
router.use(requireVerified);

// Global search endpoints
router.get("/tasks", requirePermission("task", "read"), searchTasks);
router.get("/projects", requirePermission("project", "read"), searchProjects);
router.get("/comments", requirePermission("comment", "read"), searchComments);

export default router;