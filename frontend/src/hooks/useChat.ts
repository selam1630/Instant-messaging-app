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
}

export function useChat(conversationId: string, userId: string) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);

  const BACKEND_URL = "http://localhost:4000";

  // -------------------------------
  // Fetch messages from backend
  // -------------------------------
  useEffect(() => {
    if (!conversationId) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/conversation/messages/${conversationId}`
        );
        if (!res.ok) throw new Error("Failed to fetch messages");

        const data: Message[] = await res.json();

        data.sort(
          (a, b) =>
            new Date(a.timestamp!).getTime() -
            new Date(b.timestamp!).getTime()
        );

        setMessages(data);

        // Mark unread messages as read
        const unread = data
          .filter(
            (m) => m.receiverId === userId && m.status !== "read"
          )
          .map((m) => m.id!);

        if (unread.length > 0) {
          socket?.emit("mark_as_read", {
            messageIds: unread,
            readerId: userId,
            senderId: data[0]?.senderId,
          });
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };

    fetchMessages();
  }, [conversationId, userId, socket]);

  // -------------------------------
  // Listen for incoming messages
  // -------------------------------
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msg: Message) => {
      if (msg.conversationId !== conversationId) return;

      // Avoid adding your own sent message twice
      if (msg.senderId === userId) return;

      setMessages((prev) => [...prev, msg]);

      // Automatically mark as read if the message is for me
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

  // -------------------------------
  // Listen for messages read updates
  // -------------------------------
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

  // -------------------------------
  // Send message
  // -------------------------------
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

  return { messages, sendMessage };
}
