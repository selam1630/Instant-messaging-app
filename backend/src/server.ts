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

// Mount routers
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/conversation", conversationRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Instant Messaging API is running");
});

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.IO
const io = new SocketIOServer(server, { cors: { origin: "*" } });

// Track online users
const onlineUsers: Map<string, string> = new Map();

// Helper to emit a message to a specific user
const emitMessageToUser = (userId: string, event: string, data: any) => {
  const socketId = onlineUsers.get(userId);
  if (socketId) io.to(socketId).emit(event, data);
};

io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  // User comes online
  socket.on("user_online", async (userId: string) => {
    onlineUsers.set(userId, socket.id);
    console.log(`🟢 User online: ${userId}`);

    await prisma.user.update({
      where: { id: userId },
      data: { onlineStatus: "online", lastSeen: new Date() },
    });

    io.emit("online_users", Array.from(onlineUsers.keys()));
  });

  // Sending a message
  socket.on("send_message", async (data) => {
    try {
      const { conversationId, senderId, receiverId, content } = data;

      // Save message to DB
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

      // Emit message to sender only once
      socket.emit("receive_message", newMessage);

      // Emit message to receiver if online
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

  // User disconnects
  socket.on("disconnect", async () => {
    console.log("🔴 User disconnected:", socket.id);

    const userId = [...onlineUsers.entries()].find(
      ([_, sid]) => sid === socket.id
    )?.[0];

    if (userId) {
      onlineUsers.delete(userId);

      await prisma.user.update({
        where: { id: userId },
        data: { onlineStatus: "offline", lastSeen: new Date() },
      });

      io.emit("online_users", Array.from(onlineUsers.keys()));
    }
  });
});

// Test database connection
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
