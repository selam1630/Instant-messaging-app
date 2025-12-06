import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { useChat, Message } from "../hooks/useChat";
import { useSocket } from "../context/SocketContext";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import DocumentPicker from "react-native-document-picker";
import axios from "axios";

dayjs.extend(relativeTime);

interface ChatScreenProps {
  route: {
    params: {
      conversationId: string;
      userId: string;
      receiverId: string;
      receiverName: string;
    };
  };
}

// -------------------------
// Extend Message interface
// -------------------------
export interface ChatMessage extends Message {
  mediaUrls?: string[];
}

export default function ChatScreen({ route }: ChatScreenProps) {
  const { conversationId, userId, receiverId, receiverName } = route.params;
  const { messages, sendMessage } = useChat(conversationId, userId);
  const { onlineUsers } = useSocket();

  const [text, setText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // -----------------------
  // Send text message
  // -----------------------
  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(receiverId, text.trim(), []);
    setText("");
  };

  // -----------------------
  // Pick and send file
  // -----------------------
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles],
      });

      const formData = new FormData();
      formData.append("file", {
        uri: result.uri,
        name: result.name,
        type: result.type || "application/octet-stream",
      } as any);

      // Upload to backend (type-safe)
      const response = await axios.post<{ fileUrl: string }>(
        "http://localhost:4000/api/files/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const { fileUrl } = response.data;

      // ✅ Now works with 3 arguments
      sendMessage(receiverId, `Sent a file: ${result.name}`, [fileUrl]);
    } catch (err: any) {
      if (DocumentPicker.isCancel(err)) {
        console.log("File picker cancelled");
      } else {
        console.error("File upload error:", err);
      }
    }
  };

  // -----------------------
  // Render messages
  // -----------------------
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isSentByMe = item.senderId === userId;

    return (
      <View
        style={[
          styles.messageContainer,
          isSentByMe ? styles.sent : styles.received,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isSentByMe ? styles.sentText : styles.receivedText,
          ]}
        >
          {item.content}
        </Text>

        {item.mediaUrls?.map((url: string) => (
          <TouchableOpacity
            key={url}
            onPress={() => Linking.openURL(url)}
            style={{ marginTop: 4 }}
          >
            <Text
              style={{
                color: "#fff",
                textDecorationLine: "underline",
              }}
            >
              {url.split("/").pop()}
            </Text>
          </TouchableOpacity>
        ))}

        <View style={styles.metaRow}>
          {item.timestamp && (
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          )}
          {isSentByMe && (
            <Text
              style={[
                styles.statusText,
                item.status === "read" && { color: "#4f8ef7" },
              ]}
            >
              {item.status === "read"
                ? "✓✓"
                : item.status === "delivered"
                ? "✓✓"
                : "✓"}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const receiverStatus = onlineUsers.find((u) => u.id === receiverId);
  const statusText =
    receiverStatus?.onlineStatus === "online"
      ? "Online"
      : receiverStatus?.lastSeen
      ? `Last seen at ${dayjs(receiverStatus.lastSeen).format(
          "MMM D, YYYY h:mm A"
        )}`
      : "Offline";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.receiverName}>{receiverName}</Text>
          <Text style={styles.receiverStatus}>{statusText}</Text>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={renderMessage}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: messages.length === 0 ? "center" : "flex-end",
            paddingVertical: 10,
          }}
          ListEmptyComponent={
            <Text style={styles.noMessages}>No messages yet. Start chatting!</Text>
          }
        />
        <View style={styles.inputWrapper}>
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handlePickFile}
          >
            <Text style={styles.sendButtonText}>📎</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor="rgba(255,255,255,0.6)"
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// -----------------------
// Styles
// -----------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#7b2cbf" },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.2)",
    backgroundColor: "#7b2cbf",
  },
  receiverName: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  receiverStatus: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  messageContainer: { padding: 12, marginVertical: 4, borderRadius: 16, maxWidth: "80%" },
  sent: { backgroundColor: "#d6bbff", alignSelf: "flex-end", borderRadius: 16 },
  received: { backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "flex-start", borderRadius: 16 },
  messageText: { fontSize: 16 },
  sentText: { color: "#4b0082" },
  receivedText: { color: "#fff" },
  metaRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4, gap: 6 },
  timestamp: { fontSize: 10, color: "rgba(255,255,255,0.6)" },
  statusText: { fontSize: 12, color: "rgba(255,255,255,0.6)" },
  inputWrapper: { flexDirection: "row", padding: 10, backgroundColor: "#7b2cbf", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)", alignItems: "center" },
  input: { flex: 1, backgroundColor: "rgba(255,255,255,0.2)", color: "#fff", borderRadius: 20, paddingHorizontal: 16, paddingVertical: Platform.OS === "ios" ? 12 : 8, fontSize: 16, marginRight: 8 },
  sendButton: { backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 4 },
  sendButtonText: { color: "#7b2cbf", fontWeight: "bold" },
  noMessages: { textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 16 },
});
