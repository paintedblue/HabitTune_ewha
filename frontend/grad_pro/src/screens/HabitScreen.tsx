import React, { useContext, useState, useEffect, useRef } from "react";
import { Text, View, TouchableOpacity, TextInput, Alert, Image, StyleSheet } from "react-native";
import BaseStyles from "../styles/BaseStyles";
import Header from "../components/TabBarButtons";
import { ScrollView } from "react-native-gesture-handler";
import api from "../utils/api";
import { SelectedCategoriesContext } from "../contexts/SelectedCategoriesContext";

const HabitScreen = ({ route, navigation }) => {
  //개발용 더미 데이터!
  const exData = {
    habits: [
      { name: "편식", selected: true },
      { name: "늦잠", selected: false },
      { name: "책 읽기", selected: false },
    ],
  };
  // 끝

  const { userId: ctxUserId, isAuthenticated } = useContext(SelectedCategoriesContext);
  const { userId: routeUserId } = route.params || {};
  const userId = routeUserId || ctxUserId;
  const isMountedRef = useRef(true);

  const [newHabit, setNewHabit] = useState("");
  const [habits, setHabits] = useState(exData.habits || []); // 초기값을 빈 배열로 설정
  const [popup, setpopup] = useState(false);

  const maintitleText = "습관 입력하기";
  const subtitleText = "아이가 잘 해냈으면 하는 습관을 입력해주세요.\nex. 양치하기, 손씻기";

  // 첫 마운트 되었을 때 실행
  useEffect(() => {
    requestHabitList();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!userId && !isAuthenticated) {
      navigation.navigate("LoginScreen", { nextScreen: "HabitScreen" });
    }
  }, [userId, isAuthenticated, navigation]);

  const requestHabitList = async () => {
    console.log("서버) 습관 요청");
    if (!userId) {
      Alert.alert("Error", "로그인이 필요합니다. 로그인 후 다시 시도해주세요.");
      navigation.navigate("LoginScreen", { nextScreen: "HabitScreen" });
      return;
    }

    try {
      const response = await api.get("/habit");
      const data = response.data;
      if (!isMountedRef.current) return;
      setHabits(data.habits || []); // 습관 목록이 없을 경우 빈 배열로 설정
    } catch (error) {
      console.error("Error during fetch operation:", error);
      const message =
        error.name === "AbortError"
          ? "요청이 지연되어 취소되었습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요."
          : "서버에 연결할 수 없습니다. 인터넷 연결 또는 서버 주소를 확인해주세요.";
      Alert.alert("Error", message);
      if (!isMountedRef.current) return;
      setHabits([]); // 에러가 발생해도 빈 배열로 설정하여 렌더링 오류 방지
    }
  };

  const handleCustomHabitSubmit = async () => {
    if (newHabit.trim() === "") return;
    try {
      const response = await api.post("/habit", { habitName: newHabit });
      const data = response.data;
      setHabits(data.habits || []); // 습관 목록이 없을 경우 빈 배열로 설정
    } catch (error) {
      console.error("Error during fetch operation:", error?.message);
      const message = error?.response?.data?.message || error?.message || "습관 생성에 실패했습니다.";
      Alert.alert("Error", message);
    } finally {
      setNewHabit("");
      setpopup(false);
    }
  };

  const handlerOpenPopUP = () => {
    setpopup(true);
  };

  const handlerClosePopUP = () => {
    setpopup(false);
  };

  const selectHabit = async (index) => {
    try {
      const response = await api.post("/habit/toggle", { habitName: habits[index].name });
      const data = response.data;
      setHabits(data.habits || []); // 습관 목록이 없을 경우 빈 배열로 설정
    } catch (error) {
      console.error("Error during fetch operation:", error?.message);
      const message = error?.response?.data?.message || error?.message || "습관 업데이트에 실패했습니다.";
      Alert.alert("Error", message);
    }
  };

  const handlerNext = async () => {
    if (habits.every((habit) => habit.selected === false)) {
      Alert.alert("습관을 하나 이상 체크해야 합니다.");
    } else {
      const selectedHabits = habits.filter((habit) => habit.selected);
      navigation.navigate("HabitQuestionScreen", { userId, selectedHabits });

      /* 기존 reset 로직 주석 */
      /*
      try {
        const response = await fetch('http://15.165.249.244:3000/api/preferences/reset', {
          method: 'POST',
          headers: {
          'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId:userId.toString()})
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Network response was not ok: ${errorText}`);
        }
        const tempSelectedCategories = {
            likeFood: false,
            likeAnimalOrCharacter: false,
            likeColor: false,
        };
        navigation.navigate('LyricSelectScreen', {userId, tempSelectedCategories})
      } catch (error) {
        console.error("Error during fetch operation:", error.message);
        Alert.alert("Error", error.message);
      }
      */
    }
  };

  return (
    <View style={[BaseStyles.flexContainer, { backgroundColor: "#A5BEDF" }]}>
      <Header />

      <View style={[BaseStyles.contentContainer]}>
        <View style={[BaseStyles.topContainer]}>
          <Text style={[BaseStyles.mainText, styles.title]}>{maintitleText}</Text>
          <Text style={[BaseStyles.mainText, styles.subtitle]}>{subtitleText}</Text>
        </View>

        <View style={[BaseStyles.middleContainer]}>
          <TouchableOpacity style={[BaseStyles.button]} onPress={handlerOpenPopUP}>
            <View style={[styles.habitBox]}>
              <Text style={[BaseStyles.text, styles.addText]}>+</Text>
            </View>
          </TouchableOpacity>

          <ScrollView style={[styles.scrollView]}>
            {habits.map((habit, index) => (
              <TouchableOpacity
                key={index}
                style={[BaseStyles.button]}
                onPress={() => selectHabit(index)}
              >
                <View style={[styles.habitBox, habit.selected ? styles.selectBox : null]}>
                  <Text style={[BaseStyles.text, { fontSize: 25, color: "#000" }]}>
                    {habit.name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 🔹 여기 버튼을 이미지 → 텍스트 버튼으로 교체 */}
        <View style={[BaseStyles.bottomContainer, styles.bottom]}>
          <TouchableOpacity
            style={[styles.navButton, styles.prevButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.navButtonText}>이전</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.nextButton]}
            onPress={handlerNext}
            activeOpacity={0.85}
          >
            <Text style={styles.navButtonText}>다음</Text>
          </TouchableOpacity>
        </View>
      </View>

      {popup ? (
        <View style={[styles.popupBg]}>
          <View style={[styles.popupWin]}>
            <Text style={[BaseStyles.text, { fontSize: 25 }]}>습관 입력하기</Text>
            <TextInput
              style={styles.inputField}
              placeholder="습관을 입력하세요"
              placeholderTextColor="#999"
              value={newHabit}
              onChangeText={setNewHabit}
              autoFocus={true}
              keyboardType="default"
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.completeButton} onPress={handleCustomHabitSubmit}>
              <Text style={[BaseStyles.text, { color: "#000" }]}>완료</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={handlerClosePopUP}>
              <Text style={[BaseStyles.text, { fontSize: 30 }]}>x</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    lineHeight: 60,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 30,
  },
  scrollView: {
    flex: 1,
  },
  habitBox: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 35,
    width: 250,
    height: 70,
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  addText: {
    fontSize: 35,
    color: "#000",
  },

  // 🔹 SongInstrumentScreen과 동일한 버튼 스타일
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

  popupBg: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(150,150,150,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  popupWin: {
    borderRadius: 10,
    width: 300,
    height: 200,
    backgroundColor: "#0052D4",
    justifyContent: "center",
    alignItems: "center",
  },
  inputField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 5,
    width: "80%",
    marginVertical: 20,
  },
  completeButton: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    right: 20,
    top: 15,
  },
  selectBox: {
    backgroundColor: "#6E77FB",
  },
  // 예전 이미지 버튼 스타일은 안 써서 안 써도 됨
  backButton: {
    width: 70,
    height: 70,
  },
  backButtonImage: {
    width: 70,
    height: 70,
  },
});

export default HabitScreen;
