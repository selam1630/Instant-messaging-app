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
  Asset,
} from "react-native-image-picker";
import { useChat, Message } from "../hooks/useChat";
import { useSocket } from "../context/SocketContext";
import * as DocumentPicker from "@react-native-documents/picker";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import RNFS from "react-native-fs";
import AudioRecorderPlayer from "react-native-audio-recorder-player"; // do not use `new` in latest versions
import ActionSheet from "react-native-actionsheet";

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
  const { messages, sendMessage, setMessages } = useChat(conversationId, userId);
  const { onlineUsers } = useSocket();

  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioFile, setAudioFile] = useState<string | null>(null);
  const [isRecorderStarted, setIsRecorderStarted] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const audioRecorderPlayer = useRef(AudioRecorderPlayer).current;
  const actionSheetRef = useRef<ActionSheet>(null);


  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(receiverId, text.trim());
    setText("");
  };
  const uploadFileToServer = async (
    fileUri: string,
    fileName: string,
    fileType: string
  ) => {
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: Platform.OS === "android" ? fileUri : fileUri.replace("file://", ""),
        type: fileType,
        name: fileName,
      } as any);

      const uploadRes = await fetch(`${BACKEND_URL}/api/files/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        console.error("Server error response:", text);
        Alert.alert("Upload Failed", "Could not upload file to server.");
        return;
      }

      const data = await uploadRes.json();
      sendMessage(receiverId, data.fileUrl);
    } catch (err: any) {
      console.error("File upload error:", err);
      Alert.alert("Error", "An error occurred during file upload.");
    }
  };
  const handleCamera = async (media: "photo" | "video") => {
  const options = {
    mediaType: media,
    quality: 0.8,
    saveToPhotos: true,
    videoQuality: "high",      
    durationLimit: 60,          
    includeBase64: false,
  };

  try {
    const response = await launchCamera(options as any);

    if (response.didCancel) {
      console.log("User cancelled camera");
    } else if (response.errorCode) {
      console.error("Camera Error: ", response.errorMessage);
      Alert.alert("Error", `Camera error: ${response.errorMessage}`);
    } else if (response.assets && response.assets.length > 0) {
      const asset = response.assets[0];
      if (asset.uri && asset.fileName && asset.type) {
        await uploadFileToServer(asset.uri, asset.fileName, asset.type);
      } else {
        Alert.alert("Error", "Captured media is missing required data.");
      }
    }
  } catch (error) {
    console.error("Error using camera:", error);
  }
};

  const handleMediaSelection = async (type: "camera" | "library") => {
    const options = {
      mediaType: "mixed" as MediaType, 
      quality: 0.8,
      includeBase64: false,
      saveToPhotos: type === "camera", 
    };

    try {
      let response;
      if (type === "camera") {
        response = await launchCamera(options as any);
      } else {
        response = await launchImageLibrary(options as any);
      }

      if (response.didCancel) {
        console.log("User cancelled media picker");
      } else if (response.errorCode) {
        console.error("Media Picker Error: ", response.errorMessage);
        Alert.alert("Error", `Camera/Gallery error: ${response.errorMessage}`);
      } else if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];

        if (asset.uri && asset.fileName && asset.type) {
          await uploadFileToServer(asset.uri, asset.fileName, asset.type);
        } else {
          Alert.alert("Error", "Selected media is missing required data.");
        }
      }
    } catch (error) {
      console.error("Error picking media:", error);
    }
  };
  const pickAndSendFile = async () => {
    try {
      const res = await DocumentPicker.pick({ multiple: false, type: ["*/*"] });
      const file = res[0];

      if (file.uri && file.name && file.type) {
        await uploadFileToServer(file.uri, file.name, file.type);
      }
    } catch (err: any) {
      if (err?.code === "DOCUMENT_PICKER_CANCELED") return;
      console.error("File upload error:", err);
      Alert.alert("Error", "Could not select document.");
    }
  };
  const handleAttachmentPress = () => {
  actionSheetRef.current?.show();
};

  const deleteMessage = async (
    messageId: string,
    deleteForEveryone: boolean
  ) => {
    try {
      if (!messageId) return;
      const res = await fetch(`${BACKEND_URL}/api/messages/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, userId, deleteForEveryone }),
      });
      const data = await res.json();
      if (data.success)
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      else console.error("Delete failed:", data.error);
    } catch (err) {
      console.error("Delete message error:", err);
    }
  };

  const handleLongPress = (item: Message) => {
    if (!item.id) return;
    const isSentByMe = item.senderId === userId;
    Alert.alert(
      "Delete Message",
      "Choose an option",
      [
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
      console.log("Permissions granted:", granted);
      return (
        granted["android.permission.RECORD_AUDIO"] === "granted" &&
        granted["android.permission.WRITE_EXTERNAL_STORAGE"] === "granted" &&
        granted["android.permission.READ_EXTERNAL_STORAGE"] === "granted"
      );
    }
    return true;
  };

  const startRecording = async () => {
    if (recording) return;
    const hasPermission = await requestAudioPermission();
    if (!hasPermission) return;

    const path = Platform.select({
      ios: `${RNFS.DocumentDirectoryPath}/audio-${Date.now()}.m4a`,
      android: `${RNFS.DocumentDirectoryPath}/audio-${Date.now()}.mp3`,
    })!;

    try {
      await audioRecorderPlayer.startRecorder(path);
      setRecording(true);
      setIsRecorderStarted(true);
      console.log("Recording started at:", path);
    } catch (err) {
      setIsRecorderStarted(false);
      console.error("Recording error:", err);
    }
  };

  const stopRecording = async () => {
    if (!isRecorderStarted) {
      console.warn("Recorder was not started, cannot stop.");
      return;
    }

    try {
      const result = await audioRecorderPlayer.stopRecorder();
      setRecording(false);
      setIsRecorderStarted(false);

      const filePath =
        typeof result === "string"
          ? result
          : (result as any)?.result ?? (result as any)?.path ?? "";

      setAudioFile(filePath);
      console.log("Recording stopped. File saved at:", filePath);

      if (filePath) {
        await sendAudioFile(filePath);
      } else {
        console.error("No valid file path returned from stopRecorder:", result);
      }
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

      const uploadRes = await fetch(`${BACKEND_URL}/api/files/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        console.error("Audio upload failed");
        return;
      }

      const data = await uploadRes.json();
      sendMessage(receiverId, data.fileUrl);
    } catch (err) {
      console.error("Audio send error:", err);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isSentByMe = item.senderId === userId;
    const isFile = item.content.includes("/uploads/");

    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.8}
        style={[
          styles.messageContainer,
          isSentByMe ? styles.sent : styles.received,
        ]}
      >
        {isFile ? (
          <TouchableOpacity onPress={() => Linking.openURL(item.content)}>
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
          <Text
            style={[
              styles.messageText,
              isSentByMe ? styles.sentText : styles.receivedText,
            ]}
          >
            {item.content}
          </Text>
        )}

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
      </TouchableOpacity>
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
          ListEmptyComponent={
            <Text style={styles.noMessages}>
              No messages yet. Start chatting!
            </Text>
          }
        />

        <View style={styles.inputWrapper}>
          <TouchableOpacity onPress={handleAttachmentPress}>
            <Text style={styles.attachButton}>📎</Text>
          </TouchableOpacity>

          <Pressable
            onPressIn={startRecording}
            onPressOut={stopRecording}
            style={{ marginRight: 10 }}
          >
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
  title={'Send Attachment'}
  options={[
    'Take Photo',
    'Record Video',
    'Photo/Video Library',
    'Document/File',
    'Cancel'
  ]}
  cancelButtonIndex={4}
  tintColor="#7b2cbf"
  onPress={(index) => {
    if (index === 0) handleCamera('photo');
    if (index === 1) handleCamera('video');
    if (index === 2) handleMediaSelection('library');
    if (index === 3) pickAndSendFile();
  }}
/>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#7b2cbf" },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.2)",
    backgroundColor: "#7b2cbf",
  },
  receiverName: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  receiverStatus: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  messageContainer: {
    padding: 12,
    marginVertical: 4,
    borderRadius: 16,
    maxWidth: "80%",
  },
  sent: { backgroundColor: "#d6bbff", alignSelf: "flex-end" },
  received: {
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "flex-start",
  },
  messageText: { fontSize: 16 },
  sentText: { color: "#4b0082" },
  receivedText: { color: "#fff" },
  fileText: { fontSize: 16, textDecorationLine: "underline" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 6,
  },
  timestamp: { fontSize: 10, color: "rgba(255,255,255,0.6)" },
  statusText: { fontSize: 12, color: "rgba(255,255,255,0.6)" },
  inputWrapper: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#7b2cbf",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
  },
  attachButton: { fontSize: 28, color: "#fff", marginRight: 10 },
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
  sendButtonText: { color: "#7b2cbf", fontWeight: "bold" },
  noMessages: {
    textAlign: "center",
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
  },
});