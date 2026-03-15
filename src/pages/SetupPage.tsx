import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function SetupPage() {
  const { setupPassword, error } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setLocalError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await setupPassword(password);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="setup-container">
        <h1>Create Password</h1>
        <p className="warning">
          All your data is encrypted with your password.
          <strong> If you forget your password, your data cannot be recovered.</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (min 8 characters)"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm">Confirm Password</label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm password"
              autoComplete="new-password"
            />
          </div>

          {(localError || error) && <p className="error">{localError || error}</p>}

          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Setting up...' : 'Create Password & Start'}
          </button>
        </form>
      </div>
    </div>
  );
}
