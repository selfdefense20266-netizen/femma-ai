import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const PASSWORD_STORE_KEY = 'fema-ai-member-passwords';

async function sha256Hex(value: string) {
  // React Native has no Web Crypto `crypto.subtle` — use Expo Crypto instead.
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}

export async function hashMemberPassword(email: string, password: string) {
  return sha256Hex(`${email.trim().toLowerCase()}::${password}::fema-member`);
}

async function readPasswordMap() {
  try {
    const raw = await AsyncStorage.getItem(PASSWORD_STORE_KEY);
    if (!raw) return {} as Record<string, string>;
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {} as Record<string, string>;
  }
}

export async function saveMemberPassword(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const hash = await hashMemberPassword(normalized, password);
  const map = await readPasswordMap();
  map[normalized] = hash;
  await AsyncStorage.setItem(PASSWORD_STORE_KEY, JSON.stringify(map));
  return hash;
}

export async function verifyMemberPassword(
  email: string,
  password: string,
  storedHash?: string | null
) {
  const hash = await hashMemberPassword(email, password);
  if (storedHash && storedHash === hash) return true;
  const map = await readPasswordMap();
  return map[email.trim().toLowerCase()] === hash;
}

export async function clearMemberPasswords() {
  await AsyncStorage.removeItem(PASSWORD_STORE_KEY);
}
