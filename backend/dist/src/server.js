"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = require("socket.io");
const socketManager_1 = require("./utils/socketManager");
const db_1 = require("./config/db");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userroutes_1 = __importDefault(require("./routes/userroutes"));
const conversationRoutes_1 = __importDefault(require("./routes/conversationRoutes"));
const fileRoutes_1 = __importDefault(require("./routes/fileRoutes"));
const otpRoutes_1 = __importDefault(require("./routes/otpRoutes"));
const messageRoutes_1 = __importDefault(require("./routes/messageRoutes"));
const contactRoutes_1 = __importDefault(require("./routes/contactRoutes"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
/* ---------------- ROUTES ---------------- */
app.use("/api/auth", authRoutes_1.default);
app.use("/api/user", userroutes_1.default);
app.use("/api/conversation", conversationRoutes_1.default);
app.use("/api/files", fileRoutes_1.default);
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "config/uploads")));
app.use("/api/otp", otpRoutes_1.default);
app.use("/api/messages", messageRoutes_1.default);
app.use("/api/contacts", contactRoutes_1.default);
app.get("/", (_, res) => {
    res.send("Instant Messaging API is running");
});
const server = http_1.default.createServer(app);
const onlineUsers = new Map();
const io = new socket_io_1.Server(server, {
    cors: { origin: "*" },
});
(0, socketManager_1.setIO)(io);
(0, socketManager_1.setOnlineUsers)(onlineUsers);
const emitMessageToUser = (userId, event, data) => {
    if (!userId)
        return;
    const socketId = onlineUsers.get(userId);
    if (socketId) {
        io.to(socketId).emit(event, data);
    }
};
/* ---------------- SOCKET EVENTS ---------------- */
io.on("connection", (socket) => {
    console.log("⚡ Connected:", socket.id);
    /* -------- USER ONLINE -------- */
    socket.on("user_online", async (userId) => {
        onlineUsers.set(userId, socket.id);
        await db_1.prisma.user.update({
            where: { id: userId },
            data: { onlineStatus: "online" },
        });
        io.emit("online_users", Array.from(onlineUsers.keys()));
    });
    /* -------- JOIN CONVERSATION (PRIVATE OR GROUP) -------- */
    socket.on("join_conversation", (conversationId) => {
        socket.join(conversationId);
        console.log(`👥 Joined conversation: ${conversationId}`);
    });
    /* -------- SEND MESSAGE (PRIVATE + GROUP) -------- */
    socket.on("send_message", async (data) => {
        try {
            const { conversationId, senderId, receiverId } = data;
            if (!conversationId || !senderId)
                return;
            const conversation = await db_1.prisma.conversation.findUnique({
                where: { id: conversationId },
            });
            if (!conversation)
                return;
            if (conversation.type === "private") {
                // private chat
                emitMessageToUser(receiverId, "receive_message", data);
                emitMessageToUser(senderId, "receive_message", data);
            }
            else {
                // group chat
                io.to(conversationId).emit("receive_message", data);
            }
        }
        catch (err) {
            console.error("send_message error:", err);
        }
    });
    /* -------- MARK AS READ -------- */
    socket.on("mark_as_read", async ({ messageIds, readerId }) => {
        try {
            await db_1.prisma.message.updateMany({
                where: { id: { in: messageIds } },
                data: { status: "read" },
            });
            socket.broadcast.emit("messages_read", {
                messageIds,
                readerId,
            });
        }
        catch (err) {
            console.error("mark_as_read error:", err);
        }
    });
    /* -------- REACT TO MESSAGE -------- */
    socket.on("react_message", async ({ messageId, emoji, userId }) => {
        try {
            const message = await db_1.prisma.message.findUnique({
                where: { id: messageId },
            });
            if (!message)
                return;
            const reactions = message.reactions || [];
            const exists = reactions.find((r) => r.emoji === emoji && r.userId === userId);
            const updatedReactions = exists
                ? reactions.filter((r) => !(r.emoji === emoji && r.userId === userId))
                : [...reactions, { emoji, userId, createdAt: new Date() }];
            await db_1.prisma.message.update({
                where: { id: messageId },
                data: { reactions: updatedReactions },
            });
            io.emit("message_reacted", {
                messageId,
                reactions: updatedReactions,
            });
        }
        catch (err) {
            console.error("react_message error:", err);
        }
    });
    /* -------- DISCONNECT -------- */
    socket.on("disconnect", async () => {
        const userId = [...onlineUsers.entries()].find(([_, sid]) => sid === socket.id)?.[0];
        if (userId) {
            onlineUsers.delete(userId);
            await db_1.prisma.user.update({
                where: { id: userId },
                data: {
                    onlineStatus: "offline",
                    lastSeen: new Date(),
                },
            });
            io.emit("online_users", Array.from(onlineUsers.keys()));
        }
    });
});
async function startServer() {
    try {
        await db_1.prisma.$connect();
        console.log("✅ Database connected");
        const PORT = process.env.PORT || 4000;
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    }
    catch (err) {
        console.error("❌ Server failed:", err);
        process.exit(1);
    }
}
startServer();
