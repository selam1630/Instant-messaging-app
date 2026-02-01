import { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

export type FileMessageContent = {
  type: "image" | "video" | "audio" | "file";
  url: string;
  name?: string;
};

export type MessageContent = string | FileMessageContent;

export interface Message {
  id?: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: MessageContent;
  status?: "sent" | "delivered" | "read";
  timestamp?: string;
  deletedForAll?: boolean;
  deletedFor?: string[];

  reactions?: {
    emoji: string;
    userId: string;
    createdAt?: string;
  }[];
  sender?: {
    id: string;
    name: string;
    profileImage?: string | null;
  };

  replyToId?: string | null;
  forwardedFrom?: string | null;
}


export function useChat(conversationId: string, userId: string) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);

  const BACKEND_URL = "http://localhost:4000";

  /* ============================
     FETCH MESSAGES
  ============================ */

  useEffect(() => {
    if (!conversationId || !userId) return;

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
  }, [conversationId, userId]);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msg: Message) => {
      if (msg.senderId === userId) return;
      if (msg.conversationId !== conversationId) return;
      if (msg.deletedForAll) return;
      if (msg.deletedFor?.includes(userId)) return;

      setMessages((prev) => {
        const exists = prev.find((m) => m.id === msg.id);
        if (exists) {
          return prev.map((m) =>
            m.id === msg.id ? { ...m, ...msg } : m
          );
        }
        return [...prev, msg];
      });

      if (msg.receiverId === userId && msg.id) {
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

    const handleMessagesRead = ({
      messageIds,
    }: {
      messageIds: string[];
    }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id && messageIds.includes(msg.id)
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

  /* ============================
     DELETE MESSAGE
  ============================ */

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

  /* ============================
     MESSAGE REACTIONS (SOCKET)
  ============================ */

  useEffect(() => {
    if (!socket) return;

    const handleMessageReacted = ({
      messageId,
      reactions,
    }: {
      messageId: string;
      reactions: Message["reactions"];
    }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, reactions }
            : msg
        )
      );
    };

    socket.on("message_reacted", handleMessageReacted);

    return () => {
      socket.off("message_reacted", handleMessageReacted);
    };
  }, [socket]);

  /* ============================
     SEND MESSAGE
  ============================ */

  const sendMessage = async (
    receiverId: string,
    content: MessageContent,
    options?: { replyToId?: string | null; forwardedFrom?: string | null }
  ) => {
    const tempId = uuidv4();

    const tempMessage: Message = {
      id: tempId,
      conversationId,
      senderId: userId,
      receiverId,
      content,
      status: "sent",
      timestamp: new Date().toISOString(),
      replyToId: options?.replyToId || null,
      forwardedFrom: options?.forwardedFrom || null,
    };

    setMessages((prev) => [...prev, tempMessage]);
    socket?.emit("send_message", tempMessage);

    try {
      const res = await fetch(`${BACKEND_URL}/api/conversation/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...tempMessage,
          replyToId: tempMessage.replyToId,
          forwardedFrom: tempMessage.forwardedFrom,
        }),
      });

      if (!res.ok) throw new Error("Failed to save message");

      const savedMessage: Message = await res.json();

      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? savedMessage : m))
      );
    } catch (err) {
      console.error("Error saving message:", err);
    }
  };

  /* ============================
     FORWARD MESSAGE
  ============================ */

  const forwardMessage = async (
    targetId: string,
    isGroup: boolean,
    originalMessage: Message
  ) => {
    try {
      if (isGroup) {
        // For groups: targetId is conversationId
        const newMessage: Message = {
          conversationId: targetId,
          senderId: userId,
          receiverId: "", // Empty for groups
          content: originalMessage.content,
          status: "sent",
          timestamp: new Date().toISOString(),
          forwardedFrom: originalMessage.id || null,
        };

        socket?.emit("send_message", newMessage);

        await fetch(`${BACKEND_URL}/api/conversation/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...newMessage,
            isGroup: true,
          }),
        });
      } else {
        const res = await fetch(
          `${BACKEND_URL}/api/conversation/get-or-create?user1=${userId}&user2=${targetId}`
        );
        
        if (!res.ok) throw new Error("Failed to get conversation");
        
        const data = await res.json();
        const targetConversationId = data.conversationId;

        const newMessage: Message = {
          conversationId: targetConversationId,
          senderId: userId,
          receiverId: targetId,
          content: originalMessage.content,
          status: "sent",
          timestamp: new Date().toISOString(),
          forwardedFrom: originalMessage.id || null,
        };

        socket?.emit("send_message", newMessage);

        await fetch(`${BACKEND_URL}/api/conversation/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newMessage),
        });
      }
    } catch (err) {
      console.error("Forward message error:", err);
      throw err;
    }
  };

  /* ============================
     REACT TO MESSAGE
  ============================ */

  const reactToMessage = (messageId: string, emoji: string) => {
    if (!socket) return;

    socket.emit("react_message", {
      messageId,
      emoji,
      userId,
    });
  };

  return {
    messages,
    sendMessage,
    setMessages,
    reactToMessage, 
    forwardMessage,
  };
}