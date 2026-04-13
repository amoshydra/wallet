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
  clearDeviceKey,
} from '../utils/db';
import { canUsePasskey, createPasskey, authenticateWithPasskey } from '../utils/webauthn';

interface AuthContextType {
  isUnlocked: boolean;
  isLoading: boolean;
  isFirstTime: boolean;
  isHidden: boolean;
  error: string | null;
  hasPasskey: boolean;
  canUsePasskey: boolean;
  setupPassword: (password: string) => Promise<void>;
  setupPasskey: () => Promise<PasskeyCredential | null>;
  unlockWithPassword: (password: string) => Promise<void>;
  unlockWithPasskey: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  removePasskey: (password: string) => Promise<void>;
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
const LAST_ACTIVITY_KEY = 'wallet_lastActivity';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
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

  // Lock when user navigates to /unlock
  useEffect(() => {
    if (location === '/unlock' && isUnlocked) {
      setIsUnlocked(false);
      setCards([]);
      masterKeyRef.current = null;
      setError(null);
    }
  }, [location, isUnlocked]);

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
      const now = Date.now();
      lastActivityRef.current = now;
      sessionStorage.setItem(LAST_ACTIVITY_KEY, String(now));
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
    const handleBlur = () => {
      // Window lost focus - user might be switching apps
      setIsHidden(true);
    };

    const handleFocus = () => {
      setIsHidden(false);
      if (isUnlocked) {
        const lastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY);
        if (lastActivity && Date.now() - parseInt(lastActivity, 10) > AUTO_LOCK_MS) {
          lock();
        }
      }
    };

    const handleVisibilityChange = () => {
      const hidden = document.visibilityState === 'hidden';
      setIsHidden(hidden);

      if (!hidden && isUnlocked) {
        const lastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY);
        if (lastActivity && Date.now() - parseInt(lastActivity, 10) > AUTO_LOCK_MS) {
          lock();
        }
      }
    };

    const handleBeforeUnload = () => {
      if (isUnlocked) {
        lock();
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isUnlocked]);

  useEffect(() => {
    if (!isUnlocked) return;

    checkIntervalRef.current = window.setInterval(() => {
      const lastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY);
      if (lastActivity && Date.now() - parseInt(lastActivity, 10) > AUTO_LOCK_MS) {
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

      // Note: Device key is NOT regenerated here to maintain security
      // The existing device key in localStorage remains valid for passkey unlocks
      // If device key is missing/corrupted, user can still use password

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

  const changePassword = async (currentPassword: string, newPassword: string) => {
    setError(null);
    try {
      const encryptedKey = await getEncryptedMasterKey();
      if (!encryptedKey) {
        throw new Error('No authentication set up');
      }

      const currentPasswordKey = await deriveKey(currentPassword, encryptedKey.salt);
      try {
        await decryptMasterKey(
          encryptedKey.passwordEncrypted,
          encryptedKey.passwordIv,
          currentPasswordKey,
        );
      } catch {
        throw new Error('Incorrect current password');
      }

      if (!masterKeyRef.current) {
        throw new Error('Not authenticated');
      }

      const newSalt = await generateSalt();
      const newPasswordKey = await deriveKey(newPassword, newSalt);
      const { encrypted: newPasswordEncrypted, iv: newPasswordIv } = await encryptMasterKey(
        masterKeyRef.current,
        newPasswordKey,
      );

      await setEncryptedMasterKey(
        newPasswordEncrypted,
        newPasswordIv,
        newSalt,
        encryptedKey.deviceEncrypted,
        encryptedKey.deviceIv,
        encryptedKey.passkeyCredentialId,
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to change password';
      setError(message);
      throw new Error(message);
    }
  };

  const removePasskey = async (password: string) => {
    setError(null);
    try {
      const encryptedKey = await getEncryptedMasterKey();
      if (!encryptedKey) {
        throw new Error('No authentication set up');
      }

      const passwordKey = await deriveKey(password, encryptedKey.salt);
      try {
        await decryptMasterKey(
          encryptedKey.passwordEncrypted,
          encryptedKey.passwordIv,
          passwordKey,
        );
      } catch {
        throw new Error('Incorrect current password');
      }

      clearDeviceKey();

      await setEncryptedMasterKey(
        encryptedKey.passwordEncrypted,
        encryptedKey.passwordIv,
        encryptedKey.salt,
      );

      setHasPasskey(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to remove passkey';
      setError(message);
      throw new Error(message);
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
        isHidden,
        error,
        hasPasskey,
        canUsePasskey: canUsePasskeyState,
        setupPassword,
        setupPasskey,
        unlockWithPassword,
        unlockWithPasskey,
        changePassword,
        removePasskey,
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
