import { Router } from "express";
import { getAllUsers, getUserStatus ,getOfflineUsersStatus, updateProfileImage, getUser} from "../controllers/usercontroller";
import { authenticate } from "../Middleware/authMiddleware";

const router = Router();

router.get("/", getAllUsers);
router.get("/offline-status", getOfflineUsersStatus);
router.get("/:id/status", getUserStatus);
router.get("/:id", getUser);
router.put("/:id/profile-image", authenticate, updateProfileImage);

export default router; 
