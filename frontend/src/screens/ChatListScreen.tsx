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

export default function ChatListScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const { userId } = route.params;

  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("");

  const BACKEND_URL = Platform.select({
    ios: "http://localhost:4000",
    android: "http://localhost:4000",
    default: "http://10.5.209.88:4000",
  });

  // Fetch contacts for the user
  const fetchContacts = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/contacts/${userId}`);
      const data = await res.json();

      if (res.ok) {
        setContacts(data);
      }
    } catch (err) {
      console.error("Error fetching contacts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // Start chat with a contact
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

  // Logout
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      navigation.replace("SignIn");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Add a contact by phone number
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
        fetchContacts(); // refresh contacts list
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (err) {
      console.error("Error adding contact:", err);
      Alert.alert("Error", "Failed to add contact");
    }
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.userBox} onPress={() => startChat(item.id)}>
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
        <Text style={styles.header}>Contacts</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Add Contact Input */}
      <View style={{ marginBottom: 16 }}>
        <TextInput
          placeholder="Enter phone number"
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
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No contacts found</Text>}
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
