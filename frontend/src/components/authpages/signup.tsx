import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView, Alert, Platform,Image } from "react-native";
import { User, Lock, LogIn } from "lucide-react-native";
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';

export default function SignUpScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const BACKEND_URL = Platform.select({
    ios: "http://localhost:4000",
    android: "http://localhost:4000",
    default: "http://10.5.209.88:4000",
  });

  const handleSignUp = async () => {
    setError("");

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill out all fields.");
      return;
    }
if (!phoneNumber) {
  setError("Please enter your phone number.");
  return;
}

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const otpResponse = await fetch(`${BACKEND_URL}/api/otp/send`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, phoneNumber }),
});

      const otpData = await otpResponse.json();

      if (!otpResponse.ok) {
        setError(otpData.message || "Failed to send OTP.");
        setLoading(false);
        return;
      }

      Alert.alert("OTP Sent", `An OTP has been sent to ${email}.`);
navigation.navigate("VerifyEmail", { email, name, password, phoneNumber } as any);


    } catch (err) {
      console.error(err);
      setError("Failed to connect to server. Make sure your device and backend are on the same network.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

           <Image source={require('../../assets/image.png')} style={{ width: 90, height: 90, borderRadius: 64}} />
      <Text style={styles.title}>Create Account</Text>

      <View style={styles.inputContainer}>
        <User color="white" size={20} style={styles.icon} />
        <TextInput
          placeholder="Full Name"
          placeholderTextColor="#ddd"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Email"
          placeholderTextColor="#ddd"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
      </View>
  <View style={styles.inputContainer}>
  <TextInput
    placeholder="Phone Number"
    placeholderTextColor="#ddd"
    style={styles.input}
    keyboardType="phone-pad"
    value={phoneNumber}
    onChangeText={setPhoneNumber}
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

      <View style={styles.inputContainer}>
        <Lock color="white" size={20} style={styles.icon} />
        <TextInput
          placeholder="Confirm Password"
          placeholderTextColor="#ddd"
          style={styles.input}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSignUp}>
        {loading ? (
          <ActivityIndicator color="#7b2cbf" />
        ) : (
          <Text style={styles.buttonText}>Sign Up</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 16 }}>
          <Text style={styles.link}>Already have an account?</Text>
          <LogIn color="white" size={14} style={{ marginLeft: 6 }} />
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#7b2cbf", alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 32, color: "white", fontWeight: "bold", marginBottom: 32 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12, paddingHorizontal: 12, marginBottom: 16, width: "100%" },
  icon: { marginRight: 8 },
  input: { flex: 1, color: "white", paddingVertical: 12, fontSize: 16 },
  button: { width: "100%", backgroundColor: "white", paddingVertical: 14, borderRadius: 30, alignItems: "center", marginTop: 12 },
  buttonText: { color: "#7b2cbf", fontSize: 18, fontWeight: "bold" },
  error: { color: "#ff8080", marginBottom: 8, fontWeight: "bold" },
  link: { color: "white", marginTop: 16, fontSize: 14, opacity: 0.9 },
});
