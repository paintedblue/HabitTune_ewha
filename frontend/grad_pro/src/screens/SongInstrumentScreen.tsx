import React, { useContext, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Image } from "react-native";
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

const SongInstrumentScreen = ({ route, navigation }: Props) => {
  const { userId: ctxUserId } = useContext(SelectedCategoriesContext);
  const { userId: routeUserId } = route.params;
  const userId = routeUserId || ctxUserId;
  const [selectedInstrument, setSelectedInstrument] = useState<string>("Guitar");
  const [customInstrument, setCustomInstrument] = useState<string>("");

  const cards = [
    { id: "Piano", label: "피아노", image: require("../assets/imgs/iconP.png") },
    { id: "Guitar", label: "기타", image: require("../assets/imgs/iconG.png") },
    { id: "Recorder", label: "리코더", image: require("../assets/imgs/iconR.png") },
    { id: "Xylophone", label: "실로폰", image: require("../assets/imgs/iconX.png") },
  ];

  const handleSubmit = async () => {
    const instrument = customInstrument.trim() || selectedInstrument;
    if (!instrument) {
      Alert.alert("안내", "악기를 선택하거나 직접 입력해 주세요.");
      return;
    }
    if (!userId) {
      Alert.alert("안내", "로그인 후 다시 시도해 주세요.");
      navigation.navigate("LoginScreen");
      return;
    }

    try {
      await api.post("/instrument", { instrument });
      navigation.navigate({
        name: "MelodyScreen",
        params: {
          userId,
          completedCategory: "instrument",
          completedValue: instrument,
        },
        merge: true,
      });
    } catch (error: any) {
      console.error("Error during fetch operation:", error?.message);
      const message = error?.response?.data?.message || error?.message || "악기 선택을 저장하지 못했습니다.";
      Alert.alert("Error", message);
    }
  };

  return (
    <View style={[BaseStyles.flexContainer, { backgroundColor: "#A5BEDF" }]}>
      <Header />
      <View style={[BaseStyles.contentContainer]}>
        <View style={[BaseStyles.topContainer]}>
          <Text style={[BaseStyles.mainText, styles.title]}>악기 고르기</Text>
          <Text style={[BaseStyles.mainText, styles.subtitle]}>
            {"동요에 넣고 싶은 악기를 골라볼까요?"}
          </Text>
        </View>

        <View style={[BaseStyles.middleContainer, styles.grid]}>
          {cards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={[styles.card, selectedInstrument === card.id && styles.cardSelected]}
              activeOpacity={0.8}
              onPress={() => {
                setSelectedInstrument(card.id);
                setCustomInstrument("");
              }}
            >
              <Image source={card.image} style={styles.cardImage} resizeMode="contain" />
              <Text style={[styles.cardText]}>{card.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.inputField}
            placeholder="직접 입력하기"
            placeholderTextColor="#999"
            value={customInstrument}
            onChangeText={setCustomInstrument}
            onFocus={() => setSelectedInstrument("")}
          />
        </View>

        <View style={[BaseStyles.bottomContainer, styles.bottom]}>
          <TouchableOpacity style={[styles.navButton, styles.prevButton]} onPress={() => navigation.goBack()}>
            <Text style={styles.navButtonText}>이전</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navButton, styles.nextButton]}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            <Text style={styles.navButtonText}>완료</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 34, lineHeight: 60, marginBottom: 4 },
  subtitle: { fontSize: 18, lineHeight: 28, textAlign: "center", marginBottom: 10 },
  grid: {
    flexWrap: "wrap",
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
  },
  card: {
    width: 150,
    height: 150,
    backgroundColor: "#f7f7f7",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 3,
    borderColor: "transparent",
  },
  cardSelected: {
    borderColor: "#4F8FED",
  },
  cardImage: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  cardText: {
    fontSize: 20,
    letterSpacing: 1,
    fontFamily: "Jua-Regular",
    color: "#000",
    textShadowColor: "rgba(0, 0, 0, 0.25)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 4,
  },
  inputWrapper: {
    width: "85%",
    alignSelf: "center",
    marginTop: 12,
  },
  inputField: {
    borderRadius: 20,
    backgroundColor: "#f7f7f7",
    height: 60,
    paddingHorizontal: 20,
    fontSize: 20,
    fontFamily: "Jua-Regular",
    color: "#000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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

export default SongInstrumentScreen;
