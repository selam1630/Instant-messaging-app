"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGroupConversation = exports.getUserConversations = exports.getOrCreateConversation = void 0;
const db_1 = require("../config/db");
const socketManager_1 = require("../utils/socketManager");
const getOrCreateConversation = async (req, res) => {
    try {
        const { user1, user2 } = req.query;
        if (!user1 || !user2) {
            return res.status(400).json({ message: "Both user1 and user2 are required." });
        }
        const userA = String(user1);
        const userB = String(user2);
        const existingConversation = await db_1.prisma.conversation.findFirst({
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
        const newConversation = await db_1.prisma.conversation.create({
            data: {
                type: "private",
                participantIds: [userA, userB],
            },
        });
        return res.json({
            conversationId: newConversation.id,
            message: "New conversation created",
        });
    }
    catch (error) {
        console.error("Conversation creation error:", error);
        return res.status(500).json({ message: "Server error creating conversation" });
    }
};
exports.getOrCreateConversation = getOrCreateConversation;
const getUserConversations = async (req, res) => {
    try {
        const userId = String(req.params.userId);
        const conversations = await db_1.prisma.conversation.findMany({
            where: { participantIds: { has: userId } },
            include: { messages: { orderBy: { timestamp: "desc" }, take: 1 } },
        });
        const contacts = await db_1.prisma.contact.findMany({
            where: { userId },
            include: { contact: true },
        });
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
        const remainingConvs = convUsers
            .filter((u) => {
            if (u.isGroup)
                return true;
            return !contacts.find((c) => c.contact.id === u.participantId);
        })
            .map((u) => {
            if (u.isGroup) {
                return {
                    isGroup: true,
                    conversationId: u.conversationId,
                    groupName: u.groupName,
                    participantIds: u.participantIds,
                    lastMessage: u.lastMessage,
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
        const finalList = [...merged, ...remainingConvs];
        res.json({ conversations: finalList });
    }
    catch (err) {
        console.error("Fetch conversations failed:", err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getUserConversations = getUserConversations;
const createGroupConversation = async (req, res) => {
    try {
        const { name, participants, adminId, groupImage } = req.body;
        if (!name || participants.length < 2) {
            return res.status(400).json({ message: "Group needs name & members" });
        }
        const conversation = await db_1.prisma.conversation.create({
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
            (0, socketManager_1.emitToUser)(pid, "group_created", payload);
        });
        res.json(conversation);
    }
    catch (err) {
        res.status(500).json({ message: "Failed to create group" });
    }
};
exports.createGroupConversation = createGroupConversation;
