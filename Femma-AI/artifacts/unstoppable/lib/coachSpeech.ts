import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const MUTE_KEY = 'femma-coach-speech-muted';

let muted = false;
let hydrated = false;
const listeners = new Set<(value: boolean) => void>();

async function hydrateMute() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(MUTE_KEY);
    muted = raw === '1';
  } catch {
    muted = false;
  }
  listeners.forEach((fn) => fn(muted));
}

void hydrateMute();

export function isCoachMuted() {
  return muted;
}

export function subscribeCoachMute(listener: (value: boolean) => void) {
  listeners.add(listener);
  listener(muted);
  void hydrateMute();
  return () => {
    listeners.delete(listener);
  };
}

export async function setCoachMuted(value: boolean) {
  muted = Boolean(value);
  listeners.forEach((fn) => fn(muted));
  if (muted) stopSpeaking();
  try {
    await AsyncStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // ignore
  }
}

export function stopSpeaking() {
  try {
    Speech.stop();
  } catch {
    // ignore
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/** Announce workout cues (exercise name, duration, rest, next move). */
export function speakCoach(text: string) {
  if (muted) return;
  const line = String(text || '').trim();
  if (!line) return;
  stopSpeaking();
  try {
    Speech.speak(line, {
      language: 'en-US',
      pitch: 1,
      rate: Platform.OS === 'ios' ? 0.96 : 0.92,
    });
  } catch {
    // ignore TTS failures — workout should still run
  }
}

/** Human phrase for a duration stored in seconds. */
export function durationPhrase(totalSeconds: number) {
  const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
  if (s <= 0) return '0 seconds';
  if (s < 60) return s === 1 ? '1 second' : `${s} seconds`;
  if (s % 60 === 0) {
    const m = s / 60;
    return m === 1 ? '1 minute' : `${m} minutes`;
  }
  const m = Math.floor(s / 60);
  const rem = s % 60;
  const minPart = m === 1 ? '1 minute' : `${m} minutes`;
  const secPart = rem === 1 ? '1 second' : `${rem} seconds`;
  return `${minPart} ${secPart}`;
}

/** Compact UI label: 30s, 1m, 1m 30s */
export function durationLabel(totalSeconds: number) {
  const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s` : `${m}m`;
}

/** @deprecated use durationPhrase */
export function minutesPhrase(minutes: number) {
  return durationPhrase(Math.max(0, Math.round(Number(minutes) || 0)) * 60);
}
