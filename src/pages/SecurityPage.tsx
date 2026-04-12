import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import Dialog from '../components/Dialog';
import { useAuth } from '../contexts/AuthContext';
import { useMaskedNavigation } from '../contexts/NavigationContext';

export default function SecurityPage() {
  const { hasPasskey, canUsePasskey, setupPasskey, changePassword, removePasskey } = useAuth();
  const { navigate } = useMaskedNavigation();
  const [isSettingUpPasskey, setIsSettingUpPasskey] = useState(false);
  const [isRemovingPasskey, setIsRemovingPasskey] = useState(false);
  const [showRemovePasskeyModal, setShowRemovePasskeyModal] = useState(false);
  const [removePassword, setRemovePassword] = useState('');
  const [removePasswordError, setRemovePasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [matchSuccess] = useRoute('/security/success');

  useEffect(() => {
    if (matchSuccess) {
      const timer = setTimeout(() => {
        navigate('/security');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [matchSuccess, navigate]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('success') === 'true') {
      setShowSuccessMessage(true);
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Inline validation for confirm password
  useEffect(() => {
    if (confirmPassword && newPassword !== confirmPassword) {
      setConfirmError('Passwords do not match');
    } else {
      setConfirmError('');
    }
  }, [newPassword, confirmPassword]);

  const handleEnablePasskey = async () => {
    setIsSettingUpPasskey(true);
    try {
      await setupPasskey();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Passkey setup failed';
      console.error('Passkey setup error:', e);
      alert(message);
    } finally {
      setIsSettingUpPasskey(false);
    }
  };

  const handleRemovePasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    setRemovePasswordError('');
    setIsRemovingPasskey(true);
    try {
      await removePasskey(removePassword);
      setRemovePassword('');
      setShowRemovePasskeyModal(false);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to remove passkey';
      setRemovePasswordError(message);
    } finally {
      setIsRemovingPasskey(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPasswordError('');
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      navigate('/security/success');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to change password';
      setCurrentPasswordError(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (matchSuccess) {
    return (
      <div className="page">
        <header className="header">
          <button
            onClick={() => navigate('/security')}
            className="btn-text"
          >
            ← Back
          </button>
          <h1>Security</h1>
          <div style={{ width: 60 }} />
        </header>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            textAlign: 'center',
          }}
        >
          <p style={{ color: '#22c55e', fontSize: '18px', marginBottom: '16px' }}>
            Password changed successfully ✓
          </p>
          <p style={{ color: '#666' }}>Redirecting to Security page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <button
          onClick={() => navigate('/')}
          className="btn-text"
        >
          ← Back
        </button>
        <h1>Security</h1>
        <div style={{ width: 60 }} />
      </header>

      <div style={{ padding: '20px 0' }}>
        {showSuccessMessage && (
          <div
            style={{
              backgroundColor: '#dcfce7',
              border: '1px solid #22c55e',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
            }}
          >
            <p style={{ color: '#166534', margin: 0 }}>Password changed successfully ✓</p>
          </div>
        )}

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Quick Unlock</h2>

          {canUsePasskey && !hasPasskey && (
            <>
              <p style={{ color: '#666', marginBottom: '16px' }}>
                Set up a passkey for faster access next time using Touch ID, Face ID, or your
                password manager.
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={handleEnablePasskey}
                disabled={isSettingUpPasskey}
              >
                {isSettingUpPasskey ? 'Setting up...' : 'Set Up Passkey'}
              </button>
            </>
          )}

          {hasPasskey && (
            <div>
              <p style={{ color: '#22c55e', marginBottom: '12px' }}>Quick Unlock is enabled ✓</p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowRemovePasskeyModal(true)}
              >
                Remove Passkey
              </button>
            </div>
          )}

          {!canUsePasskey && (
            <p style={{ color: '#666' }}>Quick Unlock is not supported on this device</p>
          )}
        </section>

        <section>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Password</h2>

          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
                disabled={isChangingPassword}
              />
              {currentPasswordError && <p className="error">{currentPasswordError}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
                disabled={isChangingPassword}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                disabled={isChangingPassword}
              />
              {confirmError && <p className="error">{confirmError}</p>}
            </div>

            {passwordError && <p className="error">{passwordError}</p>}

            <button
              type="submit"
              className="btn-primary"
              disabled={isChangingPassword || !!confirmError}
            >
              {isChangingPassword ? 'Changing password...' : 'Change Password'}
            </button>
          </form>
        </section>
      </div>

      <Dialog
        open={showRemovePasskeyModal}
        onClose={() => {
          setShowRemovePasskeyModal(false);
          setRemovePassword('');
          setRemovePasswordError('');
        }}
      >
        <h3>Remove Passkey</h3>
        <p className="dialog-description">
          Enter your password to confirm removing passkey. You will need to use your password to
          unlock the wallet after this.
        </p>
        <form onSubmit={handleRemovePasskey}>
          <div className="form-group">
            <label htmlFor="removePasskeyPassword">Password</label>
            <input
              id="removePasskeyPassword"
              type="password"
              value={removePassword}
              onChange={(e) => setRemovePassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              disabled={isRemovingPasskey}
            />
            {removePasswordError && <p className="error">{removePasswordError}</p>}
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowRemovePasskeyModal(false);
                setRemovePassword('');
                setRemovePasswordError('');
              }}
              disabled={isRemovingPasskey}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isRemovingPasskey || !removePassword}
            >
              {isRemovingPasskey ? 'Removing...' : 'Remove'}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
