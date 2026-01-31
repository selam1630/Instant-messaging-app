import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
  TextInput,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSocket } from "../context/SocketContext";

export default function ChatListScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const { userId, forwardMessage, onForward } = route.params || {};

  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("");

  const BACKEND_URL = Platform.select({
    ios: "http://localhost:4000",
    android: "http://localhost:4000",
    default: "http://10.5.209.88:4000",
  });

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/conversation/list/${userId}`);
      if (!res.ok) {
        const text = await res.text();
        console.error("Error fetching conversations:", text);
        return;
      }
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // listen for newly created groups via socket and add locally
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    const handler = (payload: any) => {
      if (!payload || !payload.participantIds) return;
      if (!payload.participantIds.includes(userId)) return;
      // avoid duplicate
      setConversations((prev) => {
        if (prev.find((c) => c.conversationId === payload.conversationId)) return prev;
        return [
          {
            isGroup: true,
            conversationId: payload.conversationId,
            groupName: payload.name || "Group",
            participantIds: payload.participantIds,
            lastMessage: null,
          },
          ...prev,
        ];
      });
    };

    socket.on("group_created", handler);
    return () => {
      socket.off("group_created", handler);
    };
  }, [socket, userId]);

  const startChat = async (receiverId: string, conversationId?: string) => {
    try {
      // If conversation already exists, use it
      let convId = conversationId;
      if (!convId) {
        // Otherwise, create or get conversation from backend
        const res = await fetch(
          `${BACKEND_URL}/api/conversation/get-or-create?user1=${userId}&user2=${receiverId}`
        );
        if (!res.ok) {
          const text = await res.text();
          console.error("Error starting chat:", text);
          return;
        }
        const data = await res.json();
        convId = data.conversationId;
      }

      navigation.navigate("Chat", {
        conversationId: convId,
        userId,
        receiverId,
      });
    } catch (err) {
      console.error("Error starting chat:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      navigation.replace("SignIn");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleAddContact = async () => {
    if (!phoneNumber) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/contacts/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, phoneNumber }),
      });

      const data = await res.json();

      if (res.ok) {
        Alert.alert("Success", "Contact added!");
        setPhoneNumber("");
        fetchConversations();
      } else {
        Alert.alert("Error", data.message || "Failed to add contact");
      }
    } catch (err) {
      console.error("Error adding contact:", err);
      Alert.alert("Error", "Failed to add contact");
    }
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.userBox}
    onPress={() => {
const otherParticipantId = item.isGroup
  ? item.conversationId
  : item.participantId; // for 1-on-1 chats, use participantId directly

const targetId = item.isGroup ? item.conversationId : otherParticipantId;
if (forwardMessage && onForward) {
  const targetId = item.isGroup ? item.conversationId : item.participantId;

  if (!targetId || targetId === userId) {
    Alert.alert("Cannot forward to yourself!");
    return;
  }

  onForward(targetId, item.isGroup); // ✅ works for groups and 1-on-1
  return;
}

else {
    // Normal chat
    if (item.isGroup) {
      navigation.navigate("GroupChat", {
        conversationId: item.conversationId,
        userId,
        groupName: item.groupName,
        participantIds: item.participantIds || [userId],
      });
    } else {
      startChat(item.participantId, item.conversationId);
    }
  }
}}
    >
      <Image
        source={{ uri: item.participantProfileImage || (item.isGroup ? "https://i.pravatar.cc/150?u=group" : "https://i.pravatar.cc/150") }}
        style={styles.avatar}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.username}>{item.isGroup ? (item.groupName || "Group") : item.participantName}</Text>
        <Text style={styles.email}>{item.lastMessage ? JSON.stringify(item.lastMessage) : ""}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Logout */}
      <View style={styles.headerWrapper}>
        <Text style={styles.header}>Chats</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.createGroupButton}
            onPress={() => navigation.navigate('CreateGroup', { userId })}
          >
            <Text style={styles.createGroupText}>Create Group</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile', { userId })}
          >
            <Text style={styles.profileText}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Add Contact Input */}
      <View style={{ marginBottom: 16 }}>
        <TextInput
          placeholder="Enter phone number to add"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          style={styles.input}
          keyboardType="phone-pad"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddContact}>
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Add Contact</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.conversationId ?? item.participantId}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No conversations found</Text>}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#7b2cbf",
    padding: 16,
    paddingTop: 40,
  },
  headerWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  createGroupButton: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
  createGroupText: { color: '#7b2cbf', fontWeight: 'bold' },
  profileButton: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
  profileText: { color: '#7b2cbf', fontWeight: 'bold' },
  logoutButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  logoutText: {
    color: "#7b2cbf",
    fontWeight: "bold",
    fontSize: 14,
  },
  input: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: "#4a148c",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  userBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  username: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  email: {
    color: "#ddd",
    fontSize: 14,
    marginTop: 2,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#7b2cbf",
  },
  empty: {
    textAlign: "center",
    color: "rgba(255,255,255,0.6)",
    marginTop: 40,
    fontSize: 16,
  },
});
