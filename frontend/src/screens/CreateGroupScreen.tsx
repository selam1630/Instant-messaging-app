import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Platform } from "react-native";
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from "../../App";

export default function CreateGroupScreen({ route }: { route: { params: { userId: string } } }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'CreateGroup'>>();
  const { userId } = route.params;

  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const BACKEND_URL = Platform.select({
    ios: "http://localhost:4000",
    android: "http://localhost:4000",
    default: "http://10.5.209.88:4000",
  });

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/contacts/${userId}`);
        if (!res.ok) return;
        const data = await res.json();
        setContacts(data || []);
      } catch (err) {
        console.error("Fetch contacts error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [userId]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return Alert.alert("Validation", "Please enter a group name");
    if (selectedIds.length < 1) return Alert.alert("Validation", "Select at least one member");

    setCreating(true);
    try {
      const body = { name: groupName.trim(), participants: [...selectedIds, userId], adminId: userId };
      const res = await fetch(`${BACKEND_URL}/api/conversation/group`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Create group failed:", txt);
        Alert.alert("Error", "Could not create group");
        return;
      }

      const data = await res.json();
      const convId = data.id || data.conversationId || data.id;

      navigation.replace("GroupChat", {
        conversationId: convId,
        userId,
        groupName: data.name || groupName,
        participantIds: data.participantIds || [...selectedIds, userId],
      });
    } catch (err) {
      console.error("Create group error:", err);
      Alert.alert("Error", "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Group</Text>
      <TextInput
        placeholder="Group name"
        placeholderTextColor="rgba(255,255,255,0.7)"
        value={groupName}
        onChangeText={setGroupName}
        style={styles.input}
      />

      <Text style={styles.sub}>Select members</Text>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.contactRow} onPress={() => toggleSelect(item.id)}>
            <Text style={styles.contactName}>{item.name || item.email || item.phoneNumber}</Text>
            <Text style={styles.selectText}>{selectedIds.includes(item.id) ? "Selected" : "Add"}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No contacts found</Text>}
      />

      <TouchableOpacity style={styles.createButton} onPress={handleCreate} disabled={creating}>
        <Text style={styles.createText}>{creating ? "Creating..." : "Create Group"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#7b2cbf", padding: 16, paddingTop: 40 },
  title: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 12 },
  input: { backgroundColor: "rgba(255,255,255,0.15)", color: "#fff", padding: 12, borderRadius: 10, marginBottom: 12 },
  sub: { color: "rgba(255,255,255,0.9)", marginBottom: 8, fontWeight: "600" },
  contactRow: { flexDirection: "row", justifyContent: "space-between", padding: 12, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 10, marginBottom: 8 },
  contactName: { color: "#fff" },
  selectText: { color: "#fff", fontWeight: "700" },
  createButton: { backgroundColor: "#fff", padding: 12, borderRadius: 10, alignItems: "center", marginTop: 12 },
  createText: { color: "#7b2cbf", fontWeight: "700" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#7b2cbf" },
  empty: { color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: 40 },
});
