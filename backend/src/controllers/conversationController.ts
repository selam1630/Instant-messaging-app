import { Request, Response } from "express";
import { prisma } from "../config/db";
export const getOrCreateConversation = async (req: Request, res: Response) => {
  try {
    const { user1, user2 } = req.query;

    if (!user1 || !user2) {
      return res.status(400).json({
        message: "Both user1 and user2 are required.",
      });
    }

    const userA = String(user1);
    const userB = String(user2);
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        type: "private",
        participantIds: {
          hasEvery: [userA, userB], 
        },
      },
    });

    if (existingConversation) {
      return res.json({
        conversationId: existingConversation.id,
        message: "Existing conversation found",
      });
    }
    const newConversation = await prisma.conversation.create({
      data: {
        type: "private",
        participantIds: [userA, userB],
      },
    });

    return res.json({
      conversationId: newConversation.id,
      message: "New conversation created",
    });

  } catch (error) {
    console.error("Conversation creation error:", error);
    return res.status(500).json({
      message: "Server error creating conversation",
    });
  }
};

export const getUserConversations = async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);

    const conversations = await prisma.conversation.findMany({
      where: {
        participantIds: { has: userId }
      },
      include: {
        messages: {
          orderBy: { timestamp: "desc" },
          take: 1
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    return res.json({ conversations });
  } catch (error) {
    console.error("Fetch conversations failed", error);
    return res.status(500).json({ message: "Server error" });
  }
};
