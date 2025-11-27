module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  moduleNameMapper: {
    '\\.(png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-reanimated|@react-native-community|@react-native-masked-view|react-native-linear-gradient|react-native-audio-recorder-player)/)',
  ],
};
