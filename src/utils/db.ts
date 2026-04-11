import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { StoredAuthConfig } from '../types/auth';

interface ConfigValue {
  id: string;
  value: ArrayBuffer;
}

interface DataValue {
  id: string;
  encrypted: ArrayBuffer;
  iv: ArrayBuffer;
}

interface AuthConfigValue {
  id: string;
  method: 'biometric' | 'password';
  passwordSalt: ArrayBuffer;
  passwordEncryptedMasterKey: ArrayBuffer;
  passwordMasterKeyIv: ArrayBuffer;
  biometricCredentialId?: ArrayBuffer;
  biometricPublicKey?: ArrayBuffer;
  biometricEncryptedMasterKey?: ArrayBuffer;
  biometricMasterKeyIv?: ArrayBuffer;
}

interface WalletDB extends DBSchema {
  config: {
    key: string;
    value: ConfigValue;
  };
  data: {
    key: string;
    value: DataValue;
  };
  auth: {
    key: string;
    value: AuthConfigValue;
  };
}

let dbInstance: IDBPDatabase<WalletDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<WalletDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<WalletDB>('WalletDB', 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('config', { keyPath: 'id' });
        db.createObjectStore('data', { keyPath: 'id' });
      }
      if (oldVersion < 2) {
        db.createObjectStore('auth', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
}

export async function getSalt(): Promise<ArrayBuffer | null> {
  const db = await getDB();
  const result = await db.get('config', 'salt');
  return result?.value ?? null;
}

export async function setSalt(salt: ArrayBuffer): Promise<void> {
  const db = await getDB();
  await db.put('config', { id: 'salt', value: salt });
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

export async function hasPassword(): Promise<boolean> {
  const salt = await getSalt();
  return salt !== null;
}

export async function getAuthConfig(): Promise<StoredAuthConfig | null> {
  const db = await getDB();
  const result = await db.get('auth', 'main');
  if (!result) return null;
  const config: StoredAuthConfig = {
    method: result.method,
    passwordSalt: result.passwordSalt,
    passwordEncryptedMasterKey: result.passwordEncryptedMasterKey,
    passwordMasterKeyIv: result.passwordMasterKeyIv,
  };
  if (result.biometricCredentialId && result.biometricPublicKey) {
    config.biometric = {
      credentialId: result.biometricCredentialId,
      publicKey: result.biometricPublicKey,
    };
  }
  if (result.biometricEncryptedMasterKey && result.biometricMasterKeyIv) {
    config.biometricEncryptedMasterKey = result.biometricEncryptedMasterKey;
    config.biometricMasterKeyIv = result.biometricMasterKeyIv;
  }
  return config;
}

export async function setAuthConfig(config: StoredAuthConfig): Promise<void> {
  const db = await getDB();
  const value: AuthConfigValue = {
    id: 'main',
    method: config.method,
    passwordSalt: config.passwordSalt,
    passwordEncryptedMasterKey: config.passwordEncryptedMasterKey,
    passwordMasterKeyIv: config.passwordMasterKeyIv,
  };
  if (config.biometric) {
    value.biometricCredentialId = config.biometric.credentialId;
    value.biometricPublicKey = config.biometric.publicKey;
  }
  if (config.biometricEncryptedMasterKey && config.biometricMasterKeyIv) {
    value.biometricEncryptedMasterKey = config.biometricEncryptedMasterKey;
    value.biometricMasterKeyIv = config.biometricMasterKeyIv;
  }
  await db.put('auth', value);
}

export async function hasAuthConfig(): Promise<boolean> {
  const config = await getAuthConfig();
  return config !== null;
}
