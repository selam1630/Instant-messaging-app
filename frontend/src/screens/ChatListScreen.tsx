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
} from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function ChatListScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const { userId } = route.params;

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = Platform.select({
    ios: "http://localhost:4000",
    android: "http://localhost:4000",
    default: "http://10.5.209.88:4000",
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/user`);
      const data = await res.json();

      if (res.ok) {
        const otherUsers = data.filter((u: any) => u.id !== userId);
        setUsers(otherUsers);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const startChat = async (receiverId: string) => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/conversation/get-or-create?user1=${userId}&user2=${receiverId}`
      );
      const data = await res.json();

      if (res.ok) {
        navigation.navigate("Chat", {
          conversationId: data.conversationId,
          userId,
          receiverId,
        });
      }
    } catch (err) {
      console.error("Error starting chat:", err);
    }
  };

  const handleLogout = () => {
    // Here you can also clear any auth tokens if needed
    navigation.replace("SignIn");
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.userBox}
      onPress={() => startChat(item.id)}
    >
      <Image
        source={{ uri: item.profileImage || "https://i.pravatar.cc/150" }}
        style={styles.avatar}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.username}>{item.name}</Text>
        <Text style={styles.email}>{item.email}</Text>
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
        <Text style={styles.header}>Users</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No users found</Text>}
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
