import { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

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

  /* -------------------------------------------
     FETCH MESSAGES
  --------------------------------------------*/
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
              !m.deletedForAll &&
              (!m.deletedFor || !m.deletedFor.includes(userId))
          )
          .sort(
            (a, b) =>
              new Date(a.timestamp!).getTime() -
              new Date(b.timestamp!).getTime()
          );

        setMessages(filtered);

        const unreadIds = filtered
          .filter((m) => m.receiverId === userId && m.status !== "read")
          .map((m) => m.id!)
          .filter(Boolean);

        if (unreadIds.length > 0) {
          socket?.emit("mark_as_read", {
            messageIds: unreadIds,
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

  /* -------------------------------------------
     RECEIVE MESSAGE (SOCKET)
  --------------------------------------------*/
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msg: Message) => {
      // ❌ IGNORE YOUR OWN MESSAGES
      if (msg.senderId === userId) return;

      if (msg.conversationId !== conversationId) return;
      if (msg.deletedForAll) return;
      if (msg.deletedFor?.includes(userId)) return;

      setMessages((prev) => {
        // 🛑 ABSOLUTE DUPLICATE GUARD
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

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

  /* -------------------------------------------
     READ RECEIPTS
  --------------------------------------------*/
  useEffect(() => {
    if (!socket) return;

    const handleMessagesRead = ({
      messageIds,
    }: {
      messageIds: string[];
    }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          messageIds.includes(msg.id!)
            ? { ...msg, status: "read" }
            : msg
        )
      );
    };

    socket.on("messages_read", handleMessagesRead);

    return () => {
      socket.off("messages_read", handleMessagesRead);
    };
  }, [socket]);

  /* -------------------------------------------
     MESSAGE DELETED
  --------------------------------------------*/
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

  /* -------------------------------------------
     SEND MESSAGE (OPTIMISTIC)
  --------------------------------------------*/
  const sendMessage = async (receiverId: string, content: string) => {
    const tempId = uuidv4();

    const tempMessage: Message = {
      id: tempId,
      conversationId,
      senderId: userId,
      receiverId,
      content,
      status: "sent",
      timestamp: new Date().toISOString(),
    };

    // ✅ OPTIMISTIC UI
    setMessages((prev) => [...prev, tempMessage]);

    // 🔥 SOCKET SEND (receiver only)
    socket?.emit("send_message", tempMessage);

    try {
      const res = await fetch(`${BACKEND_URL}/api/conversation/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tempMessage),
      });

      if (!res.ok) throw new Error("Failed to save message");

      const savedMessage: Message = await res.json();

      // 🔁 REPLACE TEMP MESSAGE WITH DB MESSAGE
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? savedMessage : m))
      );
    } catch (err) {
      console.error("Error saving message:", err);
    }
  };

  return { messages, sendMessage, setMessages };
}
