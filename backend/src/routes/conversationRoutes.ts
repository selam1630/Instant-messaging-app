import express from "express";
import { getOrCreateConversation } from "../controllers/conversationController";

const router = express.Router();

router.get("/get-or-create", getOrCreateConversation);

export default router;  // ✅ Must be default export
