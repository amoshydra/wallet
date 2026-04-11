import { useState, type SubmitEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function UnlockPage() {
  const { unlockWithPassword, unlockWithPasskey, hasPasskey, error } = useAuth();
  const [password, setPassword] = useState('');
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);

  const handlePasswordSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setPasskeyError(null);
    await unlockWithPassword(password);
  };

  const handlePasskeyUnlock = async () => {
    setPasskeyError(null);
    setIsPasskeyLoading(true);
    try {
      await unlockWithPasskey();
    } catch (e) {
      setPasskeyError(e instanceof Error ? e.message : 'Passkey authentication failed');
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="unlock-container">
        <h1>Unlock Wallet</h1>

        {hasPasskey && (
          <>
            <button
              type="button"
              className="btn-primary"
              onClick={handlePasskeyUnlock}
              disabled={isPasskeyLoading}
            >
              {isPasskeyLoading ? 'Authenticating...' : '👆 Use Passkey'}
            </button>

            <div className="divider">
              <span>or</span>
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
              autoFocus={!hasPasskey}
            />
          </div>

          {(passkeyError || error) && <p className="error">{passkeyError || error}</p>}

          <button
            type="submit"
            className={hasPasskey ? 'btn-secondary' : 'btn-primary'}
          >
            Unlock with Password
          </button>
        </form>
      </div>
    </div>
  );
}
