import { useState, type SubmitEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createBiometricCredential } from '../utils/webauthn';
import type { BiometricCredential } from '../types/auth';

type SetupStep = 'choose' | 'biometric' | 'password';
type AuthChoice = 'biometric' | 'password' | null;

export default function SetupPage() {
  const { setupPasswordOnly, setupBiometricPassword, error } = useAuth();
  const [step, setStep] = useState<SetupStep>('choose');
  const [authChoice, setAuthChoice] = useState<AuthChoice>(null);
  const [biometricCredential, setBiometricCredential] = useState<BiometricCredential | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  const handleChooseBiometric = () => {
    setAuthChoice('biometric');
    setStep('biometric');
    setLocalError('');
  };

  const handleChoosePassword = () => {
    setAuthChoice('password');
    setStep('password');
    setLocalError('');
  };

  const handleSetUpBiometric = async () => {
    setLocalError('');
    setIsBiometricLoading(true);
    try {
      const credential = await createBiometricCredential();
      setBiometricCredential(credential);
      setStep('password');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Biometric setup failed';
      setLocalError(message);
    } finally {
      setIsBiometricLoading(false);
    }
  };

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
      if (authChoice === 'biometric') {
        if (!biometricCredential) {
          setLocalError('Biometric setup incomplete. Please go back and set up biometric.');
          return;
        }
        await setupBiometricPassword(password, biometricCredential);
      } else {
        await setupPasswordOnly(password);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'choose') {
    return (
      <div className="page">
        <div className="setup-container">
          <h1>Choose Your Security</h1>
          <p className="warning">
            All your data is encrypted with your chosen method.
            <strong> If you forget your password, your data cannot be recovered.</strong>
          </p>

          <div className="setup-options">
            <button
              type="button"
              className="btn-primary setup-option"
              onClick={handleChooseBiometric}
            >
              <span className="option-icon">👆</span>
              <span className="option-title">Biometric + Password</span>
              <span className="option-desc">Face ID / Touch ID + password backup</span>
            </button>

            <button
              type="button"
              className="btn-secondary setup-option"
              onClick={handleChoosePassword}
            >
              <span className="option-icon">🔒</span>
              <span className="option-title">Password Only</span>
              <span className="option-desc">Traditional password protection</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'biometric') {
    return (
      <div className="page">
        <div className="setup-container">
          <h1>Set Up Biometric</h1>
          <p>Use your device's biometric authentication for quick access.</p>

          {localError && <p className="error">{localError}</p>}

          <button
            type="button"
            className="btn-primary"
            onClick={handleSetUpBiometric}
            disabled={isBiometricLoading}
          >
            {isBiometricLoading ? 'Setting up...' : 'Set Up Touch ID / Face ID'}
          </button>

          <button
            type="button"
            className="btn-text"
            onClick={handleChoosePassword}
            disabled={isBiometricLoading}
          >
            Use Password Only Instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="setup-container">
        <h1>{authChoice === 'password' ? 'Create Password' : 'Create Backup Password'}</h1>
        <p className="notice">
          👋 Heads up! This app is a work in progress. Things might change or break, and your data
          could be lost during updates. We recommend exporting your cards as backup regularly.
        </p>
        {authChoice === 'password' ? (
          <p className="warning">
            All your data is encrypted with your password.
            <strong> If you forget your password, your data cannot be recovered.</strong>
          </p>
        ) : (
          <p className="warning">
            This password will be used if biometric authentication is unavailable.
          </p>
        )}

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
