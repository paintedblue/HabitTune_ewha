import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import BaseStyles from "../styles/BaseStyles";
import api from "../utils/api";
import { SelectedCategoriesContext } from "../contexts/SelectedCategoriesContext";

const RegisterScreen = ({ navigation, route }) => {
  const { setAuthInfo, isAuthenticated } = useContext(SelectedCategoriesContext);
  const [nameInput, setNameInput] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const nextScreen = route?.params?.nextScreen;
  const nextParams = route?.params?.nextParams || {};

  useEffect(() => {
    if (isAuthenticated) {
      if (nextScreen) {
        navigation.replace(nextScreen, nextParams);
      } else {
        navigation.replace("HomeScreen");
      }
    }
  }, [isAuthenticated, navigation, nextScreen, nextParams]);

  const handleRegister = async () => {
    const trimmed = nameInput.trim();
    const trimmedPw = password.trim();
    const trimmedConfirm = confirm.trim();

    if (!trimmed) {
      Alert.alert("입력 필요", "아이 이름을 입력해주세요.");
      return;
    }
    if (!trimmedPw || trimmedPw.length < 4) {
      Alert.alert("입력 필요", "비밀번호를 4자 이상 입력해주세요.");
      return;
    }
    if (trimmedPw !== trimmedConfirm) {
      Alert.alert("입력 오류", "비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/register-child", { childName: trimmed, password: trimmedPw });
      const { token, user } = response.data;
      await setAuthInfo({
        token,
        user: { id: user.id, childName: user.childName },
      });
      if (nextScreen) {
        navigation.replace(nextScreen, nextParams);
      } else {
        navigation.replace("HomeScreen");
      }
    } catch (error) {
      console.error("register error", error);
      const message = error?.response?.data?.message || "회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.";
      Alert.alert("회원가입 오류", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[BaseStyles.flexContainer, { backgroundColor: "#A5BEDF" }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[BaseStyles.contentContainer, styles.container]}>
        <Text style={[BaseStyles.text, styles.title]}>회원가입</Text>

        <View style={styles.formCard}>
          <TextInput
            placeholder="아이디 (이름)"
            placeholderTextColor="#B0B8C4"
            style={styles.input}
            value={nameInput}
            onChangeText={setNameInput}
            editable={!loading}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
          <TextInput
            placeholder="비밀번호"
            placeholderTextColor="#B0B8C4"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            secureTextEntry
            returnKeyType="next"
          />
          <TextInput
            placeholder="비밀번호 확인"
            placeholderTextColor="#B0B8C4"
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
            editable={!loading}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />

          <TouchableOpacity disabled={loading} onPress={handleRegister} activeOpacity={0.9} style={styles.buttonWrapper}>
            <LinearGradient colors={["#7EA7FF", "#8F72FF"]} style={styles.button}>
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={[BaseStyles.text, styles.buttonText]}>회원가입</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.replace("LoginScreen", { nextScreen, nextParams })} activeOpacity={0.8} style={styles.loginLink}>
          <Text style={[BaseStyles.text, styles.loginText]}>이미 계정이 있으신가요? 로그인</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  },
  title: {
    fontSize: 28,
    marginBottom: 20,
    textAlign: "center",
  },
  formCard: {
    width: "90%",
    maxWidth: 420,
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  input: {
    width: "100%",
    backgroundColor: "#F6F8FB",
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1B2B3C",
    borderColor: "rgba(0,0,0,0.05)",
    borderWidth: 1,
    marginBottom: 12,
  },
  buttonWrapper: {
    width: "100%",
    marginTop: 8,
  },
  button: {
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 17,
  },
  loginLink: {
    marginTop: 16,
  },
  loginText: {
    color: "#4B5A73",
    fontSize: 15,
  },
});

export default RegisterScreen;
