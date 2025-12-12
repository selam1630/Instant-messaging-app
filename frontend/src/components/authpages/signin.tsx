import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
   Image,
} from "react-native";
import { Mail, Lock, LogIn } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../App";
import { useSocket } from "../../context/SocketContext";
import AsyncStorage from "@react-native-async-storage/async-storage";


export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { socket } = useSocket();

  const BACKEND_URL = Platform.select({
    ios: "http://localhost:4000",
    android: "http://localhost:4000", 
    default: "http://10.5.209.88:4000",
  });

  const getConversationId = async (userId: string, receiverId: string) => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/conversation/get-or-create?user1=${userId}&user2=${receiverId}`
      );
      const data = await res.json();

      if (!res.ok) throw new Error("Failed to fetch conversation.");

      return data.conversationId;
    } catch (err) {
      console.error("Conversation fetch failed:", err);
      return null;
    }
  };

  const handleSignIn = async () => {
  setError("");

  if (!email || !password) {
    setError("Please enter both email and password.");
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message || "Invalid credentials.");
      setLoading(false);
      return;
    }

    const userId = data.user.id;

    // 🔥 SAVE LOGIN DATA
    await AsyncStorage.setItem("token", data.token);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));

    socket?.emit("user_online", userId);

    navigation.replace("ChatList", {
      userId: data.user.id,
    });
  } catch (err) {
    console.error(err);
    setError("Failed to connect to server.");
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
     <Image source={require('../../assets/image.png')} style={{ width: 90, height: 90, borderRadius: 64}} />
      <Text style={styles.title}>Welcome Back</Text>

      <View style={styles.inputContainer}>
        <Mail color="white" size={20} style={styles.icon} />
        <TextInput
          placeholder="Email"
          placeholderTextColor="#ddd"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <View style={styles.inputContainer}>
        <Lock color="white" size={20} style={styles.icon} />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#ddd"
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSignIn}>
        {loading ? (
          <ActivityIndicator color="#7b2cbf" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          Alert.alert("Info", "Password reset link sent to your email.")
        }
      >
        <Text style={styles.link}>Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 16 }}
        >
          <Text style={styles.link}>Create Account</Text>
          <LogIn color="white" size={14} style={{ marginLeft: 6 }} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#7b2cbf",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 32,
    color: "white",
    fontWeight: "bold",
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    width: "100%",
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: "white",
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    width: "100%",
    backgroundColor: "white",
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: {
    color: "#7b2cbf",
    fontSize: 18,
    fontWeight: "bold",
  },
  error: {
    color: "#ff8080",
    marginBottom: 8,
    fontWeight: "bold",
  },
  link: {
    color: "white",
    marginTop: 16,
    fontSize: 14,
    opacity: 0.9,
  },
});
