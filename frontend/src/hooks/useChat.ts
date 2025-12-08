import { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";

export interface Message {
  id?: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  status?: "sent" | "delivered" | "read";
  timestamp?: string;
  deletedForAll?: boolean;
  deletedFor?: string[];
}

export function useChat(conversationId: string, userId: string) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);

  const BACKEND_URL = "http://localhost:4000";
  useEffect(() => {
    if (!conversationId) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/conversation/messages/${conversationId}`
        );
        if (!res.ok) throw new Error("Failed to fetch messages");

        const data: Message[] = await res.json();
        const filtered = data
          .filter(
            (m) =>
              !m.deletedForAll && (!m.deletedFor || !m.deletedFor.includes(userId))
          )
          .sort(
            (a, b) =>
              new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime()
          );

        setMessages(filtered);
        const unread = filtered
          .filter((m) => m.receiverId === userId && m.status !== "read")
          .map((m) => m.id!);

        if (unread.length > 0) {
          socket?.emit("mark_as_read", {
            messageIds: unread,
            readerId: userId,
            senderId: filtered[0]?.senderId,
          });
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };

    fetchMessages();
  }, [conversationId, userId, socket]);
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msg: Message) => {
      if (msg.conversationId !== conversationId) return;
      if (msg.deletedForAll || (msg.deletedFor?.includes(userId))) return;
      if (msg.senderId === userId) return;

      setMessages((prev) => [...prev, msg]);
      if (msg.receiverId === userId) {
        socket.emit("mark_as_read", {
          messageIds: [msg.id],
          readerId: userId,
          senderId: msg.senderId,
        });
      }
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [socket, conversationId, userId]);
  useEffect(() => {
    if (!socket) return;

    const handleMessagesRead = ({ messageIds }: { messageIds: string[] }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          messageIds.includes(msg.id!) ? { ...msg, status: "read" } : msg
        )
      );
    };

    socket.on("messages_read", handleMessagesRead);

    return () => {
      socket.off("messages_read", handleMessagesRead);
    };
  }, [socket]);
  useEffect(() => {
    if (!socket) return;

    const handleMessageDeleted = (messageId: string) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    };

    socket.on("message_deleted", handleMessageDeleted);

    return () => {
      socket.off("message_deleted", handleMessageDeleted);
    };
  }, [socket]);

  // Send message
  const sendMessage = async (receiverId: string, content: string) => {
    const msg: Message = {
      conversationId,
      senderId: userId,
      receiverId,
      content,
      status: "sent",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
    socket?.emit("send_message", msg);
    try {
      await fetch(`${BACKEND_URL}/api/conversation/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });
    } catch (err) {
      console.error("Error saving message:", err);
    }
  };

  return { messages, sendMessage, setMessages };
}
