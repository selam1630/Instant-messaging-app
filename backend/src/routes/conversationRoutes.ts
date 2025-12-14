import express from "express";
import { prisma } from "../config/db";
import { getOrCreateConversation, getUserConversations } from "../controllers/conversationController";

const router = express.Router();

// Get all conversations for a user
router.get("/list/:userId", getUserConversations);

// Get or create a conversation between two users
router.get("/get-or-create", getOrCreateConversation);

// Get messages for a conversation
router.get("/messages/:conversationId", async (req, res) => {
  const { conversationId } = req.params;

  if (!conversationId) {
    return res.status(400).json({ message: "conversationId is required" });
  }

  try {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: "asc" },
    });
    res.json(messages);
  } catch (err) {
    console.error("Failed to fetch messages:", err);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

// Send a new message
router.post("/messages", async (req, res) => {
  const { conversationId, senderId, receiverId, content, mediaUrls } = req.body;

  // Validate request body
  if (!conversationId || !senderId || !receiverId || !content) {
    return res.status(400).json({
      message: "conversationId, senderId, receiverId, and content are required",
    });
  }

  try {
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        receiverId,
        content,
        status: "sent",
        mediaUrls: mediaUrls || [], // optional array of media URLs
        timestamp: new Date(),
      },
    });

    res.status(201).json(message);
  } catch (err) {
    console.error("Failed to save message:", err);
    res.status(500).json({ message: "Failed to save message" });
  }
});

export default router;
