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
import { useNavigation } from "@react-navigation/native";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import RNFS from "react-native-fs";
import AudioRecord from 'react-native-audio-record';
import AudioRecorderPlayer from "react-native-audio-recorder-player";
import ActionSheet from "react-native-actionsheet";
import { Image } from "react-native";
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
  const { messages, sendMessage, setMessages, reactToMessage, forwardMessage } =
    useChat(conversationId, userId);
  const { onlineUsers } = useSocket();
  const navigation = useNavigation<any>();

  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const [replyMessage, setReplyMessage] = useState<Message | null>(null);
  const [reactionMessage, setReactionMessage] = useState<Message | null>(null);

  const [forwardedFrom, setForwardedFrom] = useState<string | null>(null);
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const actionSheetRef = useRef<ActionSheet>(null);
  const messageActionSheetRef = useRef<ActionSheet>(null);
  const [messageActionOptions, setMessageActionOptions] = useState<string[]>([]);
  const [messageActionCancelIndex, setMessageActionCancelIndex] = useState<number>(0);

  useEffect(() => {
    if (messages.length > 0) flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    AudioRecord.init({
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6,
      wavFile: 'voiceMessage.wav',
    });
  }, []);

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(receiverId, text.trim(), { 
      replyToId: replyMessage?.id || null, 
      forwardedFrom: forwardedFrom || null 
    });
    setText("");
    setReplyMessage(null);
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

      const uploadRes = await fetch(`${BACKEND_URL}/api/files/upload`, { 
        method: "POST", 
        body: formData 
      });

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
    const options = { 
      mediaType: media, 
      quality: 0.8, 
      saveToPhotos: true, 
      videoQuality: "high", 
      durationLimit: 60, 
      includeBase64: false 
    };

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
    const options = { 
      mediaType: "mixed" as MediaType, 
      quality: 0.8, 
      includeBase64: false, 
      saveToPhotos: type === "camera" 
    };
    try {
      const response = type === "camera" 
        ? await launchCamera(options as any) 
        : await launchImageLibrary(options as any);
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
      if (file.uri && file.name && file.type) {
        await uploadFileToServer(file.uri, file.name, file.type);
      }
    } catch (err: any) {
      if (err?.code !== "DOCUMENT_PICKER_CANCELED") {
        Alert.alert("Error", "Could not select document.");
      }
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

    setActionMessage(item);

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
    if (!hasPermission) {
      Alert.alert('Permissions needed', 'Microphone permission is required to record audio');
      return;
    }

    try {
      console.log('AudioRecord.start()');
      AudioRecord.start();
      setIsRecording(true);
    } catch (err) {
      console.error('AudioRecord start error:', err);
      Alert.alert('Error', 'Could not start recording');
    }
  };

  const stopRecording = async () => {
    if (!isRecording) {
      console.warn('Not recording');
      return;
    }

    try {
      const audioFile = await AudioRecord.stop();
      setIsRecording(false);
      console.log('Recording stopped, file:', audioFile);
      if (audioFile) {
        setAudioPath(audioFile);
        sendAudioFile(audioFile);
      }
    } catch (err) {
      console.error('AudioRecord stop error:', err);
      Alert.alert('Error', 'Could not stop recording');
      setIsRecording(false);
    }
  };

  const requestAudioPermission = async () => {
    if (Platform.OS === "android") {
      const sdk = Platform.Version as number;
      if (sdk >= 33) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO as any,
        ]);
        return (
          granted['android.permission.RECORD_AUDIO'] === 'granted' &&
          (granted['android.permission.READ_MEDIA_AUDIO'] === 'granted' || 
           granted['android.permission.READ_MEDIA_AUDIO'] === undefined)
        );
      }

      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      ]);
      return (
        granted['android.permission.RECORD_AUDIO'] === 'granted' &&
        granted['android.permission.WRITE_EXTERNAL_STORAGE'] === 'granted' &&
        granted['android.permission.READ_EXTERNAL_STORAGE'] === 'granted'
      );
    }
    return true;
  };

  const sendAudioFile = async (filePathOrResult: string | { result?: string; filePath?: string }) => {
    try {
      const filePath =
        typeof filePathOrResult === "string"
          ? filePathOrResult
          : filePathOrResult.result ?? filePathOrResult.filePath ?? "";

      if (!filePath) {
        console.error("No audio file path provided:", filePathOrResult);
        return;
      }

      const fileName = filePath.split("/").pop();
      const formData = new FormData();
      formData.append("file", {
        uri: Platform.OS === "android" ? (filePath.startsWith("file://") ? filePath : "file://" + filePath) : filePath,
        type: "audio/mpeg",
        name: fileName,
      } as any);

      const uploadRes = await fetch(`${BACKEND_URL}/api/files/upload`, { 
        method: "POST", 
        body: formData 
      });
      if (!uploadRes.ok) return;

      const data = await uploadRes.json();
      sendMessage(receiverId, { 
        type: "audio", 
        url: data.fileUrl, 
        name: data.originalName 
      });
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
          <Text style={[styles.messageText, isSentByMe ? styles.sentText : styles.receivedText]}>
            {content}
          </Text>
        ) : (
          <>
            {content.type === "image" && (
              <TouchableOpacity onPress={() => Linking.openURL(content.url)}>
                <Image 
                  source={{ uri: content.url }} 
                  style={{ width: 220, height: 220, borderRadius: 12 }} 
                />
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
              <Text key={index} style={styles.reactionEmoji}>
                {r.emoji}
              </Text>
            ))}
          </View>
        )}
        <View style={styles.metaRow}>
          {item.timestamp && (
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleTimeString([], { 
                hour: "2-digit", 
                minute: "2-digit" 
              })}
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
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
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <Text style={styles.noMessages}>No messages yet. Start chatting!</Text>
          }
        />

        {showEmojiPicker && reactionMessage && (
          <View style={styles.emojiPicker}>
            <View style={styles.simpleEmojiContainer}>
              {['❤️', '👍', '👎', '😂', '😮', '😢', '😡', '🔥', '💯', '🙏'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.emojiButton}
                  onPress={() => {
                    reactToMessage(reactionMessage.id!, emoji);
                    setShowEmojiPicker(false);
                    setReactionMessage(null);
                  }}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* FIXED: Input container with proper layout */}
        <View style={styles.inputContainer}>
          {replyMessage && (
            <View style={styles.replyPreview}>
              <Text style={styles.replyLabel}>Replying to:</Text>
              <Text numberOfLines={1} style={styles.replyText}>
                {typeof replyMessage.content === 'string' 
                  ? replyMessage.content 
                  : (replyMessage.content as any).name || 'Attachment'}
              </Text>
              <TouchableOpacity onPress={() => setReplyMessage(null)}>
                <Text style={styles.replyCancel}>✖</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputWrapper}>
            <TouchableOpacity onPress={handleAttachmentPress}>
              <Text style={styles.attachButton}>📎</Text>
            </TouchableOpacity>
<TextInput
  ref={inputRef}
  style={[styles.input, { maxHeight: 100 }]} // Move maxHeight to style
  value={text}
  onChangeText={setText}
  placeholder="Type a message..."
  placeholderTextColor="rgba(255,255,255,0.6)"
  multiline
/>

            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>

            <View style={styles.audioContainer}>
              <TouchableOpacity
                style={[styles.micButton, isRecording && styles.micButtonRecording]}
                onPress={() => (isRecording ? stopRecording() : startRecording())}
              >
                <Text style={styles.micIcon}>{isRecording ? '⏹️' : '🎤'}</Text>
              </TouchableOpacity>

              {audioPath && !isRecording && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => setAudioPath(null)}
                >
                  <Text style={styles.retryIcon}>↻</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>
              {isRecording ? 'Recording...' : audioPath ? `Recorded: ${audioPath.split('/').pop()}` : ''}
            </Text>
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
            if (!option || !actionMessage) return;

            if (option === "React ❤️") {
              setReactionMessage(actionMessage);
              setShowEmojiPicker(true);
            } else if (option === "Reply") {
              setReplyMessage(actionMessage);
              setTimeout(() => {
                inputRef.current?.focus();
              }, 100);
            } else if (option === "Forward") {
              navigation.navigate("ChatList", {
                userId,
                forwardMessage: actionMessage,
                onForward: async (targetId: string, isGroup: boolean) => {
                  if (!targetId || targetId === userId) {
                    Alert.alert("Cannot forward to yourself!");
                    return;
                  }

                  try {
                    await forwardMessage(targetId, isGroup, actionMessage);
                    Alert.alert("Message forwarded!");
                    navigation.goBack();
                  } catch (error) {
                    console.error("Forward error:", error);
                    Alert.alert("Error", "Failed to forward message");
                  }
                },
              });
            } else if (option === "Delete for me") {
              deleteMessage(actionMessage.id!, false);
            } else if (option === "Delete for everyone") {
              deleteMessage(actionMessage.id!, true);
            }

            setActionMessage(null);
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#7b2cbf" 
  },
  header: { 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: "rgba(255,255,255,0.2)", 
    backgroundColor: "#7b2cbf" 
  },
  receiverName: { 
    fontSize: 20, 
    fontWeight: "bold", 
    color: "#fff" 
  },
  receiverStatus: { 
    fontSize: 14, 
    color: "rgba(255,255,255,0.7)", 
    marginTop: 2 
  },
  messageList: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingVertical: 10,
  },
  messageContainer: { 
    padding: 12, 
    marginVertical: 4, 
    borderRadius: 16, 
    maxWidth: "80%" 
  },
  sent: {
    backgroundColor: "#d6bbff",
    alignSelf: "flex-end",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  received: {
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "flex-start",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  reactionsRow: {
    flexDirection: "row",
    marginTop: 4,
    flexWrap: 'wrap',
  },
  reactionEmoji: {
    fontSize: 20,
    lineHeight: 24,
    marginRight: 6,
    letterSpacing: 0,
    includeFontPadding: true,
  },
  
  // Input container styling
  inputContainer: {
    backgroundColor: "#7b2cbf",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  
  replyPreview: { 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    padding: 10, 
    borderRadius: 8, 
    marginHorizontal: 10, 
    marginTop: 8,
    marginBottom: 4,
    flexDirection: 'row', 
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#d6bbff',
  },
  replyLabel: { 
    color: 'rgba(255,255,255,0.8)', 
    fontSize: 12, 
    marginRight: 8,
    fontWeight: '600',
  },
  replyText: { 
    color: '#fff', 
    flex: 1,
    fontSize: 13,
  },
  replyCancel: { 
    color: 'rgba(255,255,255,0.7)', 
    marginLeft: 8,
    fontSize: 16,
    paddingHorizontal: 4,
  },
  
  inputWrapper: { 
    flexDirection: "row", 
    padding: 10, 
    alignItems: "center",
    minHeight: 60,
  },
  attachButton: { 
    fontSize: 28, 
    color: "#fff", 
    marginRight: 10,
    padding: 4,
  },
  input: { 
    flex: 1, 
    backgroundColor: "rgba(255,255,255,0.2)", 
    color: "#fff", 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingVertical: Platform.OS === "ios" ? 10 : 8, 
    fontSize: 16, 
    marginRight: 8,
    minHeight: 40,
  },
  sendButton: { 
    backgroundColor: "#fff", 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingVertical: 10,
    marginLeft: 4,
  },
  sendButtonText: { 
    color: "#7b2cbf", 
    fontWeight: "bold",
    fontSize: 14,
  },
  
  audioContainer: {
    flexDirection: "row", 
    alignItems: "center",
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  micButtonRecording: {
    backgroundColor: "#ff4b5c",
  },
  micIcon: {
    fontSize: 20,
    color: "#7b2cbf",
  },
  retryButton: {
    marginLeft: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryIcon: {
    fontSize: 16,
    color: '#7b2cbf',
  },
  
  debugContainer: {
    paddingHorizontal: 12, 
    paddingBottom: 8,
  },
  debugText: { 
    color: 'rgba(255,255,255,0.8)', 
    fontSize: 12,
  },
  
  emojiPicker: {
    position: "absolute",
    bottom: 70,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  simpleEmojiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-around',
  },
  emojiButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  emojiText: {
    fontSize: 24,
  },
  messageText: { 
    fontSize: 16 
  },
  sentText: { 
    color: "#4b0082" 
  },
  receivedText: { 
    color: "#fff" 
  },
  fileText: { 
    fontSize: 16, 
    textDecorationLine: "underline" 
  },
  metaRow: { 
    flexDirection: "row", 
    justifyContent: "flex-end", 
    marginTop: 4 
  },
  timestamp: { 
    fontSize: 10, 
    color: "rgba(255,255,255,0.6)", 
    marginRight: 6 
  },
  readReceipt: { 
    fontSize: 10, 
    color: "rgba(255,255,255,0.6)" 
  },
  noMessages: { 
    textAlign: "center", 
    color: "rgba(255,255,255,0.6)", 
    fontSize: 16 
  },
});