"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../config/db");
const conversationController_1 = require("../controllers/conversationController");
const router = express_1.default.Router();
router.get("/list/:userId", conversationController_1.getUserConversations);
router.get("/get-or-create", conversationController_1.getOrCreateConversation);
router.post("/group", conversationController_1.createGroupConversation);
router.get("/messages/:conversationId", async (req, res) => {
    const { conversationId } = req.params;
    if (!conversationId) {
        return res.status(400).json({ message: "conversationId is required" });
    }
    try {
        const messages = await db_1.prisma.message.findMany({
            where: { conversationId },
            orderBy: { timestamp: "asc" },
        });
        res.json(messages);
    }
    catch (err) {
        console.error("Failed to fetch messages:", err);
        res.status(500).json({ message: "Failed to fetch messages" });
    }
});
router.post("/messages", async (req, res) => {
    const { conversationId, senderId, receiverId, content, mediaUrls, replyToId, forwardedFrom, } = req.body;
    if (!conversationId || !senderId || !content) {
        return res.status(400).json({
            message: "conversationId, senderId, and content are required",
        });
    }
    try {
        const message = await db_1.prisma.message.create({
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
        });
        res.status(201).json(message);
    }
    catch (err) {
        console.error("Failed to save message:", err);
        res.status(500).json({ message: "Failed to save message" });
    }
});
exports.default = router;
