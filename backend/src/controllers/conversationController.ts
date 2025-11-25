import { Request, Response } from "express";
import { prisma } from "../config/db";

/**
 * Get or create a 1-on-1 private conversation between two users.
 */
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

    // Step 1: Look for existing conversation
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        type: "private",
        participantIds: {
          hasEvery: [userA, userB], // Both users must be participants
        },
      },
    });

    if (existingConversation) {
      return res.json({
        conversationId: existingConversation.id,
        message: "Existing conversation found",
      });
    }

    // Step 2: Create new conversation
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
