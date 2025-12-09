import React, { useState, useEffect, useContext, useRef } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  StyleSheet,
} from "react-native";
import { BallIndicator } from "react-native-indicators";
import BaseStyles from "../styles/BaseStyles";
import Header from "../components/TabBarButtons";
import VoiceUtil from "../utils/VoiceUtil";
import { SelectedCategoriesContext } from "../contexts/SelectedCategoriesContext";
import api from "../utils/api";

const DEFAULT_IMAGE_URL = "https://picsum.photos/400/400";

const MIN_RECOGNITION_WAIT_MS = 2000;

type PreferenceCategory = "likeFood" | "likeAnimalOrCharacter" | "likeColor";

type LyricMakeScreenProps = {
  route: { params: { userId?: string | number; category: PreferenceCategory } };
  navigation: any;
};

const CATEGORY_HEADER_LABELS: Record<PreferenceCategory, string> = {
  likeFood: "내가 좋아하는 음식 🍗",
  likeAnimalOrCharacter: "내가 좋아하는 캐릭터나 동물 🐰🐳",
  likeColor: "내가 좋아하는 색깔 🍀",
};

const CATEGORY_PROMPT_NOUNS: Record<PreferenceCategory, string> = {
  likeFood: "음식",
  likeAnimalOrCharacter: "캐릭터나 동물",
  likeColor: "색깔",
};

const CATEGORY_EXAMPLES: Record<PreferenceCategory, string[]> = {
  likeFood: ["치킨이 최고예요", "마라탕을 자주 먹어요"],
  likeAnimalOrCharacter: ["토끼 캐릭터가 좋아요", "강아지가 제일 귀여워요"],
  likeColor: ["파란색이 좋아요", "연보라색이 취향이에요"],
};

const VALID_CATEGORIES: PreferenceCategory[] = [
  "likeFood",
  "likeAnimalOrCharacter",
  "likeColor",
];

