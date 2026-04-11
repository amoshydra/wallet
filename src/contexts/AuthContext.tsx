import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import type { AppData } from '../types/card';
import type { PasskeyCredential } from '../types/auth';
import {
  decrypt,
  deriveKey,
  encrypt,
  generateSalt,
  generateMasterKey,
  encryptMasterKey,
  decryptMasterKey,
  generateDeviceKey,
  deriveKeyFromDeviceKey,
} from '../utils/crypto';
import {
  getEncryptedData,
  setEncryptedData,
  getEncryptedMasterKey,
  setEncryptedMasterKey,
  hasEncryptedMasterKey,
  getDeviceKey,
  setDeviceKey,
} from '../utils/db';
import { canUsePasskey, createPasskey, authenticateWithPasskey } from '../utils/webauthn';

interface AuthContextType {
  isUnlocked: boolean;
  isLoading: boolean;
  isFirstTime: boolean;
  error: string | null;
  hasPasskey: boolean;
  canUsePasskey: boolean;
  setupPassword: (password: string) => Promise<void>;
  setupPasskey: () => Promise<PasskeyCredential | null>;
  unlockWithPassword: (password: string) => Promise<void>;
  unlockWithPasskey: () => Promise<void>;
  lock: () => void;
  getCards: () => AppData['cards'];
  saveCards: (cards: AppData['cards']) => Promise<void>;
  addCard: (card: Omit<import('../types/card').Card, 'id' | 'createdAt'>) => Promise<void>;
  updateCard: (id: string, card: Partial<import('../types/card').Card>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  importCards: (cards: Omit<import('../types/card').Card, 'id' | 'createdAt'>[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTO_LOCK_MS = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 30000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [canUsePasskeyState, setCanUsePasskeyState] = useState(false);
  const [cards, setCards] = useState<import('../types/card').Card[]>([]);
  const masterKeyRef = useRef<CryptoKey | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const checkIntervalRef = useRef<number | null>(null);
  const originalRouteRef = useRef<string>('/');

  useEffect(() => {
    (async () => {
      const passkeyAvailable = await canUsePasskey();
      setCanUsePasskeyState(passkeyAvailable);

      const hasAuth = await hasEncryptedMasterKey();

      if (!hasAuth) {
        setIsFirstTime(true);
        setIsLoading(false);
        setLocation('/setup', { replace: true });
        return;
      }

      // Check if passkey is configured (has credential ID AND device-encrypted key)
      const encryptedKey = await getEncryptedMasterKey();
      setHasPasskey(!!(encryptedKey?.passkeyCredentialId && encryptedKey?.deviceEncrypted));
      setIsFirstTime(false);
      setIsLoading(false);
      setLocation('/unlock', { replace: true });
    })();
  }, [setLocation]);

  const lock = (currentRoute?: string) => {
    if (currentRoute) {
      originalRouteRef.current = currentRoute;
    }
    setIsUnlocked(false);
    setCards([]);
    masterKeyRef.current = null;
    setError(null);
    setLocation('/unlock', { replace: true });
  };

  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('click', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('keydown', handleActivity);

    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, []);

  useEffect(() => {
    if (!isUnlocked) return;

    checkIntervalRef.current = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current > AUTO_LOCK_MS) {
        lock();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [isUnlocked]);

  const setupPassword = async (password: string) => {
    setError(null);
    try {
      const salt = await generateSalt();
      const masterKey = await generateMasterKey();
      const passwordKey = await deriveKey(password, salt);
      const { encrypted, iv } = await encryptMasterKey(masterKey, passwordKey);

      // Store master key encrypted with password (device encryption will be added later if passkey is set up)
      await setEncryptedMasterKey(encrypted, iv, salt);

      const emptyData: AppData = { cards: [] };
      const encryptedData = await encrypt(JSON.stringify(emptyData), masterKey);
      await setEncryptedData(encryptedData.encrypted, encryptedData.iv);

      masterKeyRef.current = masterKey;
      setIsFirstTime(false);
      setIsUnlocked(true);
      setCards([]);
      // Don't navigate here - let SetupPage handle navigation after passkey setup
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setError(`Failed to setup password: ${message}`);
      console.error('Setup error:', e);
    }
  };

  const setupPasskey = async (): Promise<PasskeyCredential> => {
    setError(null);
    try {
      if (!masterKeyRef.current) {
        throw new Error('Not authenticated');
      }

      // Get current encrypted key to preserve the salt and password-encrypted data
      const currentKey = await getEncryptedMasterKey();
      if (!currentKey) {
        throw new Error('No master key found');
      }

      // Create passkey
      const credential = await createPasskey();

      // Generate device key and store it
      const deviceKey = generateDeviceKey();
      setDeviceKey(deviceKey);

      // Encrypt master key with device key
      const deviceKeyCrypto = await deriveKeyFromDeviceKey(deviceKey);
      const { encrypted: deviceEncrypted, iv: deviceIv } = await encryptMasterKey(
        masterKeyRef.current,
        deviceKeyCrypto,
      );

      // Store both password-encrypted and device-encrypted master keys
      await setEncryptedMasterKey(
        currentKey.passwordEncrypted,
        currentKey.passwordIv,
        currentKey.salt,
        deviceEncrypted,
        deviceIv,
        credential.credentialId,
      );
      setHasPasskey(true);

      return credential;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Passkey setup failed';
      setError(message);
      console.error('Passkey setup error:', e);
      throw new Error(message);
    }
  };

  const unlockWithPassword = async (password: string) => {
    setError(null);
    try {
      const encryptedKey = await getEncryptedMasterKey();
      if (!encryptedKey) {
        setError('No authentication set up');
        return;
      }

      // Derive key from password and decrypt using password-encrypted fields
      const passwordKey = await deriveKey(password, encryptedKey.salt);
      const masterKey = await decryptMasterKey(
        encryptedKey.passwordEncrypted,
        encryptedKey.passwordIv,
        passwordKey,
      );

      // Regenerate device key for future passkey use (if passkey is configured)
      if (
        encryptedKey.passkeyCredentialId &&
        encryptedKey.deviceEncrypted &&
        encryptedKey.deviceIv
      ) {
        const newDeviceKey = generateDeviceKey();
        setDeviceKey(newDeviceKey);
        const deviceKeyCrypto = await deriveKeyFromDeviceKey(newDeviceKey);
        const { encrypted: deviceEncrypted, iv: deviceIv } = await encryptMasterKey(
          masterKey,
          deviceKeyCrypto,
        );
        await setEncryptedMasterKey(
          encryptedKey.passwordEncrypted,
          encryptedKey.passwordIv,
          encryptedKey.salt,
          deviceEncrypted,
          deviceIv,
          encryptedKey.passkeyCredentialId,
        );
      }

      masterKeyRef.current = masterKey;

      const stored = await getEncryptedData();
      if (stored) {
        const decrypted = await decrypt(stored.encrypted, stored.iv, masterKey);
        const data: AppData = JSON.parse(decrypted);
        setCards(data.cards);
      } else {
        setCards([]);
      }

      setHasPasskey(!!(encryptedKey.passkeyCredentialId && encryptedKey.deviceEncrypted));
      setIsUnlocked(true);
      setLocation(originalRouteRef.current);
    } catch {
      setError('Incorrect password');
      masterKeyRef.current = null;
    }
  };

  const unlockWithPasskey = async () => {
    setError(null);
    try {
      const encryptedKey = await getEncryptedMasterKey();
      if (!encryptedKey?.passkeyCredentialId) {
        setError('Passkey not configured');
        return;
      }

      // Authenticate with passkey
      const authenticated = await authenticateWithPasskey(encryptedKey.passkeyCredentialId);
      if (!authenticated) {
        setError('Passkey authentication failed');
        return;
      }

      // Check if device-encrypted key exists
      if (!encryptedKey.deviceEncrypted || !encryptedKey.deviceIv) {
        setError('Passkey not properly configured. Please use password.');
        return;
      }

      // Get device key
      const deviceKey = getDeviceKey();
      if (!deviceKey) {
        setError('Device key not found. Please use password.');
        return;
      }

      // Decrypt master key with device key using device-encrypted fields
      const deviceKeyCrypto = await deriveKeyFromDeviceKey(deviceKey);
      const masterKey = await decryptMasterKey(
        encryptedKey.deviceEncrypted,
        encryptedKey.deviceIv,
        deviceKeyCrypto,
      );

      masterKeyRef.current = masterKey;

      const stored = await getEncryptedData();
      if (stored) {
        const decrypted = await decrypt(stored.encrypted, stored.iv, masterKey);
        const data: AppData = JSON.parse(decrypted);
        setCards(data.cards);
      } else {
        setCards([]);
      }

      setIsUnlocked(true);
      setLocation(originalRouteRef.current);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Passkey authentication failed';
      setError(message);
      masterKeyRef.current = null;
    }
  };

  const saveCards = async (newCards: import('../types/card').Card[]) => {
    if (!masterKeyRef.current) return;
    const data: AppData = { cards: newCards };
    const encrypted = await encrypt(JSON.stringify(data), masterKeyRef.current);
    await setEncryptedData(encrypted.encrypted, encrypted.iv);
    setCards(newCards);
  };

  const addCard = async (card: Omit<import('../types/card').Card, 'id' | 'createdAt'>) => {
    const now = Date.now();
    const newCard: import('../types/card').Card = {
      ...card,
      id: crypto.randomUUID(),
      createdAt: now,
      lastViewedAt: now,
    };
    await saveCards([...cards, newCard]);
  };

  const importCards = async (
    importedCards: Omit<import('../types/card').Card, 'id' | 'createdAt'>[],
  ) => {
    const now = Date.now();
    const newCards = importedCards.map((card) => ({
      ...card,
      id: crypto.randomUUID(),
      createdAt: now,
      lastViewedAt: now,
    }));
    await saveCards([...cards, ...newCards]);
  };

  const updateCard = async (id: string, updates: Partial<import('../types/card').Card>) => {
    const newCards = cards.map((c) => (c.id === id ? { ...c, ...updates } : c));
    await saveCards(newCards);
  };

  const deleteCard = async (id: string) => {
    const newCards = cards.filter((c) => c.id !== id);
    await saveCards(newCards);
  };

  return (
    <AuthContext.Provider
      value={{
        isUnlocked,
        isLoading,
        isFirstTime,
        error,
        hasPasskey,
        canUsePasskey: canUsePasskeyState,
        setupPassword,
        setupPasskey,
        unlockWithPassword,
        unlockWithPasskey,
        lock,
        getCards: () => cards,
        saveCards,
        addCard,
        updateCard,
        deleteCard,
        importCards,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
