import express from "express";
import { prisma } from "../config/db";
import { getOrCreateConversation, getUserConversations } from "../controllers/conversationController";

const router = express.Router();
router.get("/list/:userId", getUserConversations);
router.get("/get-or-create", getOrCreateConversation);
router.get("/messages/:conversationId", async (req, res) => {
  const { conversationId } = req.params;
  try {
    const messages = await prisma.message.findMany({
  where: { conversationId },
  orderBy: { timestamp: "asc" } 
});
    res.json(messages);
  } catch (err) {
    console.error("Failed to fetch messages:", err);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});
router.post("/messages", async (req, res) => {
  const { conversationId, senderId, receiverId, content } = req.body;
  try {
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        receiverId,
        content,
        status: "sent",
        mediaUrls: [],
      },
    });
    res.json(message);
  } catch (err) {
    console.error("Failed to save message:", err);
    res.status(500).json({ message: "Failed to save message" });
  }
});

export default router;
