import { prisma } from "../config/db";
import { Request, Response } from "express";

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { messageId, userId, deleteForEveryone } = req.body;

    // Validate input
    if (!messageId || !userId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Fetch the message by ID
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Delete for everyone or just for the current user
    if (deleteForEveryone) {
      await prisma.message.update({
        where: { id: messageId },
        data: { deletedForAll: true },
      });
    } else {
      await prisma.message.update({
        where: { id: messageId },
        data: { deletedFor: { push: userId } }, // push userId to deletedFor array
      });
    }

    res.json({ success: true, messageId, deleteForEveryone: !!deleteForEveryone });
  } catch (err) {
    console.error("Delete message error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
