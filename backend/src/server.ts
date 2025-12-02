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

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/conversation", conversationRoutes);
app.use("/api/files", fileRoutes);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/api/otp", otpRoutes);



app.get("/", (req, res) => {
  res.send("Instant Messaging API is running");
});

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: { origin: "*" },
});
const onlineUsers: Map<string, string> = new Map();
const emitMessageToUser = (userId: string, event: string, data: any) => {
  const socketId = onlineUsers.get(userId);
  if (socketId) io.to(socketId).emit(event, data);
};

io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);
  socket.on("user_online", async (userId: string) => {
    onlineUsers.set(userId, socket.id);
    console.log(`🟢 User online: ${userId}`);

    await prisma.user.update({
      where: { id: userId },
      data: { onlineStatus: "online" },
    });

    io.emit("online_users", Array.from(onlineUsers.keys()));
  });
  socket.on("send_message", async (data) => {
    try {
      const { conversationId, senderId, receiverId, content } = data;

      const newMessage = await prisma.message.create({
        data: {
          conversationId,
          senderId,
          receiverId,
          content,
          mediaUrls: [],
          status: "sent",
        },
      });
      socket.emit("receive_message", newMessage);
      emitMessageToUser(receiverId, "receive_message", newMessage);
      if (onlineUsers.has(receiverId)) {
        await prisma.message.update({
          where: { id: newMessage.id },
          data: { status: "delivered" },
        });
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  });
  socket.on("mark_as_read", async ({ messageIds, readerId, senderId }) => {
    try {
      console.log("📘 Marking messages as READ:", messageIds);

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
