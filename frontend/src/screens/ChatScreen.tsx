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
  Alert,
  PermissionsAndroid,
  Pressable,
} from "react-native";
import {
  launchCamera,
  launchImageLibrary,
  MediaType,
} from "react-native-image-picker";
import { useChat, Message } from "../hooks/useChat";
import { useSocket } from "../context/SocketContext";
import * as DocumentPicker from "@react-native-documents/picker";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import RNFS from "react-native-fs";
import AudioRecorderPlayer from "react-native-audio-recorder-player";
import ActionSheet from "react-native-actionsheet";
import { Image } from "react-native";
import EmojiSelector, { Categories } from 'react-native-emoji-selector';
dayjs.extend(relativeTime);

const BACKEND_URL = "http://localhost:4000";

export type FileMessageContent = {
  type: "image" | "video" | "audio" | "file";
  url: string;
  name?: string;
};

type MessageContent = string | FileMessageContent;

const getMessageTypeFromMime = (mime: string): FileMessageContent["type"] => {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
};

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
  const { messages, sendMessage, setMessages, reactToMessage } =
  useChat(conversationId, userId);
  const { onlineUsers } = useSocket();

  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioFile, setAudioFile] = useState<string | null>(null);
  const [isRecorderStarted, setIsRecorderStarted] = useState(false);
  
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const audioRecorderPlayer = useRef(AudioRecorderPlayer).current;
  const actionSheetRef = useRef<ActionSheet>(null);

  useEffect(() => {
    if (messages.length > 0) flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(receiverId, text.trim());
    setText("");
  };

  const uploadFileToServer = async (fileUri: string, fileName: string, fileType: string) => {
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: Platform.OS === "android" ? fileUri : fileUri.replace("file://", ""),
        type: fileType,
        name: fileName,
      } as any);

      const uploadRes = await fetch(`${BACKEND_URL}/api/files/upload`, { method: "POST", body: formData });

      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        console.error("Server error response:", text);
        Alert.alert("Upload Failed", "Could not upload file to server.");
        return;
      }

      const data = await uploadRes.json();
      sendMessage(receiverId, {
        type: getMessageTypeFromMime(data.mimeType),
        url: data.fileUrl,
        name: data.originalName,
      });
    } catch (err: any) {
      console.error("File upload error:", err);
      Alert.alert("Error", "An error occurred during file upload.");
    }
  };

  const handleCamera = async (media: "photo" | "video") => {
    const options = { mediaType: media, quality: 0.8, saveToPhotos: true, videoQuality: "high", durationLimit: 60, includeBase64: false };

    try {
      const response = await launchCamera(options as any);
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert("Error", `Camera error: ${response.errorMessage}`);
        return;
      }
      const asset = response.assets?.[0];
      if (asset?.uri && asset.fileName && asset.type) {
        await uploadFileToServer(asset.uri, asset.fileName, asset.type);
      }
    } catch (error) {
      console.error("Error using camera:", error);
    }
  };

  const handleMediaSelection = async (type: "camera" | "library") => {
    const options = { mediaType: "mixed" as MediaType, quality: 0.8, includeBase64: false, saveToPhotos: type === "camera" };
    try {
      const response = type === "camera" ? await launchCamera(options as any) : await launchImageLibrary(options as any);
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert("Error", `Camera/Gallery error: ${response.errorMessage}`);
        return;
      }
      const asset = response.assets?.[0];
      if (asset?.uri && asset.fileName && asset.type) {
        await uploadFileToServer(asset.uri, asset.fileName, asset.type);
      }
    } catch (error) {
      console.error("Error picking media:", error);
    }
  };

  const pickAndSendFile = async () => {
    try {
      const res = await DocumentPicker.pick({ multiple: false, type: ["*/*"] });
      const file = res[0];
      if (file.uri && file.name && file.type) await uploadFileToServer(file.uri, file.name, file.type);
    } catch (err: any) {
      if (err?.code !== "DOCUMENT_PICKER_CANCELED") Alert.alert("Error", "Could not select document.");
    }
  };

  const handleAttachmentPress = () => actionSheetRef.current?.show();

  const deleteMessage = async (messageId: string, deleteForEveryone: boolean) => {
    try {
      if (!messageId) return;
      const res = await fetch(`${BACKEND_URL}/api/messages/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, userId, deleteForEveryone }),
      });
      const data = await res.json();
      if (data.success) setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err) {
      console.error("Delete message error:", err);
    }
  };
const handleLongPress = (item: Message) => {
  if (!item.id) return;
  const isSentByMe = item.senderId === userId;

  Alert.alert(
    "Message Options",
    "Choose an action",
    [
      {
        text: "React ❤️",
        onPress: () => {
          setSelectedMessage(item);
          setShowEmojiPicker(true);
        },
      },
      { text: "Delete for me", onPress: () => deleteMessage(item.id!, false) },
      isSentByMe && {
        text: "Delete for everyone",
        onPress: () => deleteMessage(item.id!, true),
        style: "destructive",
      },
      { text: "Cancel", style: "cancel" },
    ].filter(Boolean) as any
  );
};

  const requestAudioPermission = async () => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      ]);
      return granted["android.permission.RECORD_AUDIO"] === "granted" &&
             granted["android.permission.WRITE_EXTERNAL_STORAGE"] === "granted" &&
             granted["android.permission.READ_EXTERNAL_STORAGE"] === "granted";
    }
    return true;
  };

  const startRecording = async () => {
    if (recording) return;
    if (!(await requestAudioPermission())) return;

    const path = Platform.select({
      ios: `${RNFS.DocumentDirectoryPath}/audio-${Date.now()}.m4a`,
      android: `${RNFS.DocumentDirectoryPath}/audio-${Date.now()}.mp3`,
    })!;
    try {
      await audioRecorderPlayer.startRecorder(path);
      setRecording(true);
      setIsRecorderStarted(true);
    } catch (err) {
      setIsRecorderStarted(false);
      console.error("Recording error:", err);
    }
  };

  const stopRecording = async () => {
    if (!isRecorderStarted) return;
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      setRecording(false);
      setIsRecorderStarted(false);

      const filePath = typeof result === "string" ? result : (result as any)?.result ?? (result as any)?.path ?? "";
      setAudioFile(filePath);
      if (filePath) await sendAudioFile(filePath);
    } catch (err) {
      console.error("Stop recording error:", err);
    }
  };

  const sendAudioFile = async (filePath: string) => {
    try {
      const fileName = filePath.split("/").pop();
      const formData = new FormData();
      formData.append("file", {
        uri: Platform.OS === "android" ? "file://" + filePath : filePath,
        type: "audio/mpeg",
        name: fileName,
      } as any);

      const uploadRes = await fetch(`${BACKEND_URL}/api/files/upload`, { method: "POST", body: formData });
      if (!uploadRes.ok) return;

      const data = await uploadRes.json();
      sendMessage(receiverId, { type: "audio", url: data.fileUrl, name: data.originalName });
    } catch (err) {
      console.error("Audio send error:", err);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isSentByMe = item.senderId === userId;
    const content = item.content as MessageContent;

    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.8}
        style={[styles.messageContainer, isSentByMe ? styles.sent : styles.received]}
      >
        {typeof content === "string" ? (
          <Text style={[styles.messageText, isSentByMe ? styles.sentText : styles.receivedText]}>{content}</Text>
        ) : (
          <>
            {content.type === "image" && (
              <TouchableOpacity onPress={() => Linking.openURL(content.url)}>
                <Image source={{ uri: content.url }} style={{ width: 220, height: 220, borderRadius: 12 }} />
              </TouchableOpacity>
            )}
            {content.type === "video" && (
              <TouchableOpacity onPress={() => Linking.openURL(content.url)}>
                <Text style={styles.fileText}>🎥 {content.name}</Text>
              </TouchableOpacity>
            )}
            {content.type === "audio" && (
              <TouchableOpacity onPress={() => Linking.openURL(content.url)}>
                <Text style={styles.fileText}>🎧 {content.name}</Text>
              </TouchableOpacity>
            )}
            {content.type === "file" && (
              <TouchableOpacity onPress={() => Linking.openURL(content.url)}>
                <Text style={styles.fileText}>📎 {content.name}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
 {item.reactions && item.reactions.length > 0 && (
  <View style={styles.reactionsRow}>
    {item.reactions.map((r, index) => (
      <Text
        key={index}
        style={styles.reactionEmoji} // Use the style from StyleSheet
      >
        {r.emoji}
      </Text>
    ))}
  </View>
)}
       <View style={styles.metaRow}>
  {item.timestamp && (
    <Text style={styles.timestamp}>
      {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </Text>
  )}
  {isSentByMe && (
    <Text style={styles.readReceipt}>
      {item.status === "read" ? "✔✔" : item.status === "delivered" ? "✔" : ""}
    </Text>
  )}
</View>

      </TouchableOpacity>
    );
  };

  const receiverStatus = onlineUsers.find((u) => u.id === receiverId);
  const statusText =
    receiverStatus?.onlineStatus === "online"
      ? "Online"
      : receiverStatus?.lastSeen
      ? `Last seen at ${dayjs(receiverStatus.lastSeen).format("MMM D, YYYY h:mm A")}`
      : "Offline";
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.receiverName}>{receiverName}</Text>
          <Text style={styles.receiverStatus}>{statusText}</Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id ?? `msg-${index}`}
          renderItem={renderMessage}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: messages.length === 0 ? "center" : "flex-end",
            paddingVertical: 10,
          }}
          ListEmptyComponent={<Text style={styles.noMessages}>No messages yet. Start chatting!</Text>}
        />

        <View style={styles.inputWrapper}>
          <TouchableOpacity onPress={handleAttachmentPress}>
            <Text style={styles.attachButton}>📎</Text>
          </TouchableOpacity>

          <Pressable onPressIn={startRecording} onPressOut={stopRecording} style={{ marginRight: 10 }}>
            <Text style={styles.attachButton}>{recording ? "🎙️..." : "🎤"}</Text>
          </Pressable>

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

        <ActionSheet
          ref={actionSheetRef}
          title={"Send Attachment"}
          options={["Take Photo", "Record Video", "Photo/Video Library", "Document/File", "Cancel"]}
          cancelButtonIndex={4}
          tintColor="#7b2cbf"
          onPress={(index) => {
            if (index === 0) handleCamera("photo");
            if (index === 1) handleCamera("video");
            if (index === 2) handleMediaSelection("library");
            if (index === 3) pickAndSendFile();
          }}
        />
        {showEmojiPicker && selectedMessage && (
  <View style={styles.emojiPicker}>
    <EmojiSelector
      category={Categories.all}
      onEmojiSelected={(emoji) => {
        reactToMessage(selectedMessage.id!, emoji);
        setShowEmojiPicker(false);
        setSelectedMessage(null);
      }}
      showSearchBar={false}
      showTabs
      showHistory
    />
  </View>
)}

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#7b2cbf" },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.2)", backgroundColor: "#7b2cbf" },
  receiverName: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  receiverStatus: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  messageContainer: { padding: 12, marginVertical: 4, borderRadius: 16, maxWidth: "80%" },
  sent: {
  backgroundColor: "#d6bbff",
  alignSelf: "flex-end",
  borderTopLeftRadius: 16,
  borderTopRightRadius: 0,    // flat on top-right
  borderBottomLeftRadius: 16,
  borderBottomRightRadius: 16,
},

received: {
  backgroundColor: "rgba(255,255,255,0.2)",
  alignSelf: "flex-start",
  borderTopLeftRadius: 0,     // flat on top-left
  borderTopRightRadius: 16,
  borderBottomLeftRadius: 16,
  borderBottomRightRadius: 16,
},
 reactionsRow: {
    flexDirection: "row",
    marginTop: 4,
    flexWrap: 'wrap', // Add this for better layout
  },
  
  reactionEmoji: {
    fontSize: 20,
    lineHeight: 24,
    marginRight: 6,
    // Explicitly set letterSpacing to 0
    letterSpacing: 0,
    // Add includeFontPadding to prevent layout issues
    includeFontPadding: false,
  },


emojiPicker: {
  position: "absolute",
  bottom: 70,
  left: 0,
  right: 0,
  height: 300,
  backgroundColor: "#fff",
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  overflow: "hidden",
},

   messageText: { fontSize: 16 },
  sentText: { color: "#4b0082" },
  receivedText: { color: "#fff" },
  fileText: { fontSize: 16, textDecorationLine: "underline" },
  metaRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 },
timestamp: { fontSize: 10, color: "rgba(255,255,255,0.6)", marginRight: 6 },
readReceipt: { fontSize: 10, color: "rgba(255,255,255,0.6)" },
 inputWrapper: { flexDirection: "row", padding: 10, backgroundColor: "#7b2cbf", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)", alignItems: "center" },
  attachButton: { fontSize: 28, color: "#fff", marginRight: 10 },
  input: { flex: 1, backgroundColor: "rgba(255,255,255,0.2)", color: "#fff", borderRadius: 20, paddingHorizontal: 16, paddingVertical: Platform.OS === "ios" ? 12 : 8, fontSize: 16, marginRight: 8 },
  sendButton: { backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendButtonText: { color: "#7b2cbf", fontWeight: "bold" },
  noMessages: { textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 16 },
});
