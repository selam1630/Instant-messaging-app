"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMessage = void 0;
const db_1 = require("../config/db");
const socketManager_1 = require("../utils/socketManager");
const deleteMessage = async (req, res) => {
    try {
        const { messageId, userId, deleteForEveryone } = req.body;
        if (!messageId || !userId) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const message = await db_1.prisma.message.findUnique({
            where: { id: messageId },
        });
        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }
        if (deleteForEveryone) {
            await db_1.prisma.message.update({
                where: { id: messageId },
                data: { deletedForAll: true },
            });
            const io = (0, socketManager_1.getIO)();
            io?.emit("message_deleted", messageId);
        }
        else {
            await db_1.prisma.message.update({
                where: { id: messageId },
                data: { deletedFor: { push: userId } },
            });
            const io = (0, socketManager_1.getIO)();
            io?.emit("message_deleted", messageId);
        }
        res.json({ success: true, messageId, deleteForEveryone: !!deleteForEveryone });
    }
    catch (err) {
        console.error("Delete message error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.deleteMessage = deleteMessage;
