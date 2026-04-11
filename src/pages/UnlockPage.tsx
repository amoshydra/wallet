import { useState, type SubmitEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function UnlockPage() {
  const { unlockWithPassword, unlockWithBiometric, hasBiometric, error } = useAuth();
  const [password, setPassword] = useState('');
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  const handlePasswordSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setBiometricError(null);
    await unlockWithPassword(password);
  };

  const handleBiometricUnlock = async () => {
    setBiometricError(null);
    setIsBiometricLoading(true);
    try {
      await unlockWithBiometric();
    } catch (e) {
      setBiometricError(e instanceof Error ? e.message : 'Biometric authentication failed');
    } finally {
      setIsBiometricLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="unlock-container">
        <h1>Unlock Wallet</h1>

        {hasBiometric && (
          <>
            <button
              type="button"
              className="btn-primary btn-biometric"
              onClick={handleBiometricUnlock}
              disabled={isBiometricLoading}
            >
              {isBiometricLoading ? 'Authenticating...' : '👆 Unlock with Biometric'}
            </button>

            <div className="divider">
              <span>or use password</span>
            </div>
          </>
        )}

        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              autoFocus={!hasBiometric}
            />
          </div>

          {(biometricError || error) && <p className="error">{biometricError || error}</p>}

          <button
            type="submit"
            className={hasBiometric ? 'btn-secondary' : 'btn-primary'}
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
