import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMaskedNavigation } from '../contexts/NavigationContext';

export default function SecurityPage() {
  const { hasPasskey, canUsePasskey, setupPasskey } = useAuth();
  const { navigate } = useMaskedNavigation();
  const [isSettingUpPasskey, setIsSettingUpPasskey] = useState(false);

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

          {hasPasskey && <p style={{ color: '#22c55e' }}>Quick Unlock is enabled ✓</p>}

          {!canUsePasskey && (
            <p style={{ color: '#666' }}>Quick Unlock is not supported on this device</p>
          )}
        </section>

        <section>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Password</h2>
          <p style={{ color: '#666' }}>Change password coming soon</p>
        </section>
      </div>
    </div>
  );
}
