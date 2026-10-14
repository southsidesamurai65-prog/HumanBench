#!/usr/bin/env bash
# Build a debug APK (needs Node, JDK and the Android SDK installed).
# The APK ends up at android/app/build/outputs/apk/debug/app-debug.apk
set -e
cd "$(dirname "$0")/.."

echo "[1/3] assembling web -> www/"
bash scripts/build-web.sh

echo "[2/3] syncing into the android project"
npx cap sync android

echo "[3/3] gradle assembleDebug"
cd android
./gradlew assembleDebug
echo
echo "APK: android/app/build/outputs/apk/debug/app-debug.apk"
