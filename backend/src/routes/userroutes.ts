import { Router } from "express";
import { getAllUsers, getUserStatus ,getOfflineUsersStatus} from "../controllers/usercontroller";

const router = Router();

router.get("/", getAllUsers);
router.get("/:id/status", getUserStatus);
router.get("/offline-status", getOfflineUsersStatus);

export default router; 
