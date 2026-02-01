import { Request, Response } from "express";
import { prisma } from "../config/db";
import { emitToUser } from "../utils/socketManager";

export const getOrCreateConversation = async (req: Request, res: Response) => {
  try {
    const { user1, user2 } = req.query;

    if (!user1 || !user2) {
      return res.status(400).json({ message: "Both user1 and user2 are required." });
    }

    const userA = String(user1);
    const userB = String(user2);
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

    const conversations = await prisma.conversation.findMany({
      where: { participantIds: { has: userId } },
      include: {
        messages: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
    });

    const contacts = await prisma.contact.findMany({
      where: { userId },
      include: { contact: true },
    });

    // 🔹 collect all other participant ids
    const otherUserIds = conversations
      .filter(c => c.type === "private")
      .map(c => c.participantIds.find(id => id !== userId))
      .filter(Boolean) as string[];

    // 🔹 fetch users once
    const users = await prisma.user.findMany({
      where: { id: { in: otherUserIds } },
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true,
      },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    const convUsers = conversations.map((conv) => {
      if (conv.type === "group") {
        return {
          isGroup: true,
          conversationId: conv.id,
          groupName: conv.name || "Group",
          participantIds: conv.participantIds,
          lastMessage: conv.messages[0]?.content || null,
        };
      }

      const otherUserId = conv.participantIds.find(id => id !== userId);
      const user = otherUserId ? userMap.get(otherUserId) : null;

      return {
        isGroup: false,
        participantId: otherUserId,
        participantName: user?.name || "Unknown",
        participantProfileImage: user?.profileImage || null,
        participantEmail: user?.email || null,
        lastMessage: conv.messages[0]?.content || null,
        conversationId: conv.id,
      };
    });

    const merged = contacts.map((c) => {
      const existingConv = convUsers.find(
        u => !u.isGroup && u.participantId === c.contact.id
      );

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

    const remainingConvs = convUsers.filter(
      u =>
        u.isGroup ||
        !contacts.find(c => c.contact.id === u.participantId)
    );

    res.json({ conversations: [...merged, ...remainingConvs] });
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
