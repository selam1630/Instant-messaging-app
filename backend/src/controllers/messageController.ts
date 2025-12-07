import { prisma } from "../config/db";
import { Request, Response } from "express";

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { messageId, userId, deleteForEveryone } = req.body;

    if (!messageId || !userId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) return res.status(404).json({ error: "Message not found" });

    if (deleteForEveryone) {
      await prisma.message.update({
        where: { id: messageId },
        data: { deletedForAll: true },
      });
    } else {
      await prisma.message.update({
        where: { id: messageId },
        data: { deletedFor: { push: userId } },
      });
    }

    res.json({ success: true, messageId, deleteForEveryone });
  } catch (err) {
    console.error("Delete message error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
