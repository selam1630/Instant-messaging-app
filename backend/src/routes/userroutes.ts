import { Router } from "express";
import { getAllUsers, getUserStatus } from "../controllers/usercontroller";

const router = Router();

router.get("/", getAllUsers);
router.get("/:id/status", getUserStatus);

export default router; 
