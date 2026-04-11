import {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import { useLocation } from 'wouter';

const MASK_DELAY_MS = 20;
const MASK_DURATION_MS = 5;

interface NavigationContextType {
  navigate: (to: string) => void;
  showMask: boolean;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const [showMask, setShowMask] = useState(false);
  const delayTimeoutRef = useRef<number | null>(null);
  const durationTimeoutRef = useRef<number | null>(null);

  const navigate = useCallback(
    (to: string) => {
      setShowMask(true);

      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
      if (durationTimeoutRef.current) {
        clearTimeout(durationTimeoutRef.current);
      }

      delayTimeoutRef.current = window.setTimeout(() => {
        setLocation(to);

        durationTimeoutRef.current = window.setTimeout(() => {
          setShowMask(false);
        }, MASK_DURATION_MS);
      }, MASK_DELAY_MS);
    },
    [setLocation],
  );

  useEffect(() => {
    return () => {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
      if (durationTimeoutRef.current) {
        clearTimeout(durationTimeoutRef.current);
      }
    };
  }, []);

  return (
    <NavigationContext.Provider value={{ navigate, showMask }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useMaskedNavigation(): NavigationContextType {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useMaskedNavigation must be used within NavigationProvider');
  }
  return context;
}
