const memoryStorage = new Map<string, string>();

function getBrowserStorage(): Storage | null {
  try {
    return typeof globalThis.localStorage === 'undefined'
      ? null
      : globalThis.localStorage;
  } catch {
    return null;
  }
}

export const keyValueStorage = {
  async getItem(key: string): Promise<string | null> {
    return getBrowserStorage()?.getItem(key) ?? memoryStorage.get(key) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    const storage = getBrowserStorage();
    if (storage) storage.setItem(key, value);
    else memoryStorage.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    const storage = getBrowserStorage();
    if (storage) storage.removeItem(key);
    else memoryStorage.delete(key);
  },
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
