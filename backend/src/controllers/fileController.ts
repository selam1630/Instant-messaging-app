import { Request, Response } from "express";
import { prisma } from "../config/db";

export const uploadFileMessage = async (req: Request, res: Response) => {
  try {
    const { conversationId, senderId, receiverId } = req.body;

    if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const mediaUrls = req.files.map((file) => `/uploads/${file.filename}`);

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        receiverId,
        content: null,
        mediaUrls,
        status: "sent",
      },
    });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageId: message.id },
    });

    return res.json({ success: true, message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error uploading file" });
  }
};
