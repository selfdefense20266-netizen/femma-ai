/**
 * Windows-only: keep React Native CMake/Ninja under CMAKE_OBJECT_PATH_MAX (250)
 * and MAX_PATH (260) when LongPathsEnabled is off.
 *
 * Cause: this repo path + pnpm nests make object dirs like
 *   .../app/.cxx/.../safeareacontext.dir/D_/.../ComponentDescriptors.cpp.o
 * exceed 260 chars. Ninja then fails with "No such file or directory" on mkdir.
 *
 * Fix:
 * 1) D:\a  -> android/app          (short Gradle projectDir / .cxx root)
 * 2) D:\n\* -> native package roots (short autolinking / codegen source paths)
 *
 * Invoked from android/settings.gradle on Windows. Safe to re-run.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

if (process.platform !== 'win32') {
  process.exit(0);
}

const appRoot = path.resolve(__dirname, '..');
const androidApp = path.join(appRoot, 'android', 'app');
const shortRoot = 'D:\\n';
const shortApp = 'D:\\a';

function resolvePkg(request, fromPkg) {
  const opts = fromPkg
    ? { paths: [require.resolve(`${fromPkg}/package.json`, { paths: [appRoot] })] }
    : { paths: [appRoot] };
  return path.dirname(require.resolve(`${request}/package.json`, opts));
}

const packages = [
  ['w', () => resolvePkg('react-native-worklets')],
  ['r', () => resolvePkg('react-native-reanimated')],
  ['e', () => resolvePkg('expo-modules-core', 'expo')],
  ['s', () => resolvePkg('react-native-screens')],
  ['g', () => resolvePkg('react-native-gesture-handler')],
  ['a', () => resolvePkg('@react-native-async-storage/async-storage')],
  ['k', () => resolvePkg('react-native-keyboard-controller')],
  ['sa', () => resolvePkg('react-native-safe-area-context')],
  ['svg', () => resolvePkg('react-native-svg')],
];

function readlinkSafe(p) {
  try {
    return fs.readlinkSync(p);
  } catch {
    return null;
  }
}

function ensureDir(p) {
  // Don't mkdir drive roots (D:\) — EPERM on Windows.
  const normalized = path.resolve(p);
  const root = path.parse(normalized).root;
  if (normalized.toLowerCase() === root.toLowerCase().replace(/\\$/, '') ||
      normalized.toLowerCase() === root.toLowerCase()) {
    return;
  }
  if (normalized.length <= 3) return;
  fs.mkdirSync(normalized, { recursive: true });
}

function rmdirCmd(p) {
  try {
    execFileSync('cmd.exe', ['/c', 'rmdir', '/S', '/Q', p], {
      stdio: 'ignore',
      windowsHide: true,
    });
  } catch {
    /* ignore */
  }
}

function ensureJunction(link, target) {
  ensureDir(path.dirname(link));
  const absTarget = path.resolve(target);
  if (!fs.existsSync(absTarget)) {
    throw new Error(`[short-paths] target missing: ${absTarget}`);
  }

  if (fs.existsSync(link)) {
    const current = readlinkSafe(link);
    if (current) {
      const normalized = path.resolve(path.dirname(link), current);
      if (normalized.toLowerCase() === absTarget.toLowerCase()) {
        return;
      }
      rmdirCmd(link);
    } else {
      rmdirCmd(link);
      if (fs.existsSync(link)) {
        throw new Error(
          `[short-paths] cannot replace ${link} (locked). Run: .\\gradlew.bat --stop then rebuild.`
        );
      }
    }
  }

  execFileSync('cmd.exe', ['/c', 'mklink', '/J', link, absTarget], {
    stdio: 'pipe',
    windowsHide: true,
  });
  console.log(`[short-paths] ${link} -> ${absTarget}`);
}

ensureDir(shortRoot);
ensureJunction(shortApp, androidApp);

for (const [name, resolve] of packages) {
  let target;
  try {
    target = resolve();
  } catch (err) {
    console.warn(`[short-paths] skip ${name}: ${err.message}`);
    continue;
  }
  ensureJunction(path.join(shortRoot, name), target);
}

// Prefer a real short .cxx under D:\a (not a nested junction through the long path).
// If an old D:\cxx junction exists at android/app/.cxx, replace it with a normal folder
// after projectDir is D:\a — AGP will then -C into D:\a\.cxx\... (<50 chars).
const cxxViaLongPath = path.join(androidApp, '.cxx');
const cxxLink = readlinkSafe(cxxViaLongPath);
if (cxxLink) {
  rmdirCmd(cxxViaLongPath);
  console.log('[short-paths] removed legacy app\\.cxx junction (use D:\\a\\.cxx)');
}
