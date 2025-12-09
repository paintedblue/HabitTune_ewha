import { PermissionsAndroid, Platform } from "react-native";
import Voice from "@wdragon/react-native-voice";

/**
 * VoiceUtil
 * Thin wrapper around @wdragon/react-native-voice that exposes predictable callbacks and
 * simple error handling. 자동 재시도(autop-retry)는 제거한 버전.
 */

type SpeechCallback = (value: string[]) => void;
type ErrorCallback = (value: any) => void;

// "너무 일찍" 난 에러는 그냥 조용히 무시하기 위한 기준 시간들
const EARLY_NO_MATCH_THRESHOLD_MS = 3500;
const EARLY_CLIENT_ERROR_THRESHOLD_MS = 2000;
const EARLY_IGNORE_ERROR_11_THRESHOLD_MS = 2000;
const MAX_AUTO_RETRY = 0;
const AUTO_RETRY_DELAY_MS = 600;
const SESSION_COOLDOWN_MS = 300;

class VoiceUtil {
  private speechResultCallback?: SpeechCallback;
  private errorCallback?: ErrorCallback;
  private isListening = false;
  private isStarting = false;
  private manualStopRequested = false;
  private lastResultSent = false;
  private startTimestamp = 0;
  private lastPartialResults: string[] = [];
  private retryCount = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private resetInProgress = false;
  private lastSessionTimestamp = 0;

  constructor() {
    this.attachVoiceListeners();
  }

  /**
   * Register a callback to receive final speech recognition results.
   */
  setSpeechResultCallback(callback: SpeechCallback) {
    this.speechResultCallback = callback;
  }

  /**
   * Register a callback to receive errors surfaced by the native voice SDK.
   */
  setErrorCallback(callback: ErrorCallback) {
    this.errorCallback = callback;
  }

  /**
   * Start speech recognition (no auto-retry).
   */
  async startListening() {
    try {
      if (this.isListening || this.isStarting) {
        console.log("Already listening, ignoring start request");
        return;
      }

      const now = Date.now();
      if (now - this.lastSessionTimestamp < SESSION_COOLDOWN_MS) {
        console.log("Ignoring start due to cooldown");
        return;
      }
      this.lastSessionTimestamp = now;

      this.manualStopRequested = false;
      this.isStarting = true;
      this.retryCount = 0;
      this.clearRetryTimer();

      await this.ensureAndroidMicPermission();
      await this.destroyAndReattachListeners();
      await this.cleanup(); // 이전 세션 정리

      console.log("Starting voice recognition...");
      this.resetPartialResults();

      // 실제로 시작하기 직전에 타임스탬프 기록
      this.startTimestamp = Date.now();

      await Voice.start("ko-KR", {
        EXTRA_PARTIAL_RESULTS: true,
        EXTRA_MAX_RESULTS: 5,
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 2000,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 2000,
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 1200,
      });

      this.isListening = true;
      this.isStarting = false;
      console.log("Voice.start issued (ko-KR)");
    } catch (error) {
      console.error("Error starting voice recognition:", error);
      this.isListening = false;
      this.isStarting = false;
      this.startTimestamp = 0;
      throw error;
    }
  }

  /**
   * Stop speech recognition.
   */
  async stopListening() {
    try {
      console.log("Stopping voice recognition...");
      this.manualStopRequested = true;
      this.clearRetryTimer();

      try {
        await Voice.stop();
      } catch (err) {
        console.log("stopListening: stop failed, attempting cancel", err);
      }

      try {
        await Voice.cancel();
      } catch (err) {
        console.log("stopListening: cancel failed", err);
      }

      this.isListening = false;
      this.isStarting = false;
      this.startTimestamp = 0;
      this.resetPartialResults();
    } catch (error) {
      console.error("Error stopping voice recognition:", error);
      this.isListening = false;
    }
  }

  /**
   * Cancel any active recognition session and clear transient state.
   */
  async cleanup() {
    try {
      await Voice.stop();
    } catch (error) {
      console.log("Cleanup stop - maybe not listening");
    }

    try {
      await Voice.cancel();
    } catch (error) {
      console.log("Cleanup - no active recognition");
    }

    this.resetPartialResults();
    this.isListening = false;
    this.isStarting = false;
    this.startTimestamp = 0;
    this.manualStopRequested = false;
    this.retryCount = 0;
    this.clearRetryTimer();
    this.lastSessionTimestamp = Date.now();
  }

