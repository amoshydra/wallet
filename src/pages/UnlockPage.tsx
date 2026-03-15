import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function UnlockPage() {
  const { unlock, error } = useAuth();
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await unlock(password);
  };

  return (
    <div className="page">
      <div className="unlock-container">
        <h1>Unlock Wallet</h1>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              autoFocus
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button
            type="submit"
            className="btn-primary"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
