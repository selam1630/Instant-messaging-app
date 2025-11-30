import express from "express";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import { prisma } from "./config/db";

import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userroutes";
import conversationRoutes from "./routes/conversationRoutes";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/conversation", conversationRoutes);

app.get("/", (req, res) => {
  res.send("Instant Messaging API is running");
});

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: { origin: "*" },
});

// Map<userId, socketId>
const onlineUsers: Map<string, string> = new Map();

// Helper to emit message to specific online user
const emitMessageToUser = (userId: string, event: string, data: any) => {
  const socketId = onlineUsers.get(userId);
  if (socketId) io.to(socketId).emit(event, data);
};

io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  // User Online Event
  socket.on("user_online", async (userId: string) => {
    onlineUsers.set(userId, socket.id);
    console.log(`🟢 User online: ${userId}`);

    // IMPORTANT FIX: Do NOT update lastSeen here
    await prisma.user.update({
      where: { id: userId },
      data: { onlineStatus: "online" },
    });

    // Send fresh online users list
    io.emit("online_users", Array.from(onlineUsers.keys()));
  });

  // Send Message Event
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

      // Send back to sender
      socket.emit("receive_message", newMessage);

      // Send to receiver (if online)
      emitMessageToUser(receiverId, "receive_message", newMessage);

      // Mark as delivered if receiver is online
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

  // User Disconnect Event
  socket.on("disconnect", async () => {
    console.log("🔴 User disconnected:", socket.id);

    const userId = [...onlineUsers.entries()].find(
      ([_, sid]) => sid === socket.id
    )?.[0];

    if (userId) {
      onlineUsers.delete(userId);

      // Correct: We ONLY update lastSeen when user disconnects
      await prisma.user.update({
        where: { id: userId },
        data: {
          onlineStatus: "offline",
          lastSeen: new Date(), // correct place
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
