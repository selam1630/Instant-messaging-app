import { Server } from "socket.io";

let io: Server | null = null;
export const setIO = (server: Server) => { io = server };
export const getIO = () => io;

let onlineUsers: Map<string, string> = new Map();
export const setOnlineUsers = (map: Map<string, string>) => { onlineUsers = map };
export const getOnlineUsers = () => onlineUsers;

export const emitToUser = (userId?: string, event?: string, data?: any) => {
  if (!userId || !io) return;
  const socketId = onlineUsers.get(userId);
  if (socketId) io.to(socketId).emit(event!, data);
};
