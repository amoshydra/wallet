const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

export async function generateSalt(): Promise<ArrayBuffer> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return salt.buffer as ArrayBuffer;
}

export async function deriveKey(passphrase: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encrypt(
  data: string,
  key: CryptoKey,
): Promise<{ encrypted: ArrayBuffer; iv: ArrayBuffer }> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(data));

  return { encrypted, iv: iv.buffer as ArrayBuffer };
}

export async function decrypt(
  encrypted: ArrayBuffer,
  iv: ArrayBuffer,
  key: CryptoKey,
): Promise<string> {
  const decoder = new TextDecoder();

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);

  return decoder.decode(decrypted);
}

export async function generateMasterKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: KEY_LENGTH }, true, [
    'encrypt',
    'decrypt',
  ]);
}

export async function exportMasterKeyBytes(masterKey: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey('raw', masterKey);
}

export async function importMasterKeyBytes(keyBytes: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM', length: KEY_LENGTH }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptMasterKey(
  masterKey: CryptoKey,
  encryptionKey: CryptoKey,
): Promise<{ encrypted: ArrayBuffer; iv: ArrayBuffer }> {
  const keyBytes = await exportMasterKeyBytes(masterKey);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, encryptionKey, keyBytes);

  return { encrypted, iv: iv.buffer as ArrayBuffer };
}

export async function decryptMasterKey(
  encrypted: ArrayBuffer,
  iv: ArrayBuffer,
  decryptionKey: CryptoKey,
): Promise<CryptoKey> {
  const keyBytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, decryptionKey, encrypted);
  return importMasterKeyBytes(keyBytes);
}

// Device key functions for passkey authentication
// Device key is stored as hex string, but we need to convert it back to bytes for AES
export function generateDeviceKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export async function deriveKeyFromDeviceKey(deviceKey: string): Promise<CryptoKey> {
  // Convert hex string back to 32 bytes (256 bits) for AES
  const keyData = hexToBytes(deviceKey);

  return crypto.subtle.importKey(
    'raw',
    keyData.buffer as ArrayBuffer,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}
