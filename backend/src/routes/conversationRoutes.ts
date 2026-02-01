import express from "express";
import { prisma } from "../config/db";
import {
  getOrCreateConversation,
  getUserConversations,
  createGroupConversation,
} from "../controllers/conversationController";

const router = express.Router();
router.get("/list/:userId", getUserConversations);
router.get("/get-or-create", getOrCreateConversation);
router.post("/group", createGroupConversation);
router.get("/messages/:conversationId", async (req, res) => {
  const { conversationId } = req.params;

  if (!conversationId) {
    return res.status(400).json({ message: "conversationId is required" });
  }

  try {
    const messages = await prisma.message.findMany({
  where: { conversationId },
  orderBy: { timestamp: "asc" },
  include: {
    sender: {
      select: {
        id: true,
        name: true,
        profileImage: true, // this is exactly your field in User model
      },
    },
  },
});


    res.json(messages);
  } catch (err) {
    console.error("Failed to fetch messages:", err);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});
router.post("/messages", async (req, res) => {
  const {
    conversationId,
    senderId,
    receiverId,
    content,
    mediaUrls,
    replyToId,
    forwardedFrom,
  } = req.body;

  if (!conversationId || !senderId || !content) {
    return res.status(400).json({
      message: "conversationId, senderId, and content are required",
    });
  }

  try {
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        receiverId: receiverId || null,
        content,
        status: "sent",
        mediaUrls: mediaUrls || [],
        timestamp: new Date(),
        replyToId: replyToId || null,
        forwardedFrom: forwardedFrom || null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
      },
    });

    res.status(201).json(message);
  } catch (err) {
    console.error("Failed to save message:", err);
    res.status(500).json({ message: "Failed to save message" });
  }
});


export default router;
