import React, { useMemo, useState, useCallback, useEffect, useContext } from "react";
import { Text, View, TouchableOpacity, Image, StyleSheet, Alert } from "react-native";
import BaseStyles from "../styles/BaseStyles";
import Header from "../components/TabBarButtons";
import { SelectedCategoriesContext } from "../contexts/SelectedCategoriesContext";

type PreferenceCategory = "instrument" | "rhythm" | "mood";

const CATEGORY_HEADER_LABELS: Record<PreferenceCategory, string> = {
  instrument: "내가 원하는 악기 🎻",
  rhythm: "내가 원하는 리듬 🥁",
  mood: "내가 원하는 동요 분위기 🎵",
};

const CATEGORY_PROMPT_NOUNS: Record<PreferenceCategory, string> = {
  instrument: "악기",
  rhythm: "리듬",
  mood: "동요 분위기",
};

type MelodyScreenProps = {
  route: { params: { userId?: string | number; completedCategory?: PreferenceCategory; completedValue?: string } };
  navigation: any;
};

const MelodyScreen = ({ route, navigation }: MelodyScreenProps) => {
  const { userId: ctxUserId } = useContext(SelectedCategoriesContext);
  const { userId: routeUserId } = route.params;
  const userId = routeUserId || ctxUserId;
  const [completed, setCompleted] = useState<Record<PreferenceCategory, boolean>>({
    instrument: false,
    rhythm: false,
    mood: false,
  });

  const cards = useMemo(
    () => [
      {
        id: "instrument" as PreferenceCategory,
        label: CATEGORY_HEADER_LABELS.instrument,
        target: "SongInstrumentScreen",
      },
      {
        id: "rhythm" as PreferenceCategory,
        label: CATEGORY_HEADER_LABELS.rhythm,
        target: "SongRhythmScreen",
      },
      {
        id: "mood" as PreferenceCategory,
        label: CATEGORY_HEADER_LABELS.mood,
        target: "SongMoodScreen",
      },
    ],
    []
  );

  const handleCardPress = useCallback(
    (category: PreferenceCategory, target: string) => {
      if (!userId) {
        Alert.alert("안내", "로그인 후 다시 시도해 주세요.");
        navigation.navigate("LoginScreen");
        return;
      }
      navigation.navigate(target, {
        userId,
        category,
        promptNoun: CATEGORY_PROMPT_NOUNS[category],
        headerLabel: CATEGORY_HEADER_LABELS[category],
      });
    },
    [navigation, userId]
  );

  const allCompleted = Object.values(completed).every(Boolean);

  const handleGenerate = () => {
    if (!allCompleted) {
      Alert.alert("안내", "악기, 리듬, 분위기를 모두 선택해 주세요.");
      return;
    }
    if (!userId) {
      Alert.alert("안내", "로그인 후 다시 시도해 주세요.");
      navigation.navigate("LoginScreen");
      return;
    }
    navigation.navigate("LoadingScreen", { userId, type: "Music" });
  };

  // 돌아올 때 완료 상태 반영 (비-직렬 함수 사용 없이)
  useEffect(() => {
    const completedCategory = route.params?.completedCategory as PreferenceCategory | undefined;
    const completedValue = route.params?.completedValue as string | undefined;
    if (completedCategory) {
      setCompleted((prev) => ({ ...prev, [completedCategory]: !!completedValue || prev[completedCategory] }));
      navigation.setParams({ completedCategory: undefined, completedValue: undefined });
    }
  }, [route.params, navigation]);

  return (
    <View style={[BaseStyles.flexContainer, { backgroundColor: "#A5BEDF" }]}>
      <Header />

      <View style={[BaseStyles.contentContainer]}>
        <View style={[BaseStyles.topContainer]}>
          <Text style={[BaseStyles.mainText, styles.title]}>멜로디 만들기</Text>
          <Text style={[BaseStyles.mainText, styles.subtitle]}>
            {"카테고리를 눌러 대답해보세요."}
          </Text>
        </View>

        <View style={[BaseStyles.middleContainer, { justifyContent: "flex-start" }]}>
          {cards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={styles.cardWrapper}
              activeOpacity={0.8}
              onPress={() => handleCardPress(card.id, card.target)}
            >
              {/* 🔹 LyricMakeScreen의 frameDiv 스타일과 거의 동일한 박스 */}
              <View style={styles.cardBox}>
                <Text style={styles.cardText}>{card.label}</Text>

                <Image
                  source={
                    completed[card.id]
                      ? require("../assets/imgs/CheckMark_blue.png")
                      : require("../assets/imgs/CheckMark.png")
                  }
                  style={styles.checkMark}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[BaseStyles.bottomContainer, styles.bottomContainer]}>
          <TouchableOpacity
            style={[
              BaseStyles.button,
              styles.generateButton,
              !allCompleted && styles.buttonDisabled,
            ]}
            onPress={handleGenerate}
            disabled={!allCompleted}
            activeOpacity={allCompleted ? 0.8 : 1}
          >
            <Text style={[BaseStyles.mainText, styles.generateText]}>멜로디 생성하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 35,
    lineHeight: 90,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 40,
  },

  // 🔹 바깥 래퍼 (위아래 간격 & 가운데 정렬)
  cardWrapper: {
    width: "100%",
    alignItems: "center",
    marginBottom: 18,
  },

  // 🔹 LyricMakeScreen의 frameDiv 스타일을 기반으로 한 텍스트 박스
  cardBox: {
    width: 330,                 // LyricMakeScreen frameDiv와 동일
    borderRadius: 10,
    backgroundColor: "#f7f7f7",
    height: 70,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },

  // 🔹 LyricMakeScreen의 categoryText 스타일과 최대한 동일
  cardText: {
    flex: 1,
    fontSize: 21,
    letterSpacing: 2,
    fontFamily: "Jua-Regular",
    color: "#000",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.25)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 4,
  },

  checkMark: {
    width: 28,
    height: 28,
    marginLeft: 8,
  },

  bottomContainer: {
    height: "15%",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 30,
    paddingVertical: 20,
  },
  generateButton: {
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 100,
    backgroundColor: "#0052d4",
  },
  generateText: {
    fontSize: 22,
  },
  buttonDisabled: {
    backgroundColor: "rgba(0,82,212,0.5)",
  },
});

export default MelodyScreen;
