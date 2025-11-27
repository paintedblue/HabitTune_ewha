import Voice from '@wdragon/react-native-voice';

type SpeechCallback = (value: string[]) => void;
type ErrorCallback = (value: any) => void;

class VoiceUtil {
  private speechResultCallback?: SpeechCallback;
  private errorCallback?: ErrorCallback;

  constructor() {
    this.onSpeechStart = this.onSpeechStart.bind(this);
    this.onSpeechRecognized = this.onSpeechRecognized.bind(this);
    this.onSpeechResults = this.onSpeechResults.bind(this);
    this.onSpeechError = this.onSpeechError.bind(this);

    Voice.onSpeechStart = this.onSpeechStart;
    Voice.onSpeechRecognized = this.onSpeechRecognized;
    Voice.onSpeechResults = this.onSpeechResults;
    Voice.onSpeechError = this.onSpeechError;
  }
  
  setSpeechResultCallback(callback: SpeechCallback){
    this.speechResultCallback = callback;
  }
  
  setErrorCallback(callback: ErrorCallback){
    this.errorCallback = callback;
  }

  async startListening() {
    try {
      await Voice.start('ko-KR');
    } catch (error) {
      console.error('Voice start failed: ', error);
      if (this.errorCallback) {
        this.errorCallback(error);
      }
    }
  }

  stopListening() {
    Voice.stop();
  }

  destroyRecognizer() {
    Voice.destroy().then(Voice.removeAllListeners);
  }

  onSpeechStart(e) {
    console.log('onSpeechStart: ', e);
  }

  onSpeechRecognized(e) {
    console.log('onSpeechRecognized: ', e);
  }

  onSpeechResults(e) {
    console.log('onSpeechResults: ', e);
    const { value } = e;
    if (value && value.length > 0 && this.speechResultCallback) {
      this.speechResultCallback(value);
    }
  }

  onSpeechError(e) {
    console.log('onSpeechError: ', e);

    const  error = e;
    if (error && this.errorCallback) {
      this.errorCallback(error);
    }
  }
}

export default new VoiceUtil();