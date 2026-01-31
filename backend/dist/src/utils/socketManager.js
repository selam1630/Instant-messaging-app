"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToUser = exports.getOnlineUsers = exports.setOnlineUsers = exports.getIO = exports.setIO = void 0;
let io = null;
const setIO = (server) => { io = server; };
exports.setIO = setIO;
const getIO = () => io;
exports.getIO = getIO;
let onlineUsers = new Map();
const setOnlineUsers = (map) => { onlineUsers = map; };
exports.setOnlineUsers = setOnlineUsers;
const getOnlineUsers = () => onlineUsers;
exports.getOnlineUsers = getOnlineUsers;
const emitToUser = (userId, event, data) => {
    if (!userId || !io)
        return;
    const socketId = onlineUsers.get(userId);
    if (socketId)
        io.to(socketId).emit(event, data);
};
exports.emitToUser = emitToUser;
