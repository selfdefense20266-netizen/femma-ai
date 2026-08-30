const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'Short Windows paths so CMake/Ninja';
const BLOCK = `
// Short Windows paths so CMake/Ninja stay under the 250-char object-path limit.
def shortWorklets = new File('D:/n/w/android')
def shortReanimated = new File('D:/n/r/android')
if (shortWorklets.exists()) {
  project(':react-native-worklets').projectDir = shortWorklets
}
if (shortReanimated.exists()) {
  project(':react-native-reanimated').projectDir = shortReanimated
}
def shortExpoCore = new File('D:/n/e/android')
if (shortExpoCore.exists()) {
  project(':expo-modules-core').projectDir = shortExpoCore
}
def shortScreens = new File('D:/n/s/android')
if (shortScreens.exists()) {
  project(':react-native-screens').projectDir = shortScreens
}
def shortGestures = new File('D:/n/g/android')
if (shortGestures.exists()) {
  project(':react-native-gesture-handler').projectDir = shortGestures
}
def shortAsyncStorage = new File('D:/n/a/android')
if (shortAsyncStorage.exists()) {
  project(':react-native-async-storage_async-storage').projectDir = shortAsyncStorage
}
def shortKeyboard = new File('D:/n/k/android')
if (shortKeyboard.exists()) {
  project(':react-native-keyboard-controller').projectDir = shortKeyboard
}
`;

function withShortNativePaths(config) {
  return withDangerousMod(config, [
    'android',
    async (mod) => {
      const settingsPath = path.join(mod.modRequest.platformProjectRoot, 'settings.gradle');
      if (!fs.existsSync(settingsPath)) return mod;
      const current = fs.readFileSync(settingsPath, 'utf8');
      if (current.includes(MARKER)) return mod;
      fs.writeFileSync(settingsPath, `${current.trimEnd()}\n${BLOCK}\n`);
      return mod;
    },
  ]);
}

module.exports = withShortNativePaths;
