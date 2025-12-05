import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import io, { Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:4000";

interface OnlineUser {
  id: string;
  onlineStatus: "online" | "offline";
  lastSeen: string | null;
}

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: OnlineUser[];
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  onlineUsers: [],
});

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🔌 Connected to WebSocket:", socket.id);
    });

    // Handle real-time online users
    socket.on("online_users", (onlineUserIds: string[]) => {
      setOnlineUsers((prevUsers) => {
        const prevMap = new Map(prevUsers.map(u => [u.id, u]));

        // Mark online users
        const updatedUsers: OnlineUser[] = onlineUserIds.map(id => ({
          id,
          onlineStatus: "online",
          lastSeen: null, // Online users have no lastSeen
        }));

        // Preserve offline users and their lastSeen
        prevUsers.forEach(u => {
          if (!onlineUserIds.includes(u.id)) {
            updatedUsers.push({
              ...u,
              onlineStatus: "offline",
              lastSeen: u.lastSeen, // keep previous lastSeen
            });
          }
        });

        return updatedUsers;
      });
    });

    // Handle socket disconnect
    socket.on("disconnect", () => {
      console.log("❌ WebSocket disconnected");
      setOnlineUsers(prev =>
        prev.map(u =>
          u.onlineStatus === "online"
            ? { ...u, onlineStatus: "offline", lastSeen: new Date().toISOString() }
            : u
        )
      );
    });

    // Optional: Fetch lastSeen for offline users once at start
    const fetchOfflineLastSeen = async () => {
      try {
        const res = await fetch(`${SOCKET_URL}/api/user/offline-status`);
        if (!res.ok) throw new Error("Failed to fetch offline user statuses");
        const data: { id: string; lastSeen: string | null }[] = await res.json();

        setOnlineUsers((prev) =>
          prev.map(u => {
            const offlineInfo = data.find(d => d.id === u.id);
            return offlineInfo ? { ...u, lastSeen: offlineInfo.lastSeen } : u;
          })
        );
      } catch (err) {
        console.error("Error fetching offline lastSeen:", err);
      }
    };

    fetchOfflineLastSeen();

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
