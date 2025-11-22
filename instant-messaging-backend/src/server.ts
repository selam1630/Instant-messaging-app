import express from "express";
import http from "http";
import dotenv from "dotenv";
import { Server as SocketIOServer } from "socket.io";
import { prisma } from "./config/db";

dotenv.config();

const app = express();
app.use(express.json());

// Example basic route
app.get("/", (req, res) => {
  res.send("Instant Messaging API is running");
});

// Create HTTP + WebSocket server
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: "*" }
});

// Handle socket connections
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Test database connection
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Successfully connected to the database");
  } catch (error) {
    console.error("❌ Failed to connect to the database:", error);
    process.exit(1); // exit if DB connection fails
  }
}

const PORT = process.env.PORT || 4000;

async function startServer() {
  await testDatabaseConnection();

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
