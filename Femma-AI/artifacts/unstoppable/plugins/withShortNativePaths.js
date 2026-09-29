const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'Short Windows paths so CMake/Ninja';
const BLOCK = `
// Windows: Auto-create D:\\a (app) + D:\\n\\* package junctions so CMake/Ninja
// stay under MAX_PATH / CMAKE_OBJECT_PATH_MAX with LongPathsEnabled off.
if (System.getProperty("os.name").toLowerCase().contains("windows")) {
  def ensureScript = new File(rootDir, "../scripts/ensure-windows-short-paths.cjs")
  if (ensureScript.exists()) {
    def proc = new ProcessBuilder("node", ensureScript.absolutePath)
      .directory(new File(rootDir, ".."))
      .redirectErrorStream(true)
      .start()
    def out = proc.inputStream.getText("UTF-8")
    def code = proc.waitFor()
    if (out?.trim()) println out.trim()
    if (code != 0) {
      throw new GradleException("ensure-windows-short-paths failed (exit \${code}). \${out}")
    }
  }
}

// Point :app at D:\\a so .cxx object dirs are short (see ensure-windows-short-paths.cjs).
def shortApp = new File('D:/a')
if (shortApp.exists()) {
  project(':app').projectDir = shortApp
}

// Short Windows paths so CMake/Ninja stay under the 250-char object-path limit.
// Junctions are created by scripts/ensure-windows-short-paths.cjs (see settings.gradle).
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
def shortSafeArea = new File('D:/n/sa/android')
if (shortSafeArea.exists()) {
  project(':react-native-safe-area-context').projectDir = shortSafeArea
}
def shortSvg = new File('D:/n/svg/android')
if (shortSvg.exists()) {
  project(':react-native-svg').projectDir = shortSvg
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
