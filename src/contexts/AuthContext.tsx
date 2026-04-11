import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import type { AppData } from '../types/card';
import type { AuthMethod, StoredAuthConfig, BiometricCredential } from '../types/auth';
import {
  decrypt,
  deriveKey,
  encrypt,
  generateSalt,
  generateMasterKey,
  encryptMasterKey,
  decryptMasterKey,
} from '../utils/crypto';
import {
  getEncryptedData,
  setEncryptedData,
  getSalt,
  hasPassword,
  getAuthConfig,
  setAuthConfig,
  hasAuthConfig,
} from '../utils/db';
import { canUseBiometric, getBiometricKey } from '../utils/webauthn';

interface AuthContextType {
  isUnlocked: boolean;
  isLoading: boolean;
  isFirstTime: boolean;
  authMethod: AuthMethod | null;
  hasBiometric: boolean;
  error: string | null;
  canSetupBiometric: boolean;
  setupPasswordOnly: (password: string) => Promise<void>;
  setupBiometricPassword: (password: string, credential: BiometricCredential) => Promise<void>;
  unlockWithPassword: (password: string) => Promise<void>;
  unlockWithBiometric: () => Promise<void>;
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
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
  const [hasBiometric, setHasBiometric] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canSetupBiometric, setCanSetupBiometric] = useState(false);
  const [cards, setCards] = useState<import('../types/card').Card[]>([]);
  const masterKeyRef = useRef<CryptoKey | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const checkIntervalRef = useRef<number | null>(null);
  const originalRouteRef = useRef<string>('/');

  useEffect(() => {
    (async () => {
      const biometricAvailable = await canUseBiometric();
      setCanSetupBiometric(biometricAvailable);

      const hasAuth = await hasAuthConfig();
      const hasOldPassword = await hasPassword();

      if (!hasAuth && !hasOldPassword) {
        setIsFirstTime(true);
        setIsLoading(false);
        setLocation('/setup', { replace: true });
        return;
      }

      if (hasOldPassword && !hasAuth) {
        setIsFirstTime(false);
        setIsLoading(false);
        setLocation('/unlock', { replace: true });
        return;
      }

      const config = await getAuthConfig();
      if (config) {
        setAuthMethod(config.method);
        setHasBiometric(!!config.biometric);
        setIsFirstTime(false);
      }
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

  const setupPasswordOnly = async (password: string) => {
    setError(null);
    try {
      const salt = await generateSalt();
      const masterKey = await generateMasterKey();
      const passwordKey = await deriveKey(password, salt);
      const { encrypted, iv } = await encryptMasterKey(masterKey, passwordKey);

      const config: StoredAuthConfig = {
        method: 'password',
        passwordSalt: salt,
        passwordEncryptedMasterKey: encrypted,
        passwordMasterKeyIv: iv,
      };
      await setAuthConfig(config);

      const emptyData: AppData = { cards: [] };
      const encryptedData = await encrypt(JSON.stringify(emptyData), masterKey);
      await setEncryptedData(encryptedData.encrypted, encryptedData.iv);

      masterKeyRef.current = masterKey;
      setAuthMethod('password');
      setHasBiometric(false);
      setIsFirstTime(false);
      setIsUnlocked(true);
      setCards([]);
      setLocation('/');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setError(`Failed to setup password: ${message}`);
      console.error('Setup error:', e);
    }
  };

  const setupBiometricPassword = async (password: string, credential: BiometricCredential) => {
    setError(null);
    try {
      const salt = await generateSalt();
      const masterKey = await generateMasterKey();
      const passwordKey = await deriveKey(password, salt);
      const passwordEncrypted = await encryptMasterKey(masterKey, passwordKey);

      const biometricKey = await getBiometricKey(credential);
      const biometricEncrypted = await encryptMasterKey(masterKey, biometricKey);

      const config: StoredAuthConfig = {
        method: 'biometric',
        passwordSalt: salt,
        passwordEncryptedMasterKey: passwordEncrypted.encrypted,
        passwordMasterKeyIv: passwordEncrypted.iv,
        biometric: credential,
        biometricEncryptedMasterKey: biometricEncrypted.encrypted,
        biometricMasterKeyIv: biometricEncrypted.iv,
      };
      await setAuthConfig(config);

      const emptyData: AppData = { cards: [] };
      const encryptedData = await encrypt(JSON.stringify(emptyData), masterKey);
      await setEncryptedData(encryptedData.encrypted, encryptedData.iv);

      masterKeyRef.current = masterKey;
      setAuthMethod('biometric');
      setHasBiometric(true);
      setIsFirstTime(false);
      setIsUnlocked(true);
      setCards([]);
      setLocation('/');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setError(`Failed to setup biometric: ${message}`);
      console.error('Setup error:', e);
    }
  };

  const unlockWithPassword = async (password: string) => {
    setError(null);
    try {
      let masterKey: CryptoKey;

      const config = await getAuthConfig();
      if (config) {
        const passwordKey = await deriveKey(password, config.passwordSalt);
        masterKey = await decryptMasterKey(
          config.passwordEncryptedMasterKey,
          config.passwordMasterKeyIv,
          passwordKey,
        );
      } else {
        const salt = await getSalt();
        if (!salt) {
          setError('No password set');
          return;
        }
        const passwordKey = await deriveKey(password, salt);
        masterKey = passwordKey;

        const stored = await getEncryptedData();
        if (stored) {
          const decrypted = await decrypt(stored.encrypted, stored.iv, passwordKey);
          const data: AppData = JSON.parse(decrypted);

          const newMasterKey = await generateMasterKey();
          const { encrypted, iv } = await encryptMasterKey(newMasterKey, passwordKey);

          const newConfig: StoredAuthConfig = {
            method: 'password',
            passwordSalt: salt,
            passwordEncryptedMasterKey: encrypted,
            passwordMasterKeyIv: iv,
          };
          await setAuthConfig(newConfig);

          const encryptedData = await encrypt(JSON.stringify(data), newMasterKey);
          await setEncryptedData(encryptedData.encrypted, encryptedData.iv);

          masterKey = newMasterKey;
        }
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

      if (config) {
        setAuthMethod(config.method);
        setHasBiometric(!!config.biometric);
      } else {
        setAuthMethod('password');
        setHasBiometric(false);
      }
      setIsUnlocked(true);
      setLocation(originalRouteRef.current);
    } catch {
      setError('Incorrect password');
      masterKeyRef.current = null;
    }
  };

  const unlockWithBiometric = async () => {
    setError(null);
    try {
      const config = await getAuthConfig();
      if (!config || !config.biometric) {
        setError('Biometric not configured');
        return;
      }

      const biometricKey = await getBiometricKey(config.biometric);
      if (!config.biometricEncryptedMasterKey || !config.biometricMasterKeyIv) {
        setError('Biometric key not found');
        return;
      }
      const masterKey = await decryptMasterKey(
        config.biometricEncryptedMasterKey,
        config.biometricMasterKeyIv,
        biometricKey,
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

      setAuthMethod(config.method);
      setHasBiometric(true);
      setIsUnlocked(true);
      setLocation(originalRouteRef.current);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Biometric authentication failed';
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
        authMethod,
        hasBiometric,
        error,
        canSetupBiometric,
        setupPasswordOnly,
        setupBiometricPassword,
        unlockWithPassword,
        unlockWithBiometric,
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
