import { useMaskedNavigation } from '../contexts/NavigationContext';

export default function AboutPage() {
  const { navigate } = useMaskedNavigation();

  return (
    <div className="page">
      <header className="header">
        <button
          onClick={() => navigate(-1 as never)}
          className="btn-text"
        >
          ← Back
        </button>
        <h1>About</h1>
        <div style={{ width: 60 }} />
      </header>

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
    </div>
  );
}
