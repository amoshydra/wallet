import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface ConfigValue {
  id: string;
  value: ArrayBuffer;
}

interface DataValue {
  id: string;
  encrypted: ArrayBuffer;
  iv: ArrayBuffer;
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
}

let dbInstance: IDBPDatabase<WalletDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<WalletDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<WalletDB>('WalletDB', 1, {
    upgrade(db) {
      db.createObjectStore('config', { keyPath: 'id' });
      db.createObjectStore('data', { keyPath: 'id' });
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
