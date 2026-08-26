import AsyncStorage from '@react-native-async-storage/async-storage';

const PASSWORD_STORE_KEY = 'fema-ai-member-passwords';

async function sha256Hex(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
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
