import React, { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import BaseStyles from "../styles/BaseStyles";
import Header from "../components/TabBarButtons";
import VoiceUtil from "../utils/VoiceUtil";

type Habit = { name: string };

type HabitQuestionScreenProps = {
  route: { params: { userId: string | number; selectedHabits: Habit[] } };
  navigation: any;
};

const MIN_RECOGNITION_WAIT_MS = 2000;

const HabitQuestionScreen = ({ route, navigation }: HabitQuestionScreenProps) => {
  const { userId, selectedHabits = [] } = route.params || {};

  const [isAnswering, setIsAnswering] = useState(true);
  const [onRecording, setOnRecording] = useState(false);
  const [answer, setAnswer] = useState("");
  const [typedAnswer, setTypedAnswer] = useState("");

  const onRecordingRef = useRef(onRecording);
  const recognitionStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    onRecordingRef.current = onRecording;
  }, [onRecording]);

  useEffect(() => {
    VoiceUtil.cleanup();

    VoiceUtil.setSpeechResultCallback((results) => {
      const recognized = (results?.[0] ?? "").trim();
      setOnRecording(false);
      onRecordingRef.current = false;
      recognitionStartedAtRef.current = null;

      if (!recognized) {
        Alert.alert("알림", "음성을 인식하지 못했습니다. 다시 시도해 주세요.");
        return;
      }

      setAnswer(recognized);
      setTypedAnswer(recognized);
      setIsAnswering(false);
    });

    VoiceUtil.setErrorCallback((error) => {
      if (!onRecordingRef.current) return;

      const rawCode = error?.error?.code ?? error?.code;
      const errorCode = String(rawCode ?? "");

      const startedAt = recognitionStartedAtRef.current;
      const elapsed = startedAt ? Date.now() - startedAt : null;

      if (elapsed !== null && elapsed < MIN_RECOGNITION_WAIT_MS) {
        console.log(
          `Ignoring early speech error (${errorCode || "unknown"}) at ${elapsed}ms < ${MIN_RECOGNITION_WAIT_MS}ms`
        );
        setOnRecording(false);
        onRecordingRef.current = false;
        recognitionStartedAtRef.current = null;
        return;
      }

      let errorMessage = "음성 인식에 실패했습니다. 다시 시도해 주세요.";
      let shouldAlert = true;

      switch (errorCode) {
        case "7": // no match
        case "11": // speech timeout / no match
        case "13": // busy
        case "5": // client error
        case "8": // service busy
          shouldAlert = false; // 조용히 실패 처리
          break;
        case "6":
          errorMessage = "음성이 들리지 않습니다. 마이크 권한을 확인해 주세요.";
          break;
        case "9":
          errorMessage = "마이크 권한이 거부되었습니다. 설정에서 허용해 주세요.";
          break;
        default:
          break;
      }

      if (shouldAlert) {
        Alert.alert("오류", errorMessage);
      }

      setOnRecording(false);
      onRecordingRef.current = false;
      recognitionStartedAtRef.current = null;
    });

    return () => {
      VoiceUtil.destroyRecognizer();
    };
  }, []);

  const toggleSpeech = async () => {
    if (onRecordingRef.current) {
      await VoiceUtil.stopListening();
      setOnRecording(false);
      onRecordingRef.current = false;
      recognitionStartedAtRef.current = null;
      return;
    }

    try {
      await VoiceUtil.startListening();
      setOnRecording(true);
      onRecordingRef.current = true;
      recognitionStartedAtRef.current = Date.now();
    } catch (error) {
      Alert.alert("오류", "음성 인식을 시작할 수 없습니다.");
      recognitionStartedAtRef.current = null;
    }
  };

  const handleSubmit = () => {
    const trimmed = typedAnswer.trim();
    if (!trimmed) {
      Alert.alert("입력 오류", "내용을 입력해 주세요.");
      return;
    }
    setAnswer(trimmed);
    setIsAnswering(false);
  };

  const handleBack = () => {
    if (isAnswering) {
      navigation.goBack();
      return;
    }
    setIsAnswering(true);
  };

  const goToLyricSelect = () => {
    navigation.navigate("LyricSelectScreen", { userId });
  };

  return (
    <View style={[BaseStyles.flexContainer, { backgroundColor: "#A5BEDF" }]}>
      <Header />

      <View style={[BaseStyles.contentContainer]}>
        {/* 상단 질문 영역 */}
        <View style={[BaseStyles.topContainer, { justifyContent: "center", alignItems: "center" }]}>
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>습관을 하기 싫은 이유가 뭔가요?</Text>
          </View>

          {selectedHabits.length > 0 && (
            <View style={styles.selectedHabitsContainer}>
              <Text style={styles.selectedHabitsLabel}>선택한 습관</Text>
              <View style={styles.habitsTagWrapper}>
                {selectedHabits.map((habit, index) => (
                  <View key={index} style={styles.habitChip}>
                    <Text style={styles.habitChipText}>{habit.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* 중간 입력/답변 영역 */}
        <View style={[BaseStyles.middleContainer]}>
          {isAnswering ? (
            <View style={styles.inputContainer}>
              {/* 음성 입력 섹션 */}
              <View style={styles.voiceSection}>
                <TouchableOpacity
                  onPress={toggleSpeech}
                  style={[styles.micButton, onRecording && styles.micButtonRecording]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.micIconOuter, onRecording && styles.micIconOuterRecording]}>
                    <View style={[styles.micIconInner, onRecording && styles.micIconInnerRecording]}>
                      <Text style={styles.micIcon}>🎤</Text>
                    </View>
                  </View>
                  {onRecording && <View style={styles.recordingPulse} />}
                </TouchableOpacity>

                <Text style={styles.instructionText}>
                  마이크 버튼을 누르고{"\n"}하기 싫은 이유를 말해 주세요
                </Text>
              </View>

              {/* 구분선 */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>또는</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* 텍스트 입력 섹션 */}
              <View style={styles.textInputSection}>
                <TextInput
                  style={styles.textInput}
                  placeholder="직접 입력하기"
                  placeholderTextColor="#999"
                  value={typedAnswer}
                  onChangeText={setTypedAnswer}
                  keyboardType="default"
                  returnKeyType="done"
                  multiline
                  textAlign="center"
                />

                <View style={styles.exampleContainer}>
                  <Text style={styles.exampleLabel}>예시:</Text>
                  <Text style={styles.exampleText}>귀찮아서요</Text>
                  <Text style={styles.exampleText}>그냥 하기 싫어서</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.imageContainer, { justifyContent: "center" }]}>
              <View style={styles.answerCard}>
                {/* 헤더 섹션 */}
                <View style={styles.answerHeader}>
                  <View style={styles.iconCircle}>
                    <Text style={styles.iconText}>✓</Text>
                  </View>
                  <Text style={styles.answerLabel}>입력한 답변</Text>
                </View>

                {/* 답변 내용 */}
                <View style={styles.answerContent}>
                  <Text style={styles.answerText}>{answer}</Text>
                </View>

                {/* 구분선 */}
                {selectedHabits.length > 0 && <View style={styles.answerDivider} />}

                {/* 선택한 습관 */}
                {selectedHabits.length > 0 && (
                  <View style={styles.habitsSection}>
                    <Text style={styles.habitsLabel}>선택한 습관</Text>
                    <View style={styles.habitsContainer}>
                      {selectedHabits.map((habit, index) => (
                        <View key={index} style={styles.habitTag}>
                          <Text style={styles.habitTagText}>{habit.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* 하단 버튼 영역 */}
        <View style={[BaseStyles.bottomContainer, styles.bottom]}>
          <TouchableOpacity style={[styles.navButton, styles.prevButton]} onPress={handleBack}>
            <Text style={[BaseStyles.mainText, styles.navButtonText]}>
              {isAnswering ? "이전" : "다시 입력"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.nextButton]}
            onPress={isAnswering ? handleSubmit : goToLyricSelect}
            activeOpacity={0.85}
          >
            <Text style={[BaseStyles.mainText, styles.navButtonText]}>
              {isAnswering ? "완료" : "가사 만들기"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // 상단 질문 영역
  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 300,
  },

  questionText: {
    fontSize: 19,
    fontFamily: "Jua-Regular",
    color: "#333",
    textAlign: "center",
    letterSpacing: 1.5,
    lineHeight: 28,
  },

  // ⬇️ 라벨과 칩을 한 줄로 평행하게
  selectedHabitsContainer: {
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  selectedHabitsLabel: {
    fontSize: 14,
    fontFamily: "Jua-Regular",
    color: "#2D3748",
    marginBottom: 0,
    marginRight: 8,
    letterSpacing: 1,
  },

  habitsTagWrapper: {
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "flex-start",
    alignItems: "center",
  },

  habitChip: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#7B9FC4",
  },

  habitChipText: {
    fontSize: 14,
    fontFamily: "Jua-Regular",
    color: "#4A7BA7",
    letterSpacing: 1,
  },

  // 입력 영역
  inputContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  voiceSection: {
    alignItems: "center",
    marginBottom: 25,
  },

  micButton: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 25,
  },

  micButtonRecording: {
    backgroundColor: "#FFE5E5",
    shadowColor: "#FF6B6B",
    shadowOpacity: 0.3,
  },

  micIconOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#F0F4F8",
    justifyContent: "center",
    alignItems: "center",
  },

  micIconOuterRecording: {
    backgroundColor: "#FFD6D6",
  },

  micIconInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#A5BEDF",
    justifyContent: "center",
    alignItems: "center",
  },

  micIconInnerRecording: {
    backgroundColor: "#FF6B6B",
  },

  micIcon: {
    fontSize: 42,
  },

  recordingPulse: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255, 107, 107, 0.3)",
  },

  instructionText: {
    fontSize: 19,
    fontFamily: "Jua-Regular",
    color: "#2D3748",
    textAlign: "center",
    lineHeight: 28,
    letterSpacing: 1,
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "80%",
    marginVertical: 18,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },

  dividerText: {
    fontSize: 15,
    fontFamily: "Jua-Regular",
    color: "#2D3748",
    marginHorizontal: 12,
    letterSpacing: 1,
  },

  textInputSection: {
    width: "100%",
    alignItems: "center",
  },

  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    width: 280,
    minHeight: 70,
    maxHeight: 100,
    paddingVertical: 18,
    paddingHorizontal: 22,
    fontSize: 17,
    fontFamily: "Jua-Regular",
    color: "#333",
    textAlign: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    letterSpacing: 1.5,
  },

  exampleContainer: {
    marginTop: 15,
    alignItems: "center",
  },

  exampleLabel: {
    fontSize: 14,
    fontFamily: "Jua-Regular",
    color: "#2D3748",
    marginBottom: 6,
    letterSpacing: 1,
  },

  exampleText: {
    fontSize: 15,
    fontFamily: "Jua-Regular",
    color: "#4A5568",
    marginVertical: 2,
    letterSpacing: 1,
  },

  // 답변 확인 영역
  imageContainer: {
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    width: "100%",
  },

  answerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    width: 330,
    paddingVertical: 25,
    paddingHorizontal: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  answerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },

  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#A5BEDF",
    justifyContent: "center",
    alignItems: "center",
  },

  iconText: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  answerLabel: {
    fontSize: 18,
    fontFamily: "Jua-Regular",
    color: "#666",
    letterSpacing: 1,
  },

  answerContent: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 20,
    minHeight: 100,
    justifyContent: "center",
  },

  answerText: {
    fontSize: 20,
    fontFamily: "Jua-Regular",
    color: "#333",
    lineHeight: 32,
    letterSpacing: 1.5,
  },

  answerDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 20,
  },

  habitsSection: {
    gap: 12,
  },

  habitsLabel: {
    fontSize: 16,
    fontFamily: "Jua-Regular",
    color: "#666",
    marginBottom: 4,
    letterSpacing: 1,
  },

  habitsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  habitTag: {
    backgroundColor: "#E8F0F8",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#A5BEDF",
  },

  habitTagText: {
    fontSize: 15,
    fontFamily: "Jua-Regular",
    color: "#4A7BA7",
    letterSpacing: 1,
  },

  // 하단 버튼
  bottom: {
    height: "15%",
    justifyContent: "space-between",
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 30,
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

export default HabitQuestionScreen;
