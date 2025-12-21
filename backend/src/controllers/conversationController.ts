import { Request, Response } from "express";
import { prisma } from "../config/db";
import { emitToUser } from "../utils/socketManager";

/**
 * Create or get an existing private conversation between two users
 */
export const getOrCreateConversation = async (req: Request, res: Response) => {
  try {
    const { user1, user2 } = req.query;

    if (!user1 || !user2) {
      return res.status(400).json({ message: "Both user1 and user2 are required." });
    }

    const userA = String(user1);
    const userB = String(user2);

    // Check if conversation already exists
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        type: "private",
        participantIds: { hasEvery: [userA, userB] },
      },
    });

    if (existingConversation) {
      return res.json({
        conversationId: existingConversation.id,
        message: "Existing conversation found",
      });
    }

    // Create new conversation
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
    return res.status(500).json({ message: "Server error creating conversation" });
  }
};


export const getUserConversations = async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);

    // 1. Fetch conversations where the user participates
    const conversations = await prisma.conversation.findMany({
      where: { participantIds: { has: userId } },
      include: { messages: { orderBy: { timestamp: "desc" }, take: 1 } },
    });
    const contacts = await prisma.contact.findMany({
      where: { userId },
      include: { contact: true },
    });
    const convUsers = conversations.map((conv) => {
      if (conv.type === "group") {
        return {
          isGroup: true,
          conversationId: conv.id,
          groupName: (conv as any).name || "Group",
          participantIds: conv.participantIds,
          lastMessage: conv.messages[0]?.content || null,
        };
      }

      const otherUserId = conv.participantIds.find((id) => id !== userId);
      return {
        isGroup: false,
        participantId: otherUserId,
        participantName: otherUserId ? null : "Unknown",
        participantProfileImage: null,
        participantEmail: null,
        lastMessage: conv.messages[0]?.content || null,
        conversationId: conv.id,
      };
    });
    const merged = contacts.map((c) => {
      const existingConv = convUsers.find((u) => !u.isGroup && u.participantId === c.contact.id);
      return {
        participantId: c.contact.id,
        participantName: c.contact.name,
        participantProfileImage: c.contact.profileImage,
        participantEmail: c.contact.email,
        lastMessage: existingConv?.lastMessage || null,
        conversationId: existingConv?.conversationId || null,
        isGroup: false,
      };
    });

    // 5. Include conversations with participants not in contacts
    const remainingConvs = convUsers
      .filter((u) => {
        if (u.isGroup) return true;
        return !contacts.find((c) => c.contact.id === u.participantId);
      })
      .map((u) => {
        if ((u as any).isGroup) {
          return {
            isGroup: true,
            conversationId: (u as any).conversationId,
            groupName: (u as any).groupName,
            participantIds: (u as any).participantIds,
            lastMessage: (u as any).lastMessage,
          };
        }
        return {
          participantId: u.participantId,
          participantName: "Unknown",
          participantProfileImage: null,
          participantEmail: null,
          lastMessage: u.lastMessage,
          conversationId: u.conversationId,
          isGroup: false,
        };
      });

    // 6. Combine both
    const finalList = [...merged, ...remainingConvs];

    res.json({ conversations: finalList });
  } catch (err) {
    console.error("Fetch conversations failed:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const createGroupConversation = async (req: Request, res: Response) => {
  try {
    const { name, participants, adminId, groupImage } = req.body;

    if (!name || participants.length < 2) {
      return res.status(400).json({ message: "Group needs name & members" });
    }

    const conversation = await prisma.conversation.create({
      data: {
        type: "group",
        name,
        participantIds: [...new Set([...participants, adminId])],
        adminIds: [adminId],
        groupImage,
      },
    });

    // notify participants via socket that a new group was created
    const payload = {
      conversationId: conversation.id,
      name: conversation.name,
      participantIds: conversation.participantIds,
      type: "group",
    };
    (conversation.participantIds || []).forEach((pid) => {
      emitToUser(pid, "group_created", payload);
    });

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ message: "Failed to create group" });
  }
};
