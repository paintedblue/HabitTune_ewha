import React, { useContext, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import Header from "../components/TabBarButtons";
import BaseStyles from "../styles/BaseStyles";
import api from "../utils/api";
import { SelectedCategoriesContext } from "../contexts/SelectedCategoriesContext";

type Props = {
  route: { params: { userId?: string | number; requestData: { title?: string; lyric?: string } } };
  navigation: any;
};

const LyricResultScreen = ({ route, navigation }: Props) => {
  const { userId: ctxUserId } = useContext(SelectedCategoriesContext);
  const { userId: routeUserId, requestData } = route.params || {};
  const userId = routeUserId || ctxUserId;
  const [title, setTitle] = useState(requestData?.title || "제목을 불러오는 중");
  const [lyric, setLyric] = useState(requestData?.lyric || "가사를 불러오는 중");
  const [isLoading, setIsLoading] = useState(false);

  const goToMelody = () => {
    navigation.navigate("MelodyScreen", { userId });
  };

  const regenerateLyric = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const response = await api.post("/lyric", {});
      const data = response.data;
      setTitle(data.title || title);
      setLyric(data.lyric || lyric);
    } catch (error: any) {
      console.error("재생성 오류:", error?.message);
      const message = error?.response?.data?.message || error?.message || "가사를 다시 생성하지 못했습니다.";
      Alert.alert("오류", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[BaseStyles.flexContainer, { backgroundColor: "#A5BEDF" }]}>
      <Header />
      <View style={[BaseStyles.contentContainer]}>
        {/* 상단 여백 최소화해서 전체를 위로 당김 */}
        <View style={[BaseStyles.topContainer, { paddingTop: 0 }]}>
          <Text style={[BaseStyles.mainText, styles.title]}>가사가 완성됐어요!</Text>
        </View>

        {/* 제목 카드 + 가사 카드를 더 상단으로 배치 */}
        <View style={[BaseStyles.middleContainer, styles.cardsWrap]}>
          <View style={styles.titleCard}>
            <Text style={[BaseStyles.mainText, styles.songTitle]} numberOfLines={2}>
              {title}
            </Text>
          </View>

          <View style={styles.lyricCard}>
            <ScrollView style={styles.lyricScroll} contentContainerStyle={styles.lyricContent}>
              <Text style={[BaseStyles.text, styles.lyricText]}>{lyric}</Text>
            </ScrollView>
          </View>
        </View>

        <View style={[BaseStyles.bottomContainer, styles.bottom]}>
          <TouchableOpacity
            style={[styles.navButton, styles.prevButton, isLoading && styles.disabledButton]}
            onPress={regenerateLyric}
            disabled={isLoading}
            activeOpacity={isLoading ? 1 : 0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#333" />
            ) : (
              <Text style={[BaseStyles.mainText, styles.navButtonText]}>다시 생성하기</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navButton, styles.nextButton]} onPress={goToMelody}>
            {/* 버튼 텍스트에서 글자 그림자 제거 */}
            <Text style={[BaseStyles.mainText, styles.navButtonText]}>멜로디 만들기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 36,
    lineHeight: 62,
    textAlign: "center",
  },
  // 제목 카드 + 가사 카드 전체 블럭을 더 위로 올리기 위해 음수 마진을 더 크게 적용
  cardsWrap: {
    width: "100%",
    alignItems: "center",
    gap: 18,
    paddingHorizontal: 10,
    marginTop: -250, // 더 상단으로 배치
  },
  titleCard: {
    width: "90%",
    borderRadius: 20,
    backgroundColor: "#f7f7f7",
    paddingVertical: 16,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  songTitle: {
    fontSize: 28,
    lineHeight: 42,
    textAlign: "center",
    color: "#000",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 4,
  },
  lyricCard: {
    width: "95%",
    borderRadius: 24,
    backgroundColor: "#f7f7f7",
    paddingVertical: 18,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  lyricScroll: {
    maxHeight: "85%",
  },
  lyricContent: {
    paddingBottom: 10,
  },
  lyricText: {
    fontSize: 24,
    lineHeight: 38,
    color: "#000",
    textAlign: "center",
  },
  bottom: {
    height: "15%",
    justifyContent: "space-between",
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 20,
  },
  navButton: {
    width: 160,
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
  nextButton: {
    backgroundColor: "#b7d9f7",
  },
  prevButton: {
    backgroundColor: "#d6d6d6",
  },
  disabledButton: {
    backgroundColor: "#cfd3d8",
  },
  navButtonText: {
    fontSize: 20,
    color: "#333",
    // BaseStyles.mainText에 들어있을 수 있는 텍스트 그림자 제거
    textShadowColor: "transparent",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  },
});

export default LyricResultScreen;
