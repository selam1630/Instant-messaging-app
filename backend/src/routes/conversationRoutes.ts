import express from "express";
import { getOrCreateConversation, getUserConversations } from "../controllers/conversationController";

const router = express.Router();
router.get("/list/:userId", getUserConversations);

router.get("/get-or-create", getOrCreateConversation);

export default router;  
