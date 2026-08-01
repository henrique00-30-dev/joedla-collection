import AsyncStorage from 'expo-sqlite/kv-store';

export const keyValueStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

export async function getStoredJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await keyValueStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function setStoredJson<T>(key: string, value: T): Promise<void> {
  await keyValueStorage.setItem(key, JSON.stringify(value));
}

export async function removeStoredValue(key: string): Promise<void> {
  await keyValueStorage.removeItem(key);
}
