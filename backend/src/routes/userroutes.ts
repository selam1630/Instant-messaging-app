import { Router } from "express";
import { getAllUsers } from "../controllers/usercontroller";

const router = Router();

router.get("/", getAllUsers);

export default router; // ✅ This is required
