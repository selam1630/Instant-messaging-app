import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView, Alert, Platform,Image } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from '../../../App';

export default function VerifyEmailScreen() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "VerifyEmail">>();
const { email, name, password, phoneNumber } = route.params;


  const BACKEND_URL = Platform.select({
    ios: "http://localhost:4000",
    android: "http://localhost:4000",
    default: "http://10.5.209.88:4000",
  });

  const handleVerifyOTP = async () => {
    if (!otp) {
      setError("Please enter the OTP.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // 1️⃣ Verify OTP
      const otpResponse = await fetch(`${BACKEND_URL}/api/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const otpData = await otpResponse.json();

      if (!otpResponse.ok) {
        setError(otpData.message || "Invalid OTP");
        setLoading(false);
        return;
      }

      // 2️⃣ Create user after successful OTP verification
      const registerResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phoneNumber }),
      });
      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        setError(registerData.message || "Failed to create account");
      } else {
        Alert.alert("Success", "Account created successfully!");
        navigation.navigate("SignIn");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

             <Image source={require('../../assets/image.png')} style={{ width: 90, height: 90, borderRadius: 64}} />
      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>Enter the OTP sent to {email}</Text>

      <TextInput
        placeholder="Enter OTP"
        placeholderTextColor="#ddd"
        style={styles.input}
        value={otp}
        onChangeText={setOtp}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleVerifyOTP}>
        {loading ? (
          <ActivityIndicator color="#7b2cbf" />
        ) : (
          <Text style={styles.buttonText}>Verify</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#7b2cbf", alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 32, color: "white", fontWeight: "bold", marginBottom: 16 },
  subtitle: { fontSize: 16, color: "#ddd", marginBottom: 32, textAlign: "center" },
  input: { width: "100%", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12, color: "white", paddingVertical: 12, paddingHorizontal: 16, fontSize: 16, marginBottom: 16 },
  button: { width: "100%", backgroundColor: "white", paddingVertical: 14, borderRadius: 30, alignItems: "center", marginTop: 12 },
  buttonText: { color: "#7b2cbf", fontSize: 18, fontWeight: "bold" },
  error: { color: "#ff8080", marginBottom: 8, fontWeight: "bold" },
});
