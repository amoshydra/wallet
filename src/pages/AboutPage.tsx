import { PromoVideo } from '../components/PromoVideo';
import { useMaskedNavigation } from '../contexts/NavigationContext';

export default function AboutPage() {
  const { navigate } = useMaskedNavigation();

  return (
    <div className="page">
      <header className="header">
        <div className="header-l2">
          <button
            onClick={() => navigate('/')}
            className="btn-text"
          >
            ← Back
          </button>
          <h1>About</h1>
        </div>
      </header>

      <div className="prose-card">
        <PromoVideo />
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          A secure wallet for storing loyalty/membership cards.
        </p>
        <a
          href="https://github.com/amoshydra/wallet"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
          style={{ marginTop: '16px', display: 'inline-block' }}
        >
          View on GitHub →
        </a>
        <p
          style={{
            marginTop: '1rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontFamily: 'monospace',
          }}
        >
          Revision: {import.meta.env.VITE_APP_COMMIT_SHA || 'dev'}
        </p>
      </div>
    </div>
  );
}
