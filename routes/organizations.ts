import { Router } from "express";
import { authenticate, requireVerified } from "../middlewares/auth.js";
import { createOrganization, listMyOrganizations, updateOrganization, deleteOrganization, transferOrgOwnership } from "../controllers/organizationsController.js";

const router = Router();

router.use(authenticate);
router.use(requireVerified);

router.get("/", listMyOrganizations);
router.post("/", createOrganization);
router.put("/:id", updateOrganization);
router.delete("/:id", deleteOrganization);
router.post("/:id/transfer-ownership", transferOrgOwnership);

export default router;