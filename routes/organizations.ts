import { Router } from "express";
import { authenticate, requireVerified } from "../middlewares/auth.js";
import { requireOrgOwner } from "../middlewares/rbac.js";
import { createOrganization, listMyOrganizations, updateOrganization, deleteOrganization, transferOrgOwnership } from "../controllers/organizationsController.js";

const router = Router();

router.use(authenticate);
router.use(requireVerified);

router.get("/", listMyOrganizations);
router.post("/", createOrganization);
router.put("/:id", requireOrgOwner(), updateOrganization);
router.delete("/:id", requireOrgOwner(), deleteOrganization);
router.post("/:id/transfer-ownership", requireOrgOwner(), transferOrgOwnership);

export default router;