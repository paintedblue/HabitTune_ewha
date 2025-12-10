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

const LoginScreen = ({ navigation, route }) => {
  const { setAuthInfo, clearAuth, isAuthenticated, childName } = useContext(SelectedCategoriesContext);
  const [nameInput, setNameInput] = useState(childName || "");
  const [password, setPassword] = useState("");
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

  const handleLogin = async () => {
    const trimmed = nameInput.trim();
    const trimmedPw = password.trim();
    if (!trimmed) {
      Alert.alert("입력 필요", "아이 이름을 입력해주세요.");
      return;
    }
    if (!trimmedPw || trimmedPw.length < 4) {
      Alert.alert("입력 필요", "비밀번호를 4자 이상 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/login-child", { childName: trimmed, password: trimmedPw });
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
      console.error("login error", error);
      const message =
        error?.response?.data?.message ||
        "로그인에 실패했습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.";
      Alert.alert("로그인 오류", message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await clearAuth();
    setNameInput("");
    setPassword("");
    Alert.alert("로그아웃", "로그아웃 되었습니다. 다시 로그인해주세요.");
  };

  const goToRegister = () => {
    navigation.navigate("RegisterScreen", { nextScreen, nextParams });
  };

  return (
    <KeyboardAvoidingView
      style={[BaseStyles.flexContainer, { backgroundColor: "#A5BEDF" }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[BaseStyles.contentContainer, styles.container]}>
        <Text style={[BaseStyles.text, styles.title]}>로그인</Text>

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
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity disabled={loading} onPress={handleLogin} activeOpacity={0.9} style={styles.buttonWrapper}>
            <LinearGradient colors={["#7EA7FF", "#8F72FF"]} style={styles.button}>
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={[BaseStyles.text, styles.buttonText]}>로그인</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={goToRegister} activeOpacity={0.8} style={styles.registerLink}>
          <Text style={[BaseStyles.text, styles.registerText]}>
            처음이신가요? <Text style={styles.registerHighlight}>회원가입</Text>
          </Text>
        </TouchableOpacity>

        {isAuthenticated && (
          <TouchableOpacity style={[styles.logoutButton]} onPress={handleLogout}>
            <Text style={[BaseStyles.text, styles.logoutText]}>로그아웃</Text>
          </TouchableOpacity>
        )}
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
  registerLink: {
    marginTop: 16,
  },
  registerText: {
    color: "#4B5A73",
    fontSize: 15,
  },
  registerHighlight: {
    color: "#7EA7FF",
    fontWeight: "700",
  },
  logoutButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  logoutText: {
    color: "#1B2B3C",
    fontSize: 16,
  },
});

export default LoginScreen;
