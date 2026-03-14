import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "wouter";
import type { AppData } from "../types/card";
import { deriveKey, encrypt, decrypt, generateSalt } from "../utils/crypto";
import { getSalt, setSalt, getEncryptedData, setEncryptedData, hasPassword } from "../utils/db";

interface AuthContextType {
  isUnlocked: boolean;
  isLoading: boolean;
  isFirstTime: boolean;
  error: string | null;
  setupPassword: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  getCards: () => AppData["cards"];
  saveCards: (cards: AppData["cards"]) => Promise<void>;
  addCard: (card: Omit<import("../types/card").Card, "id" | "createdAt">) => Promise<void>;
  updateCard: (id: string, card: Partial<import("../types/card").Card>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
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
  const [cards, setCards] = useState<import("../types/card").Card[]>([]);
  const keyRef = useRef<CryptoKey | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const checkIntervalRef = useRef<number | null>(null);
  const originalRouteRef = useRef<string>("/");

  useEffect(() => {
    (async () => {
      const hasPwd = await hasPassword();
      setIsFirstTime(!hasPwd);
      setIsLoading(false);
      if (!hasPwd) {
        setLocation("/setup", { replace: true });
      } else {
        setLocation("/unlock", { replace: true });
      }
    })();
  }, [setLocation]);

  const lock = useCallback((currentRoute?: string) => {
    if (currentRoute) {
      originalRouteRef.current = currentRoute;
    }
    setIsUnlocked(false);
    setCards([]);
    keyRef.current = null;
    setLocation("/unlock", { replace: true });
  }, [setLocation]);

  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener("click", handleActivity);
    window.addEventListener("touchstart", handleActivity);
    window.addEventListener("keydown", handleActivity);

    return () => {
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("keydown", handleActivity);
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
  }, [isUnlocked, lock]);

  const setupPassword = async (password: string) => {
    setError(null);
    try {
      const salt = await generateSalt();
      await setSalt(salt);
      const key = await deriveKey(password, salt);
      keyRef.current = key;
      
      const emptyData: AppData = { cards: [] };
      const encrypted = await encrypt(JSON.stringify(emptyData), key);
      await setEncryptedData(encrypted.encrypted, encrypted.iv);
      
      setIsFirstTime(false);
      setIsUnlocked(true);
      setCards([]);
      setLocation("/");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(`Failed to setup password: ${message}`);
      console.error("Setup error:", e);
    }
  };

  const unlock = async (password: string) => {
    setError(null);
    try {
      const salt = await getSalt();
      if (!salt) {
        setError("No password set");
        return;
      }
      
      const key = await deriveKey(password, salt);
      keyRef.current = key;
      
      const stored = await getEncryptedData();
      if (!stored) {
        setIsUnlocked(true);
        setCards([]);
        setLocation(originalRouteRef.current);
        return;
      }
      
      const decrypted = await decrypt(stored.encrypted, stored.iv, key);
      const data: AppData = JSON.parse(decrypted);
      setCards(data.cards);
      setIsUnlocked(true);
      setLocation(originalRouteRef.current);
    } catch (e) {
      setError("Incorrect password");
      keyRef.current = null;
    }
  };

  const saveCards = async (newCards: import("../types/card").Card[]) => {
    if (!keyRef.current) return;
    const data: AppData = { cards: newCards };
    const encrypted = await encrypt(JSON.stringify(data), keyRef.current);
    await setEncryptedData(encrypted.encrypted, encrypted.iv);
    setCards(newCards);
  };

  const addCard = async (card: Omit<import("../types/card").Card, "id" | "createdAt">) => {
    const newCard: import("../types/card").Card = {
      ...card,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    await saveCards([...cards, newCard]);
  };

  const updateCard = async (id: string, updates: Partial<import("../types/card").Card>) => {
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
        setupPassword,
        unlock,
        lock,
        getCards: () => cards,
        saveCards,
        addCard,
        updateCard,
        deleteCard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