  private async hardResetRecognizer() {
    if (this.resetInProgress) {
      return;
    }
    this.resetInProgress = true;
    try {
      await Voice.destroy();
      Voice.removeAllListeners();
      this.attachVoiceListeners();
    } catch (error) {
      console.log("hardResetRecognizer error:", error);
    } finally {
      this.resetInProgress = false;
      this.resetPartialResults();
      this.isListening = false;
      this.isStarting = false;
      this.startTimestamp = 0;
      this.manualStopRequested = false;
      this.retryCount = 0;
      this.clearRetryTimer();
      this.lastSessionTimestamp = Date.now();
    }
  }

  /**
   * Destroy the underlying recognizer and reset callbacks/listeners.
   */
  async destroyRecognizer() {
    try {
      console.log("Destroying voice recognizer...");
      await Voice.destroy();
      Voice.removeAllListeners();
      this.attachVoiceListeners();
      this.isListening = false;
      this.speechResultCallback = undefined;
      this.errorCallback = undefined;
      this.resetPartialResults();
      this.lastResultSent = false;
      this.manualStopRequested = false;
      this.startTimestamp = 0;
      this.retryCount = 0;
      this.clearRetryTimer();
    } catch (error) {
      console.error("Error destroying voice recognition:", error);
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  // ---- Internal helpers --------------------------------------------------

  private resetPartialResults() {
    this.lastPartialResults = [];
    this.lastResultSent = false;
  }

  private async ensureAndroidMicPermission() {
    if (Platform.OS !== "android") {
      return;
    }
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
      title: "마이크 권한이 필요합니다",
      message: "음성 인식을 위해 마이크 권한이 필요합니다.",
      buttonPositive: "확인",
    });

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error("마이크 권한이 거부되었습니다.");
    }
  }

  private attachVoiceListeners() {
    Voice.onSpeechStart = this.onSpeechStart;
    Voice.onSpeechRecognized = this.onSpeechRecognized;
    Voice.onSpeechResults = this.onSpeechResults;
    Voice.onSpeechPartialResults = this.onSpeechPartialResults;
    Voice.onSpeechError = this.onSpeechError;
    Voice.onSpeechEnd = this.onSpeechEnd;
  }

  private onSpeechStart = (event: any) => {
    console.log("onSpeechStart: ", event);
    this.isListening = true;
    this.manualStopRequested = false;

    // 혹시라도 startTimestamp가 비어 있으면 이 시점 기준으로
    if (!this.startTimestamp) {
      this.startTimestamp = Date.now();
    }
  };

  private onSpeechRecognized = (event: any) => {
    console.log("onSpeechRecognized: ", event);
    this.isListening = true;
    this.isStarting = false;
  };

  private onSpeechEnd = (event: any) => {
    console.log("onSpeechEnd: ", event);
    this.isListening = false;
    this.manualStopRequested = false;
    this.retryCount = 0;
    this.clearRetryTimer();

    if (!this.lastResultSent && this.lastPartialResults.length > 0 && this.speechResultCallback) {
      console.log("Using partial results on speech end");
      this.lastResultSent = true;
      this.speechResultCallback(this.lastPartialResults);
    }
  };

  private onSpeechPartialResults = (event: any) => {
    const { value } = event || {};
    if (value && value.length > 0) {
      this.lastPartialResults = value;
      console.log("onSpeechPartialResults:", value);
    }
  };

  private onSpeechResults = (event: any) => {
    console.log("onSpeechResults: ", event);
    const { value } = event || {};
    if (!this.speechResultCallback) {
      return;
    }

    const results =
      (value && value.length > 0 ? value : undefined) ??
      (this.lastPartialResults.length > 0 ? this.lastPartialResults : []);

    this.lastPartialResults = results;
    this.lastResultSent = true;
    this.retryCount = 0;
    this.clearRetryTimer();
    console.log("Delivering speech results:", results);
    this.speechResultCallback(results);
  };

  private onSpeechError = (event: any) => {
    console.log("onSpeechError: ", event);
    this.isListening = false;
    this.isStarting = false;
    this.clearRetryTimer();

    if (this.manualStopRequested) {
      console.log("Ignoring error after manual stop");
      this.manualStopRequested = false;
      return;
    }

    const rawCode = event?.error?.code ?? event?.code;
    const errorCode = String(rawCode);
    const sinceStart = this.startTimestamp ? Date.now() - this.startTimestamp : Number.MAX_SAFE_INTEGER;
    const noResultYet = !this.lastResultSent && this.lastPartialResults.length === 0;

    // RecognitionService busy → 걍 무시
    if (errorCode === "8") {
      console.log("RecognitionService busy - ignoring");
      return;
    }

    // No match / didn't understand 이지만 partial 결과는 있는 경우 → 그걸 결과로 사용
    if ((errorCode === "7" || errorCode === "11") && this.lastPartialResults.length > 0) {
      console.log("Using partial results after no-match error");
      this.lastResultSent = true;
      this.speechResultCallback?.(this.lastPartialResults);
      return;
    }

    // 너무 이른 No match / client error → 조용히 무시 (UI에 안 올리고, 자동 재시도도 안 함)
    const isEarlyNoMatch =
      (errorCode === "11" || errorCode === "7") &&
      noResultYet &&
      sinceStart < EARLY_NO_MATCH_THRESHOLD_MS;
    const isEarlyClientError = errorCode === "5" && sinceStart < EARLY_CLIENT_ERROR_THRESHOLD_MS;

    if (isEarlyNoMatch || isEarlyClientError) {
      console.log(`Early transient error ${errorCode} (sinceStart=${sinceStart}ms)`);
      this.startTimestamp = 0;
      if (!this.scheduleRetry(event)) {
        this.errorCallback?.(event);
      }
      return;
    }

    // 코드 11도 아주 이른 시점이면 자동 재시도 시도
    if (errorCode === "11" && !this.lastResultSent && sinceStart < EARLY_IGNORE_ERROR_11_THRESHOLD_MS) {
      console.log("Early 11 error (no speech yet) - attempting retry");
      this.isListening = false;
      this.isStarting = false;
      this.startTimestamp = 0;
      if (!this.scheduleRetry(event)) {
        this.errorCallback?.(event);
      }
      return;
    }

    // 여기까지 왔다 = 진짜 실패 → UI 쪽으로 에러 전달
    const shouldAutoRetry =
      !this.manualStopRequested &&
      noResultYet &&
      this.retryCount < MAX_AUTO_RETRY &&
      errorCode !== "6" &&
      errorCode !== "9";

    if (shouldAutoRetry && this.scheduleRetry(event)) {
      return;
    }

    if (event && this.errorCallback) {
      this.errorCallback(event);
    }

    // 강제 리셋으로 다음 시도 안정화
    this.hardResetRecognizer();
  };

  private clearRetryTimer() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private scheduleRetry(event: any): boolean {
    if (this.retryCount >= MAX_AUTO_RETRY) {
      console.log("Retry limit reached");
      return false;
    }

    this.retryCount += 1;
    console.log(`Auto retrying voice recognition (#${this.retryCount}) after error ${event?.error?.code ?? "unknown"}`);
    this.clearRetryTimer();
    this.isListening = false;
    this.isStarting = false;
    this.resetPartialResults();
    this.retryTimer = setTimeout(async () => {
      try {
        await this.cleanup();
        await this.startListening();
      } catch (retryError) {
        console.log("Auto retry failed", retryError);
        this.errorCallback?.(event);
      }
    }, AUTO_RETRY_DELAY_MS);

    return true;
  }

  // Voice listener 재부착을 통해 중복 리스너/세션 꼬임 방지
  private async destroyAndReattachListeners() {
    try {
      await Voice.destroy();
    } catch (error) {
      console.log("destroyAndReattachListeners: destroy error", error);
    }
    try {
      Voice.removeAllListeners();
    } catch (error) {
      console.log("destroyAndReattachListeners: removeAllListeners error", error);
    }
    this.attachVoiceListeners();
  }
}

export default new VoiceUtil();
