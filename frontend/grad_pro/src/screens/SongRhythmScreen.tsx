import React, { useContext, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from "react-native";
import Header from "../components/TabBarButtons";
import BaseStyles from "../styles/BaseStyles";
import api from "../utils/api";
import { SelectedCategoriesContext } from "../contexts/SelectedCategoriesContext";

type Props = {
  route: {
    params: {
      userId?: string | number;
      category: string;
      headerLabel?: string;
      promptNoun?: string;
    };
  };
  navigation: any;
};

const SongRhythmScreen = ({ route, navigation }: Props) => {
  const { userId: ctxUserId } = useContext(SelectedCategoriesContext);
  const { userId: routeUserId } = route.params;
  const userId = routeUserId || ctxUserId;
  const rhythms = ["빠른", "경쾌한", "느린"];
  const CUSTOM_ID = "__custom__";
  const [selectedRhythm, setSelectedRhythm] = useState<string>("");
  const [customRhythm, setCustomRhythm] = useState<string>("");

  const handleDone = () => {
    const rhythm = customRhythm.trim() || selectedRhythm;
    if (!rhythm) {
      Alert.alert("안내", "리듬을 선택하거나 입력해 주세요.");
      return;
    }
    if (!userId) {
      Alert.alert("안내", "로그인 후 다시 시도해 주세요.");
      navigation.navigate("LoginScreen");
      return;
    }
    submitSelection(rhythm);
  };

  const submitSelection = async (rhythm: string) => {
    try {
      await api.post("/instrument", { rhythm });
      navigation.navigate({
        name: "MelodyScreen",
        params: {
          userId,
          completedCategory: "rhythm",
          completedValue: rhythm,
        },
        merge: true,
      });
    } catch (error: any) {
      console.error("Error during fetch operation:", error?.message);
      const message = error?.response?.data?.message || error?.message || "리듬을 저장하지 못했습니다.";
      Alert.alert("Error", message);
    }
  };

  return (
    <View style={[BaseStyles.flexContainer, { backgroundColor: "#A5BEDF" }]}>
      <Header />
      <View style={[BaseStyles.contentContainer]}>
        <View style={[BaseStyles.topContainer]}>
          <Text style={[BaseStyles.mainText, styles.title]}>리듬 고르기</Text>
          <Text style={[BaseStyles.mainText, styles.subtitle]}>
            {"동요에 넣고 싶은 리듬을 골라볼까요?"}
          </Text>
        </View>

        {/* 🔹 여기 middleContainer + optionContainer */}
        <View style={[BaseStyles.middleContainer, styles.optionContainer]}>
          {rhythms.map((rhythm) => (
            <TouchableOpacity
              key={rhythm}
              style={[styles.option, selectedRhythm === rhythm && styles.optionSelected]}
              activeOpacity={0.85}
              onPress={() => {
                setSelectedRhythm(rhythm);
                setCustomRhythm("");
              }}
            >
              <Text style={styles.optionText}>{rhythm}</Text>
            </TouchableOpacity>
          ))}
          <TextInput
            style={[
              styles.option,
              styles.inputField,
              selectedRhythm === CUSTOM_ID && styles.optionSelected,
            ]}
            placeholder="직접 입력하기"
            placeholderTextColor="#999"
            value={customRhythm}
            onChangeText={setCustomRhythm}
            onFocus={() => setSelectedRhythm(CUSTOM_ID)}
          />
        </View>

        <View style={[BaseStyles.bottomContainer, styles.bottom]}>
          <TouchableOpacity
            style={[styles.navButton, styles.prevButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.navButtonText}>이전</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navButton, styles.nextButton]}
            onPress={handleDone}
          >
            <Text style={styles.navButtonText}>완료</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 32, lineHeight: 54, marginBottom: 6 },
  subtitle: { fontSize: 18, lineHeight: 30, textAlign: "center" },

  // 🔹 텍스트 박스들을 화면 위쪽으로 올리기 위해 정렬 조정
  optionContainer: {
    width: "100%",
    alignItems: "center",
    gap: 14,
    flex: 1,
    justifyContent: "flex-start", // ← 가운데에서 위로
    paddingTop: 10,               // ← 너무 달라붙지 않게 살짝 여백
  },

  option: {
    width: "60%",
    borderRadius: 30,
    backgroundColor: "#f7f7f7",
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  optionSelected: {
    borderWidth: 2,
    borderColor: "#4F8FED",
  },
  optionText: {
    fontSize: 22,
    fontFamily: "Jua-Regular",
    color: "#000",
  },
  inputField: {
    textAlign: "center",
    color: "#000",
    fontSize: 22,
    fontFamily: "Jua-Regular",
  },
  bottom: {
    height: "15%",
    justifyContent: "space-between",
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  navButton: {
    width: 120,
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  prevButton: {
    backgroundColor: "#d6d6d6",
  },
  nextButton: {
    backgroundColor: "#b7d9f7",
  },
  navButtonText: {
    fontSize: 20,
    fontFamily: "Jua-Regular",
    color: "#333",
  },
});

export default SongRhythmScreen;
