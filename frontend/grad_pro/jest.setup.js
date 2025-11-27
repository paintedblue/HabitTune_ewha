require('react-native-gesture-handler/jestSetup');

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('@wdragon/react-native-voice', () => {
  const voiceMock = {
    start: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
    destroy: jest.fn(() => Promise.resolve()),
    removeAllListeners: jest.fn(),
    onSpeechStart: jest.fn(),
    onSpeechRecognized: jest.fn(),
    onSpeechResults: jest.fn(),
    onSpeechError: jest.fn(),
  };

  return voiceMock;
});

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
