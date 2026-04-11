import { useState, type SubmitEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMaskedNavigation } from '../contexts/NavigationContext';

type SetupStep = 'password' | 'passkey-prompt';

export default function SetupPage() {
  const { navigate } = useMaskedNavigation();
  const { setupPassword, setupPasskey, error, canUsePasskey } = useAuth();
  const [step, setStep] = useState<SetupStep>('password');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSettingUpPasskey, setIsSettingUpPasskey] = useState(false);

  const handlePasswordSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!password) {
      setLocalError('Password is required');
      return;
    }
    if (password !== confirm) {
      setLocalError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await setupPassword(password);
      // After successful password setup, prompt for passkey if available
      if (canUsePasskey) {
        setStep('passkey-prompt');
      } else {
        // Passkey not available, navigate to home
        navigate('/');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnablePasskey = async () => {
    setIsSettingUpPasskey(true);
    try {
      await setupPasskey();
      // After passkey setup, navigate to home
      navigate('/');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Passkey setup failed';
      setLocalError(message);
    } finally {
      setIsSettingUpPasskey(false);
    }
  };

  const handleSkipPasskey = () => {
    // User can skip passkey and use password only
    // Navigate to home (already unlocked from password setup)
    navigate('/');
  };

  if (step === 'passkey-prompt') {
    return (
      <div className="page">
        <div className="setup-container">
          <h1>Enable Quick Unlock?</h1>
          <p className="notice">
            Set up a passkey for faster access next time (Touch ID, Face ID, or password manager).
            You can always use your password as a backup.
          </p>

          {localError && (
            <div>
              <p className="error">{localError}</p>
              <p
                className="notice"
                style={{ fontSize: '12px', marginTop: '8px' }}
              >
                Tip: If using a password manager, make sure it supports passkeys for this site.
              </p>
            </div>
          )}

          <button
            type="button"
            className="btn-primary"
            onClick={handleEnablePasskey}
            disabled={isSettingUpPasskey}
          >
            {isSettingUpPasskey ? 'Setting up...' : '👆 Set Up Passkey'}
          </button>

          <button
            type="button"
            className="btn-text"
            onClick={handleSkipPasskey}
            disabled={isSettingUpPasskey}
          >
            {localError ? 'Continue without passkey' : 'Skip for now'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="setup-container">
        <h1>Create Password</h1>
        <p className="notice">
          👋 Heads up! This app is a work in progress. Things might change or break, and your data
          could be lost during updates. We recommend exporting your cards as backup regularly.
        </p>
        <p className="warning">
          All your data is encrypted with your password.
          <strong> If you forget your password, your data cannot be recovered.</strong>
        </p>

        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
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
            {isSubmitting ? 'Setting up...' : 'Create & Start'}
          </button>
        </form>
      </div>
    </div>
  );
}
