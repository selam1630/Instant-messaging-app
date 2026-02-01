import express from "express";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import { setIO, setOnlineUsers } from "./utils/socketManager";
import { prisma } from "./config/db";

import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userroutes";
import conversationRoutes from "./routes/conversationRoutes";
import fileRoutes from "./routes/fileRoutes";
import otpRoutes from "./routes/otpRoutes";
import messageRoutes from "./routes/messageRoutes";
import contactRoutes from "./routes/contactRoutes";

import path from "path";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

/* ---------------- ROUTES ---------------- */
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/conversation", conversationRoutes);
app.use("/api/files", fileRoutes);
app.use("/uploads", express.static(path.join(__dirname, "config/uploads")));
app.use("/api/otp", otpRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/contacts", contactRoutes);

app.get("/", (_, res) => {
  res.send("Instant Messaging API is running");
});

const server = http.createServer(app);
const onlineUsers: Map<string, string> = new Map();

const io = new SocketIOServer(server, {
  cors: { origin: "*" },
});
setIO(io);
setOnlineUsers(onlineUsers);

const emitMessageToUser = (userId?: string | null, event?: string, data?: any) => {
  if (!userId) return;
  const socketId = onlineUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit(event!, data);
  }
};

/* ---------------- SOCKET EVENTS ---------------- */
io.on("connection", (socket) => {
  console.log("⚡ Connected:", socket.id);

  /* -------- USER ONLINE -------- */
  socket.on("user_online", async (userId: string) => {
    onlineUsers.set(userId, socket.id);

    await prisma.user.update({
      where: { id: userId },
      data: { onlineStatus: "online" },
    });

    io.emit("online_users", Array.from(onlineUsers.keys()));
  });

  /* -------- JOIN CONVERSATION (PRIVATE OR GROUP) -------- */
  socket.on("join_conversation", (conversationId: string) => {
    socket.join(conversationId);
    console.log(`👥 Joined conversation: ${conversationId}`);
  });
socket.on("send_message", async (data) => {
  try {
    const { conversationId, senderId, receiverId, content, forwardedFrom, replyToId } = data;

    if (!conversationId || !senderId || !content) return;

    // Save message in DB first
    const newMessage = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        receiverId: receiverId || null,
        content,
        forwardedFrom: forwardedFrom || null,
        replyToId: replyToId || null,
        status: "sent",
      },
    });

    // Fetch the message with sender info
    const fullMessage = await prisma.message.findUnique({
      where: { id: newMessage.id },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
      },
    });

    if (!fullMessage) return;

    // Emit
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) return;

    if (conversation.type === "private") {
      emitMessageToUser(receiverId, "receive_message", fullMessage);
      emitMessageToUser(senderId, "receive_message", fullMessage);
    } else {
      io.to(conversationId).emit("receive_message", fullMessage);
    }
  } catch (err) {
    console.error("send_message error:", err);
  }
});

  socket.on("mark_as_read", async ({ messageIds, readerId }) => {
    try {
      await prisma.message.updateMany({
        where: { id: { in: messageIds } },
        data: { status: "read" },
      });

      socket.broadcast.emit("messages_read", {
        messageIds,
        readerId,
      });
    } catch (err) {
      console.error("mark_as_read error:", err);
    }
  });

  /* -------- REACT TO MESSAGE -------- */
  socket.on("react_message", async ({ messageId, emoji, userId }) => {
    try {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
      });

      if (!message) return;

      const reactions = (message.reactions as any[]) || [];

      const exists = reactions.find(
        (r) => r.emoji === emoji && r.userId === userId
      );

      const updatedReactions = exists
        ? reactions.filter(
            (r) => !(r.emoji === emoji && r.userId === userId)
          )
        : [...reactions, { emoji, userId, createdAt: new Date() }];

      await prisma.message.update({
        where: { id: messageId },
        data: { reactions: updatedReactions },
      });

      io.emit("message_reacted", {
        messageId,
        reactions: updatedReactions,
      });
    } catch (err) {
      console.error("react_message error:", err);
    }
  });

  /* -------- DISCONNECT -------- */
  socket.on("disconnect", async () => {
    const userId = [...onlineUsers.entries()].find(
      ([_, sid]) => sid === socket.id
    )?.[0];

    if (userId) {
      onlineUsers.delete(userId);

      await prisma.user.update({
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
    await prisma.$connect();
    console.log("✅ Database connected");

    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Server failed:", err);
    process.exit(1);
  }
}

startServer();