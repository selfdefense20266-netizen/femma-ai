@echo off
setlocal EnableDelayedExpansion
set TEMP=D:\femmi\tmp
set TMP=D:\femmi\tmp
if not exist D:\femmi\tmp mkdir D:\femmi\tmp
if not exist D:\femmi\n mkdir D:\femmi\n

echo [1/4] Freeing C: by deleting C:\f ...
if exist C:\f rmdir /s /q C:\f

echo [2/4] Preparing short worklets path ...
if exist C:\n\worklets\package.json if not exist D:\femmi\n\worklets\package.json (
  robocopy C:\n\worklets D:\femmi\n\worklets /E /XD .cxx build .gradle
)

set "SRC="
for /d %%D in ("D:\femmi\femma-ai\Femma-AI\node_modules\.pnpm\react-native-worklets@*") do (
  set "SRC=%%D\node_modules\react-native-worklets"
)

if defined SRC (
  if not exist D:\femmi\n\worklets\package.json (
    robocopy "!SRC!" D:\femmi\n\worklets /E /XD .cxx build .gradle
  )
  echo SRC=!SRC!
  if exist "!SRC!\package.json" (
    if not exist "!SRC!.bak" move "!SRC!" "!SRC!.bak"
  )
  if not exist "!SRC!" mklink /J "!SRC!" D:\femmi\n\worklets
)

echo [3/4] Building release APK ...
cd /d D:\femmi\femma-ai\Femma-AI\artifacts\unstoppable\android
call gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon
set ERR=!ERRORLEVEL!

echo [4/4] Done exit=!ERR!
if exist app\build\outputs\apk\release\app-release.apk (
  echo APK READY:
  echo D:\femmi\femma-ai\Femma-AI\artifacts\unstoppable\android\app\build\outputs\apk\release\app-release.apk
)
exit /b !ERR!
