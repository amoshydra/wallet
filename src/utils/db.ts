import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface DataValue {
  id: string;
  encrypted: ArrayBuffer;
  iv: ArrayBuffer;
}

interface EncryptedMasterKey {
  id: string;
  // Encrypted with password-derived key (always available)
  passwordEncrypted: ArrayBuffer;
  passwordIv: ArrayBuffer;
  salt: ArrayBuffer;
  // Encrypted with device key (only when passkey is configured)
  deviceEncrypted?: ArrayBuffer;
  deviceIv?: ArrayBuffer;
  passkeyCredentialId?: string;
}

interface WalletDB extends DBSchema {
  data: {
    key: string;
    value: DataValue;
  };
  keys: {
    key: string;
    value: EncryptedMasterKey;
  };
}

let dbInstance: IDBPDatabase<WalletDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<WalletDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<WalletDB>('WalletDB', 3, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('data', { keyPath: 'id' });
      }
      if (oldVersion < 3) {
        db.createObjectStore('keys', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
}

export async function getEncryptedData(): Promise<{
  encrypted: ArrayBuffer;
  iv: ArrayBuffer;
} | null> {
  const db = await getDB();
  const result = await db.get('data', 'cards');
  if (!result) return null;
  return { encrypted: result.encrypted, iv: result.iv };
}

export async function setEncryptedData(encrypted: ArrayBuffer, iv: ArrayBuffer): Promise<void> {
  const db = await getDB();
  await db.put('data', { id: 'cards', encrypted, iv });
}

// Encrypted master key storage (encrypted with device key)
export async function getEncryptedMasterKey(): Promise<EncryptedMasterKey | null> {
  const db = await getDB();
  const result = await db.get('keys', 'master');
  return result ?? null;
}

export async function setEncryptedMasterKey(
  passwordEncrypted: ArrayBuffer,
  passwordIv: ArrayBuffer,
  salt: ArrayBuffer,
  deviceEncrypted?: ArrayBuffer,
  deviceIv?: ArrayBuffer,
  passkeyCredentialId?: string,
): Promise<void> {
  const db = await getDB();
  await db.put('keys', {
    id: 'master',
    passwordEncrypted,
    passwordIv,
    salt,
    deviceEncrypted,
    deviceIv,
    passkeyCredentialId,
  });
}

export async function hasEncryptedMasterKey(): Promise<boolean> {
  const key = await getEncryptedMasterKey();
  return key !== null;
}

// Device key storage (in localStorage for passkey authentication)
const DEVICE_KEY_STORAGE_KEY = 'wallet_device_key';

export function getDeviceKey(): string | null {
  return localStorage.getItem(DEVICE_KEY_STORAGE_KEY);
}

export function setDeviceKey(deviceKey: string): void {
  localStorage.setItem(DEVICE_KEY_STORAGE_KEY, deviceKey);
}

export function hasDeviceKey(): boolean {
  return getDeviceKey() !== null;
}

export function clearDeviceKey(): void {
  localStorage.removeItem(DEVICE_KEY_STORAGE_KEY);
}

// Check if user has any authentication set up
export async function hasAuth(): Promise<boolean> {
  return hasEncryptedMasterKey();
}

// Legacy migration helpers - no longer used
export async function getSalt(): Promise<ArrayBuffer | null> {
  return null;
}
