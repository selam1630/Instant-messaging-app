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
} from "react-native";
import { useChat, Message } from "../hooks/useChat";
import { useSocket } from "../context/SocketContext";
import { launchCamera, launchImageLibrary, MediaType } from "react-native-image-picker";
import * as DocumentPicker from "@react-native-documents/picker";
import dayjs from "dayjs";
import RNFS from "react-native-fs";
import AudioRecord from "react-native-audio-record";
import ActionSheet from "react-native-actionsheet";
import { Image } from "react-native";
import EmojiSelector, { Categories } from "react-native-emoji-selector";

const BACKEND_URL = "http://localhost:4000";

export type FileMessageContent = {
  type: "image" | "video" | "audio" | "file";
  url: string;
  name?: string;
};
type MessageContent = string | FileMessageContent;

interface GroupChatScreenProps {
  route: {
    params: {
      conversationId: string;
      userId: string;
      groupName: string;
      participantIds: string[];
    };
  };
}

export default function GroupChatScreen({ route }: GroupChatScreenProps) {
  const { conversationId, userId, groupName, participantIds } = route.params;
  const { messages, sendMessage, setMessages, reactToMessage } = useChat(conversationId, userId);
  const { onlineUsers } = useSocket();

  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [forwardedFrom, setForwardedFrom] = useState<string | null>(null);
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const actionSheetRef = useRef<ActionSheet>(null);
  const messageActionSheetRef = useRef<ActionSheet>(null);
  const [messageActionOptions, setMessageActionOptions] = useState<string[]>([]);
  const [messageActionCancelIndex, setMessageActionCancelIndex] = useState<number>(0);

  const getMessageTypeFromMime = (mime: string): FileMessageContent["type"] => {
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";
    return "file";
  };

  useEffect(() => {
    if (messages.length > 0) flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    AudioRecord.init({
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6,
      wavFile: "voiceMessage.wav",
    });
  }, []);

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage("", text.trim(), { replyToId: selectedMessage?.id || null, forwardedFrom: forwardedFrom || null });
    setText("");
    setSelectedMessage(null);
    setForwardedFrom(null);
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
        Alert.alert("Upload Failed", "Could not upload file to server.");
        return;
      }

      const data = await uploadRes.json();
      sendMessage("", { type: getMessageTypeFromMime(data.mimeType), url: data.fileUrl, name: data.originalName });
    } catch (err: any) {
      console.error("File upload error:", err);
      Alert.alert("Error", "An error occurred during file upload.");
    }
  };

  const handleCamera = async (media: "photo" | "video") => {
    const options = { mediaType: media, quality: 0.8, saveToPhotos: true, videoQuality: "high", durationLimit: 60 };
    const response = await launchCamera(options as any);
    if (response.didCancel) return;
    if (response.assets?.[0]) {
      const asset = response.assets[0];
      if (asset.uri && asset.fileName && asset.type) {
        await uploadFileToServer(asset.uri, asset.fileName, asset.type);
      }
    }
  };

  const handleMediaSelection = async (type: "camera" | "library") => {
    const options = { mediaType: "mixed" as MediaType, quality: 0.8, includeBase64: false, saveToPhotos: type === "camera" };
    const response = type === "camera" ? await launchCamera(options as any) : await launchImageLibrary(options as any);
    if (response.assets?.[0]) {
      const asset = response.assets[0];
      if (asset.uri && asset.fileName && asset.type) {
        await uploadFileToServer(asset.uri, asset.fileName, asset.type);
      }
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
    const isSentByMe = item.senderId === userId;
    setSelectedMessage(item);

    const options: string[] = [];
    options.push("React ❤️");
    options.push("Reply");
    options.push("Forward");
    options.push("Delete for me");
    if (isSentByMe) options.push("Delete for everyone");
    options.push("Cancel");

    setMessageActionOptions(options);
    setMessageActionCancelIndex(options.length - 1);
    setTimeout(() => messageActionSheetRef.current?.show(), 50);
  };

  const startRecording = async () => {
    const hasPermission = await requestAudioPermission();
    if (!hasPermission) return Alert.alert('Permissions needed', 'Microphone permission is required to record audio');
    AudioRecord.start();
    setIsRecording(true);
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    const audioFile = await AudioRecord.stop();
    setIsRecording(false);
    if (audioFile) {
      setAudioPath(audioFile);
      sendAudioFile(audioFile);
    }
  };

  const requestAudioPermission = async () => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]);
      return granted['android.permission.RECORD_AUDIO'] === 'granted';
    }
    return true;
  };

  const sendAudioFile = async (filePath: string) => {
    try {
      const fileName = filePath.split("/").pop();
      const formData = new FormData();
      const uri = Platform.OS === "android" ? (filePath.startsWith("file://") ? filePath : "file://" + filePath) : filePath;
      formData.append("file", { uri, type: "audio/mpeg", name: fileName } as any);

      const uploadRes = await fetch(`${BACKEND_URL}/api/files/upload`, { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const txt = await uploadRes.text().catch(() => "");
        console.error("Upload failed:", txt);
        Alert.alert("Upload Failed", "Could not upload audio file.");
        return;
      }

      const data = await uploadRes.json();
      sendMessage("", { type: "audio", url: data.fileUrl, name: data.originalName });
    } catch (err) {
      console.error("Audio send error:", err);
      Alert.alert("Error", "Failed to send audio message. Check your network or file permissions.");
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
        {!isSentByMe && typeof content !== "string" && <Text style={styles.senderName}>{(item as any).sender?.name || "Unknown"}</Text>}
        {typeof content === "string" ? (
          <Text style={[styles.messageText, isSentByMe ? styles.sentText : styles.receivedText]}>{content}</Text>
        ) : (
          <>
            {content.type === "image" && <TouchableOpacity onPress={() => Linking.openURL(content.url)}><Image source={{ uri: content.url }} style={{ width: 220, height: 220, borderRadius: 12 }} /></TouchableOpacity>}
            {content.type === "video" && <TouchableOpacity onPress={() => Linking.openURL(content.url)}><Text style={styles.fileText}>🎥 {content.name}</Text></TouchableOpacity>}
            {content.type === "audio" && <TouchableOpacity onPress={() => Linking.openURL(content.url)}><Text style={styles.fileText}>🎧 {content.name}</Text></TouchableOpacity>}
            {content.type === "file" && <TouchableOpacity onPress={() => Linking.openURL(content.url)}><Text style={styles.fileText}>📎 {content.name}</Text></TouchableOpacity>}
          </>
        )}
        {item.reactions && item.reactions.length > 0 && (
          <View style={styles.reactionsRow}>{item.reactions.map((r, index) => (<Text key={index} style={styles.reactionEmoji}>{r.emoji}</Text>))}</View>
        )}
        <View style={styles.metaRow}>
          {item.timestamp && <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>}
          {isSentByMe && <Text style={styles.readReceipt}>{item.status === "read" ? "✔✔" : item.status === "delivered" ? "✔" : ""}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.receiverName}>{groupName}</Text>
          <Text style={styles.receiverStatus}>{participantIds.length} members</Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id ?? `msg-${index}`}
          renderItem={renderMessage}
          contentContainerStyle={{ flexGrow: 1, justifyContent: messages.length === 0 ? "center" : "flex-end", paddingVertical: 10 }}
          ListEmptyComponent={<Text style={styles.noMessages}>No messages yet. Start chatting!</Text>}
        />

        <View style={styles.inputWrapper}>
          {selectedMessage && (
            <View style={styles.replyPreview}>
              <Text style={styles.replyLabel}>Replying to:</Text>
              <Text numberOfLines={1} style={styles.replyText}>{typeof selectedMessage.content === 'string' ? selectedMessage.content : (selectedMessage.content as any).name || 'Attachment'}</Text>
              <TouchableOpacity onPress={() => setSelectedMessage(null)}><Text style={styles.replyCancel}>✖</Text></TouchableOpacity>
            </View>
          )}
          <TouchableOpacity onPress={handleAttachmentPress}><Text style={styles.attachButton}>📎</Text></TouchableOpacity>
          <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Type a message..." placeholderTextColor="rgba(255,255,255,0.6)" />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}><Text style={styles.sendButtonText}>Send</Text></TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity style={[styles.micButton, isRecording && styles.micButtonRecording]} onPress={() => (isRecording ? stopRecording() : startRecording())}>
              <Text style={styles.micIcon}>{isRecording ? "⏹️" : "🎤"}</Text>
            </TouchableOpacity>
            {audioPath && !isRecording && (
              <TouchableOpacity style={styles.retryButton} onPress={() => setAudioPath(null)}><Text style={styles.retryIcon}>↻</Text></TouchableOpacity>
            )}
          </View>
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

        <ActionSheet
          ref={messageActionSheetRef}
          options={messageActionOptions}
          cancelButtonIndex={messageActionCancelIndex}
          onPress={(index) => {
            const option = messageActionOptions[index];
            if (!option || !selectedMessage) return;
            if (option === "React ❤️") {
              setShowEmojiPicker(true);
            } else if (option === "Reply") {
              // keep selectedMessage
            } else if (option === "Forward") {
              setForwardedFrom(selectedMessage.id!);
              setText(typeof selectedMessage.content === 'string' ? selectedMessage.content : (selectedMessage.content as any).name || '');
            } else if (option === "Delete for me") {
              deleteMessage(selectedMessage.id!, false);
            } else if (option === "Delete for everyone") {
              deleteMessage(selectedMessage.id!, true);
            }
          }}
        />

        {showEmojiPicker && selectedMessage && (
          <View style={styles.emojiPicker}>
            <EmojiSelector category={Categories.all} onEmojiSelected={(emoji) => { reactToMessage(selectedMessage.id!, emoji); setShowEmojiPicker(false); setSelectedMessage(null); }} showSearchBar={false} showTabs showHistory />
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
  senderName: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 2 },
  messageContainer: { padding: 12, marginVertical: 4, borderRadius: 16, maxWidth: "80%" },
  sent: { backgroundColor: "#d6bbff", alignSelf: "flex-end", borderTopLeftRadius: 16, borderTopRightRadius: 0, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  received: { backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "flex-start", borderTopLeftRadius: 0, borderTopRightRadius: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  reactionsRow: { flexDirection: "row", marginTop: 4, flexWrap: "wrap" },
  reactionEmoji: { fontSize: 20, lineHeight: 24, marginRight: 6 },
  micButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginLeft: 8 },
  micButtonRecording: { backgroundColor: "#ff4b5c" },
  micIcon: { fontSize: 24, color: "#7b2cbf" },
  retryButton: { marginLeft: 8, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  retryIcon: { fontSize: 18, color: "#7b2cbf" },
  emojiPicker: { position: "absolute", bottom: 70, left: 0, right: 0, height: 300, backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: "hidden" },
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
  replyPreview: { backgroundColor: 'rgba(255,255,255,0.08)', padding: 8, borderRadius: 10, marginHorizontal: 8, marginBottom: 6, flexDirection: 'row', alignItems: 'center' },
  replyLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginRight: 8 },
  replyText: { color: '#fff', flex: 1 },
  replyCancel: { color: 'rgba(255,255,255,0.6)', marginLeft: 8 },
});