const LyricMakeScreen = ({ route, navigation }: LyricMakeScreenProps) => {
  const { updateCategory, userId: ctxUserId } = useContext(SelectedCategoriesContext);
  const { userId: routeUserId, category } = route.params;
  const userId = routeUserId || ctxUserId;

  const [isCollectingPreferenceInput, setIsCollectingPreferenceInput] = useState(true);
  const [isMicListening, setIsMicListening] = useState(false);
  const [recognizedKeyword, setRecognizedKeyword] = useState("");
  const [isGenerationOverlayVisible, setIsGenerationOverlayVisible] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(DEFAULT_IMAGE_URL);
  const [hasImageError, setHasImageError] = useState(false);
  const [typedPreferenceValue, setTypedPreferenceValue] = useState("");

  const isMicListeningRef = useRef(isMicListening);
  const requestInFlightRef = useRef(false);
  const recognitionStartedAtRef = useRef<number | null>(null);

  const promptSpeechText = `마이크 버튼을 누르고\n내가 좋아하는 ${mapCategoryToPromptNoun(category)}을 말해 주세요`;
  const exampleLines = CATEGORY_EXAMPLES[category] || ["치킨이 좋아요", "토끼가 귀여워요"];

  useEffect(() => {
    isMicListeningRef.current = isMicListening;
  }, [isMicListening]);

  useEffect(() => {
    initializeVoiceRecognitionHandlers();
    return () => {
      VoiceUtil.destroyRecognizer();
    };
  }, []);

  // Always prefetch the latest image URL so the UI shows something even if the remote image fails.
  useEffect(() => {
    let isMounted = true;
    const preloadImage = async () => {
      const uri = (generatedImageUrl || "").trim();
      if (!uri) return;
      try {
        await Image.prefetch(uri);
        if (isMounted) {
          setHasImageError(false);
        }
      } catch (err) {
        if (isMounted && uri !== DEFAULT_IMAGE_URL) {
          setHasImageError(true);
          setGeneratedImageUrl(DEFAULT_IMAGE_URL);
        }
      }
    };

    preloadImage();
    return () => {
      isMounted = false;
    };
  }, [generatedImageUrl]);

  // ----------------------------------------
  // 음성인식 핸들러 세팅
  // ----------------------------------------
  const initializeVoiceRecognitionHandlers = () => {
    VoiceUtil.cleanup();

    VoiceUtil.setSpeechResultCallback(async (results) => {
      const recognizedText = (results?.[0] ?? "").trim();
      console.log("Speech results:", results, "recognized:", recognizedText);

      const startedAt = recognitionStartedAtRef.current;
      const now = Date.now();
      const elapsed = startedAt ? now - startedAt : null;

      if (!recognizedText) {
        if (elapsed !== null && elapsed < MIN_RECOGNITION_WAIT_MS) {
          console.log("Empty recognition result within grace period, ignoring alert");
          setIsMicListening(false);
          isMicListeningRef.current = false;
          recognitionStartedAtRef.current = null;
          return;
        }

        Alert.alert("알림", "음성을 인식하지 못했습니다. 다시 시도해 주세요.");
        setIsMicListening(false);
        isMicListeningRef.current = false;
        recognitionStartedAtRef.current = null;
        return;
      }

      setTypedPreferenceValue(recognizedText);
      setIsMicListening(false);
      isMicListeningRef.current = false;
      recognitionStartedAtRef.current = null;

      await submitPreferenceToServer(recognizedText);
    });

    VoiceUtil.setErrorCallback((error) => {
      console.log("Speech recognition error:", error);

      if (!isMicListeningRef.current) {
        console.log("Ignoring speech error because mic is not active");
        return;
      }

      const rawCode = error?.error?.code ?? error?.code;
      const errorCode = String(rawCode);

      const startedAt = recognitionStartedAtRef.current;
      const now = Date.now();
      const elapsed = startedAt ? now - startedAt : null;

      if (elapsed !== null && elapsed < MIN_RECOGNITION_WAIT_MS) {
        console.log("Ignoring early noise error");
        setIsMicListening(false);
        isMicListeningRef.current = false;
        recognitionStartedAtRef.current = null;
        return;
      }

      let errorMessage = "음성 인식에 실패했습니다.";
      let shouldAlert = true;

      switch (errorCode) {
        case "7":
        case "11":
        case "13":
        case "5":
        case "8":
          shouldAlert = false;
          break;
        case "6":
          errorMessage = "음성이 들리지 않습니다. 마이크 권한을 확인해 주세요.";
          break;
        case "9":
          errorMessage = "권한이 거부되었습니다. 설정에서 마이크 권한을 허용해 주세요.";
          break;
        default:
          errorMessage = "음성 인식 중 오류가 발생했습니다. 다시 시도해 주세요.";
      }

      if (shouldAlert) {
        Alert.alert("음성 인식 오류", errorMessage);
      }

      setIsMicListening(false);
      isMicListeningRef.current = false;
      recognitionStartedAtRef.current = null;
    });
  };

  // ----------------------------------------
  // 서버 전송
  // ----------------------------------------
  const submitPreferenceToServer = async (value: string) => {
    if (!userId || !isValidCategory(category)) {
      Alert.alert("오류", "로그인이 필요합니다. 처음 화면으로 돌아가 다시 시도해주세요.");
      navigation.navigate("LoginScreen");
      return;
    }

    if (requestInFlightRef.current) {
      console.log("Request already in flight - skipping duplicate");
      return;
    }

    requestInFlightRef.current = true;
    const requestBody = createPreferenceRequestBody(category, value);

    console.log("Sending:", requestBody);
    showGenerationOverlay();

    try {
      const response = await api.post("/preferences", requestBody);
      const data = response.data;
      console.log("Response data:", data);

      if (!data.keyword || !data.image_url) {
        throw new Error("서버 응답 데이터가 올바르지 않습니다.");
      }

      setRecognizedKeyword(data.keyword);
      setTypedPreferenceValue(data.keyword);
      const cleanedImageUrl = (data.image_url || "").trim();
      setGeneratedImageUrl(cleanedImageUrl || DEFAULT_IMAGE_URL);
      setIsCollectingPreferenceInput(false);
    } catch (error: any) {
      console.error("Error during fetch operation:", error);
      presentRequestError(error);
    } finally {
      setIsMicListening(false);
      isMicListeningRef.current = false;
      hideGenerationOverlay();
      requestInFlightRef.current = false;
    }
  };

  const presentRequestError = (error: any) => {
    let userMessage =
      error?.response?.data?.message ||
      error?.message ||
      "오류가 발생했습니다. 네트워크 연결을 확인해 주세요.";

    Alert.alert("오류", userMessage);
  };

  // ----------------------------------------
  // 음성 인식 토글
  // ----------------------------------------
  const toggleSpeechRecognition = async () => {
    console.log("=== toggleSpeechRecognition called ===");
    console.log("Current isMicListening state:", isMicListeningRef.current);

    if (isMicListeningRef.current) {
      console.log("⏹️ Stopping speech recognition...");
      try {
        await VoiceUtil.stopListening();
      } catch (e) {
        console.log("Failed to stop listening:", e);
      }
      setIsMicListening(false);
      isMicListeningRef.current = false;
      recognitionStartedAtRef.current = null;
      return;
    }

    console.log("🎤 Starting speech recognition...");
    try {
      await VoiceUtil.cleanup();
      await VoiceUtil.startListening();
      setIsMicListening(true);
      isMicListeningRef.current = true;
      recognitionStartedAtRef.current = Date.now();
      console.log("✅ Voice listening started");
    } catch (error) {
      console.error("❌ Failed to start listening:", error);
      Alert.alert("오류", "음성 인식을 시작할 수 없습니다.");
      setIsMicListening(false);
      isMicListeningRef.current = false;
      recognitionStartedAtRef.current = null;
    }
  };

  const goToNextScreen = () => {
    updateCategory(category);
    navigation.navigate("LyricSelectScreen", { userId });
  };

  const resetToInputMode = () => {
    setIsCollectingPreferenceInput(true);
    setRecognizedKeyword("");
    setTypedPreferenceValue("");
    setGeneratedImageUrl(DEFAULT_IMAGE_URL);
  };

  const showGenerationOverlay = () => setIsGenerationOverlayVisible(true);
  const hideGenerationOverlay = () => setIsGenerationOverlayVisible(false);

  const handleManualInputSubmit = async () => {
    const trimmed = typedPreferenceValue.trim();
    if (!trimmed) {
      Alert.alert("입력 오류", "내용을 입력해 주세요.");
      return;
    }
    await submitPreferenceToServer(trimmed);
  };

  // ----------------------------------------
  // UI
  // ----------------------------------------
  return (
    <View style={[BaseStyles.flexContainer, { backgroundColor: "#A5BEDF" }]}>
      <Header />

      <View style={[BaseStyles.contentContainer]}>
        {/* 상단 질문 영역 */}
        <View style={[BaseStyles.topContainer, { justifyContent: "center", alignItems: "center" }]}>
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>
              내가 좋아하는 {mapCategoryToPromptNoun(category)}는 무엇인가요?
            </Text>
          </View>

          <View style={styles.selectedHabitsContainer}>
            <View style={styles.habitsTagWrapper}>
        
            </View>
          </View>
        </View>

        {/* 중간 입력/결과 영역 */}
        <View style={[BaseStyles.middleContainer]}>
          {isCollectingPreferenceInput ? (
            <View style={styles.inputContainer}>
              {/* 음성 입력 */}
              <View style={styles.voiceSection}>
                <TouchableOpacity
                  onPress={toggleSpeechRecognition}
                  style={[styles.micButton, isMicListening && styles.micButtonRecording]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.micIconOuter, isMicListening && styles.micIconOuterRecording]}>
                    <View style={[styles.micIconInner, isMicListening && styles.micIconInnerRecording]}>
                      <Text style={styles.micIcon}>🎤</Text>
                    </View>
                  </View>
                  {isMicListening && <View style={styles.recordingPulse} />}
                </TouchableOpacity>

                <Text style={styles.instructionText}>{promptSpeechText}</Text>
              </View>

              {/* 구분선 */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>또는</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* 텍스트 입력 + 예시 */}
              <View style={styles.textInputSection}>
                <TextInput
                  style={styles.textInput}
                  placeholder="직접 입력하기"
                  placeholderTextColor="#999"
                  value={typedPreferenceValue}
                  onChangeText={setTypedPreferenceValue}
                  keyboardType="default"
                  returnKeyType="done"
                  multiline
                  textAlign="center"
                />

                <View style={styles.exampleContainer}>
                  <Text style={styles.exampleLabel}>예시:</Text>
                  {exampleLines.map((line, index) => (
                    <Text key={index} style={styles.exampleText}>
                      {line}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            // 결과 영역
            <View style={styles.imageContainer}>
              <View style={styles.answerCard}>
              <View style={styles.answerHeader}>
                <View style={styles.iconCircle}>
                  <Text style={styles.iconText}>✓</Text>
                </View>
                <Text style={styles.answerLabel}>AI가 만들어준 사진과 키워드</Text>
              </View>

              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: generatedImageUrl }}
                  style={styles.generatedImage}
                  resizeMode="cover"
                  onError={() => {
                    if (generatedImageUrl !== DEFAULT_IMAGE_URL) {
                      setHasImageError(true);
                      setGeneratedImageUrl(DEFAULT_IMAGE_URL);
                    }
                  }}
                />
                {hasImageError && (
                  <Text style={styles.errorText}>이미지를 불러오지 못해 기본 이미지를 표시합니다.</Text>
                )}
              </View>

                <View style={styles.answerContent}>
                  <Text style={styles.answerText}>{recognizedKeyword ? `'${recognizedKeyword}'` : ""}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* 하단 버튼 */}
        <View style={[BaseStyles.bottomContainer, styles.bottom]}>
          <TouchableOpacity
            style={[styles.navButton, styles.prevButton]}
            onPress={isCollectingPreferenceInput ? () => navigation.goBack() : resetToInputMode}
          >
            <Text style={[BaseStyles.mainText, styles.navButtonText]}>
              {isCollectingPreferenceInput ? "이전" : "다시 입력"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.nextButton]}
            onPress={isCollectingPreferenceInput ? handleManualInputSubmit : goToNextScreen}
            activeOpacity={0.85}
          >
            <Text style={[BaseStyles.mainText, styles.navButtonText]}>
              {isCollectingPreferenceInput ? "완료" : "가사 만들기"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 사진 생성 팝업 */}
      {isGenerationOverlayVisible && (
        <View style={[styles.popupBg, { backgroundColor: "#A5BEDF", flex: 1 }]}>
          <Header />

          <View style={[BaseStyles.topContainer, { height: "10%" }]}>
            <Text style={[BaseStyles.mainText, styles.title]}>사진 생성 중</Text>
          </View>

          <View style={[BaseStyles.contentContainer, styles.centerContainer]}>
            <View style={styles.indicatorContainer}>
              <BallIndicator style={styles.ballIndicator} size={40} color="#FFFFFF" />
              <Text style={[BaseStyles.mainText, styles.centerMessage]}>
                {"조금만 기다리면 AI가 만들어준\n멋진 사진이 짜잔~하고\n나타날 거예요! 🚀"}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // 상단 질문 영역
  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 340,
  },
  questionText: {
    fontSize: 20,
    fontFamily: "Jua-Regular",
    color: "#333",
    textAlign: "center",
    letterSpacing: 1.3,
    lineHeight: 30,
  },
  selectedHabitsContainer: {
    marginTop: 15,
    alignItems: "center",
  },
  selectedHabitsLabel: {
    fontSize: 14,
    fontFamily: "Jua-Regular",
    color: "#2D3748",
    marginBottom: 8,
    letterSpacing: 1,
  },
  habitsTagWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    maxWidth: 350,
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
    paddingHorizontal: 24,
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

  // 결과 카드
  imageContainer: {
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    width: "100%",
  },
  answerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    width: 340,
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
  imageWrapper: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  generatedImage: {
    width: 240,
    height: 240,
    borderRadius: 12,
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: "#D14343",
    textAlign: "center",
  },
  answerContent: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 20,
    minHeight: 80,
    justifyContent: "center",
  },
  answerText: {
    fontSize: 20,
    fontFamily: "Jua-Regular",
    color: "#333",
    lineHeight: 32,
    letterSpacing: 1.5,
    textAlign: "center",
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
    width: 135,
    height: 62,
    borderRadius: 22,
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

  // 팝업
  title: {
    fontSize: 35,
    lineHeight: 90,
  },
  popupBg: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(150,150,150,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  indicatorContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  ballIndicator: {
    position: "absolute",
    top: -80,
  },
  centerMessage: {
    fontSize: 24,
    textAlign: "center",
  },
});

// ----------------------------------------
// Helper Functions
// ----------------------------------------

const mapCategoryToHeaderLabel = (category: PreferenceCategory) =>
  CATEGORY_HEADER_LABELS[category] || "내가 좋아하는 카테고리";

const mapCategoryToPromptNoun = (category: PreferenceCategory) =>
  CATEGORY_PROMPT_NOUNS[category] || "카테고리";

const createPreferenceRequestBody = (field: PreferenceCategory, value: string) => ({
  field,
  value: value.trim(),
});

const isValidCategory = (field?: string): field is PreferenceCategory =>
  field !== undefined && VALID_CATEGORIES.includes(field as PreferenceCategory);

export default LyricMakeScreen;
