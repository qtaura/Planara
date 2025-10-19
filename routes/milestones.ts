import { Router } from "express";
import { getMilestones, createMilestone, updateMilestone, deleteMilestone } from "../controllers/milestonesController.js";

const router = Router();

router.get("/", getMilestones);
router.post("/", createMilestone);
router.put("/:id", updateMilestone);
router.delete("/:id", deleteMilestone);

export default router;