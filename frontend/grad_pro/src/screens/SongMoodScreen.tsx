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

const SongMoodScreen = ({ route, navigation }: Props) => {
  const { userId: ctxUserId } = useContext(SelectedCategoriesContext);
  const { userId: routeUserId } = route.params;
  const userId = routeUserId || ctxUserId;
  const moods = ["신나는", "모험적인", "포근한"];
  const CUSTOM_ID = "__custom__";
  const [selectedMood, setSelectedMood] = useState<string>("");
  const [customMood, setCustomMood] = useState<string>("");

  const handleDone = () => {
    const mood = customMood.trim() || selectedMood;
    if (!mood) {
      Alert.alert("안내", "분위기를 선택하거나 입력해 주세요.");
      return;
    }
    if (!userId) {
      Alert.alert("안내", "로그인 후 다시 시도해 주세요.");
      navigation.navigate("LoginScreen");
      return;
    }
    submitSelection(mood);
  };

  const submitSelection = async (mood: string) => {
    try {
      await api.post("/instrument", { mood });
      navigation.navigate({
        name: "MelodyScreen",
        params: {
          userId,
          completedCategory: "mood",
          completedValue: mood,
        },
        merge: true,
      });
    } catch (error: any) {
      console.error("Error during fetch operation:", error?.message);
      const message = error?.response?.data?.message || error?.message || "분위기를 저장하지 못했습니다.";
      Alert.alert("Error", message);
    }
  };

  return (
    <View style={[BaseStyles.flexContainer, { backgroundColor: "#A5BEDF" }]}>
      <Header />
      <View style={[BaseStyles.contentContainer]}>
        <View style={[BaseStyles.topContainer]}>
          <Text style={[BaseStyles.mainText, styles.title]}>동요의 분위기 고르기</Text>
          <Text style={[BaseStyles.mainText, styles.subtitle]}>
            {"동요에 넣고 싶은 분위기를 골라볼까요?"}
          </Text>
        </View>

        {/* 🔹 텍스트 박스 묶음을 위쪽으로 올린 컨테이너 */}
        <View style={[BaseStyles.middleContainer, styles.optionContainer]}>
          {moods.map((mood) => (
            <TouchableOpacity
              key={mood}
              style={[styles.option, selectedMood === mood && styles.optionSelected]}
              activeOpacity={0.85}
              onPress={() => {
                setSelectedMood(mood);
                setCustomMood("");
              }}
            >
              <Text style={styles.optionText}>{mood}</Text>
            </TouchableOpacity>
          ))}

          <TextInput
            style={[
              styles.option,
              styles.inputField,
              selectedMood === CUSTOM_ID && styles.optionSelected,
            ]}
            placeholder="직접 입력하기"
            placeholderTextColor="#999"
            value={customMood}
            onChangeText={setCustomMood}
            onFocus={() => setSelectedMood(CUSTOM_ID)}
          />
        </View>

        {/* 🔹 SongRhythmScreen과 동일한 하단 버튼 스타일 */}
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

  // 🔹 옵션/텍스트박스들을 화면 위쪽으로 올림
  optionContainer: {
    width: "100%",
    alignItems: "center",
    gap: 14,
    flex: 1,
    justifyContent: "flex-start", // 가운데 → 위쪽
    paddingTop: 10,               // 너무 상단에 붙지 않게 살짝 여백
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

  // 🔹 SongRhythmScreen과 동일한 bottom + 버튼 스타일
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

export default SongMoodScreen;
