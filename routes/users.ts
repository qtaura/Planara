import { Router } from "express";
import { getUsers, signup, login, updateProfile } from "../controllers/usersController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.get("/", getUsers);
router.post("/signup", signup);
router.post("/login", login);
router.put("/:id", authenticate, updateProfile);

export default router;