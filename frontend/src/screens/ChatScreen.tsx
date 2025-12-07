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
import DocumentPicker from "react-native-document-picker";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const BACKEND_URL = "http://localhost:4000";

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

export default function ChatScreen({ route }: ChatScreenProps) {
  const { conversationId, userId, receiverId, receiverName } = route.params;
  const { messages, sendMessage } = useChat(conversationId, userId);
  const { onlineUsers } = useSocket();

  const [text, setText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // -------------------------------
  // SEND TEXT MESSAGE
  // -------------------------------
  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(receiverId, text.trim());
    setText("");
  };

  // -------------------------------
  // PICK + UPLOAD FILE
  // -------------------------------
  const pickAndSendFile = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: DocumentPicker.types.allFiles,
      });

      const file = {
        uri: res.uri,
        type: res.type,
        name: res.name,
      };

      const formData = new FormData();
      formData.append("file", file as any);

      const uploadRes = await fetch(`${BACKEND_URL}/api/files/upload`, {
        method: "POST",
        body: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = await uploadRes.json();

      // Send the file URL as a chat message
      sendMessage(receiverId, data.fileUrl);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error("File upload error:", err);
      }
    }
  };

  // -------------------------------
  // RENDER MESSAGE BUBBLE
  // -------------------------------
  const renderMessage = ({ item }: { item: Message }) => {
    const isSentByMe = item.senderId === userId;
    const isFile = item.content.startsWith("/uploads/");

    return (
      <View
        style={[
          styles.messageContainer,
          isSentByMe ? styles.sent : styles.received,
        ]}
      >
        {/* FILE MESSAGE */}
        {isFile ? (
          <TouchableOpacity
            onPress={() => Linking.openURL(BACKEND_URL + item.content)}
          >
            <Text
              style={[
                styles.fileText,
                isSentByMe ? { color: "#4b0082" } : { color: "#fff" },
              ]}
            >
              📎 {item.content.split("/").pop()}
            </Text>
          </TouchableOpacity>
        ) : (
          // TEXT MESSAGE
          <Text
            style={[
              styles.messageText,
              isSentByMe ? styles.sentText : styles.receivedText,
            ]}
          >
            {item.content}
          </Text>
        )}

        {/* Timestamp + Status */}
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

  // -------------------------------
  // USER ONLINE STATUS
  // -------------------------------
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

        {/* MESSAGES LIST */}
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
            <Text style={styles.noMessages}>
              No messages yet. Start chatting!
            </Text>
          }
        />

        {/* INPUT + FILE BUTTON */}
        <View style={styles.inputWrapper}>
          <TouchableOpacity onPress={pickAndSendFile}>
            <Text style={styles.attachButton}>📎</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#7b2cbf",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.2)",
    backgroundColor: "#7b2cbf",
  },
  receiverName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  receiverStatus: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },

  // messages
  messageContainer: {
    padding: 12,
    marginVertical: 4,
    borderRadius: 16,
    maxWidth: "80%",
  },
  sent: {
    backgroundColor: "#d6bbff",
    alignSelf: "flex-end",
  },
  received: {
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 16,
  },
  sentText: { color: "#4b0082" },
  receivedText: { color: "#fff" },

  fileText: {
    fontSize: 16,
    textDecorationLine: "underline",
  },

  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 6,
  },
  timestamp: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
  },
  statusText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },

  // input
  inputWrapper: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#7b2cbf",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
  },
  attachButton: {
    fontSize: 28,
    color: "#fff",
    marginRight: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    color: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    fontSize: 16,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButtonText: {
    color: "#7b2cbf",
    fontWeight: "bold",
  },
  noMessages: {
    textAlign: "center",
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
  },
});
