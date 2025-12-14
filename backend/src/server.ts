import express from "express";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import { prisma } from "./config/db";

import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userroutes";
import conversationRoutes from "./routes/conversationRoutes";
import fileRoutes from "./routes/fileRoutes";
import path from "path";
import otpRoutes from "./routes/otpRoutes";
import messageRoutes from "./routes/messageRoutes";
import contactRoutes from "./routes/contactRoutes";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

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

const io = new SocketIOServer(server, {
  cors: { origin: "*" },
});

/* -------------------------------------------
   ONLINE USERS MAP
--------------------------------------------*/
const onlineUsers: Map<string, string> = new Map();

const emitMessageToUser = (userId: string, event: string, data: any) => {
  const socketId = onlineUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
  }
};

/* -------------------------------------------
   EMIT TO BOTH USERS (HELPER)
--------------------------------------------*/
const emitToMessageUsers = async (
  messageId: string,
  event: string,
  data: any
) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) return;

  emitMessageToUser(message.senderId, event, data);
  emitMessageToUser(message.receiverId, event, data);
};

/* -------------------------------------------
   SOCKET CONNECTION
--------------------------------------------*/
io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  /* -------------------------------------------
     USER ONLINE
  --------------------------------------------*/
  socket.on("user_online", async (userId: string) => {
    const existingSocket = onlineUsers.get(userId);
    if (existingSocket && existingSocket !== socket.id) {
      onlineUsers.delete(userId);
    }

    onlineUsers.set(userId, socket.id);
    console.log(`🟢 User online: ${userId}`);

    await prisma.user.update({
      where: { id: userId },
      data: { onlineStatus: "online" },
    });

    io.emit("online_users", Array.from(onlineUsers.keys()));
  });

  /* -------------------------------------------
     SEND MESSAGE (SOCKET = REALTIME ONLY)
  --------------------------------------------*/
  socket.on("send_message", (data) => {
    try {
      const { receiverId } = data;
      emitMessageToUser(receiverId, "receive_message", data);
    } catch (err) {
      console.error("Socket send_message error:", err);
    }
  });

  /* -------------------------------------------
     MARK AS READ
  --------------------------------------------*/
  socket.on("mark_as_read", async ({ messageIds, readerId, senderId }) => {
    try {
      await prisma.message.updateMany({
        where: { id: { in: messageIds } },
        data: { status: "read" },
      });

      emitMessageToUser(senderId, "messages_read", {
        messageIds,
        readerId,
      });
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  });

  /* -------------------------------------------
     REACT TO MESSAGE (EMOJI)
  --------------------------------------------*/
  socket.on(
    "react_message",
    async ({ messageId, emoji, userId }) => {
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
          : [
              ...reactions,
              { emoji, userId, createdAt: new Date() },
            ];

        await prisma.message.update({
          where: { id: messageId },
          data: { reactions: updatedReactions },
        });

        await emitToMessageUsers(messageId, "message_reacted", {
          messageId,
          reactions: updatedReactions,
        });
      } catch (err) {
        console.error("❌ react_message error:", err);
      }
    }
  );

  /* -------------------------------------------
     DISCONNECT
  --------------------------------------------*/
  socket.on("disconnect", async () => {
    console.log("🔴 User disconnected:", socket.id);

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

/* -------------------------------------------
   SERVER START
--------------------------------------------*/
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Successfully connected to the database");
  } catch (error) {
    console.error("❌ Failed to connect to the database:", error);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 4000;

async function startServer() {
  await testDatabaseConnection();
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer();
