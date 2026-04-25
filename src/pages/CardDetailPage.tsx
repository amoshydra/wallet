import { useEffect, useRef, useState } from 'react';
import { useRoute } from 'wouter';
import CodeDisplay from '../components/CodeDisplay';
import { useAuth } from '../contexts/AuthContext';
import { useMaskedNavigation } from '../contexts/NavigationContext';
import type { Card } from '../types/card';
import { getCardGradient } from '../utils/colors';

export default function CardDetailPage() {
  const { getCards, deleteCard, updateCard } = useAuth();
  const { navigate } = useMaskedNavigation();
  const [match, params] = useRoute('/card/:id');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const copiedTimeoutRef = useRef(-1);
  const [copied, setCopied] = useState(false);
  const isDeletingRef = useRef(false);

  const cards = getCards();
  const card: Card | undefined = cards.find((c) => c.id === params?.id);

  useEffect(() => {
    if (card && !isDeletingRef.current) {
      updateCard(card.id, { lastViewedAt: Date.now() });
    }
  }, [card?.id, updateCard]);

  if (!match || !card) {
    return (
      <div className="page">
        <p>Card not found</p>
        <button
          onClick={() => navigate('/')}
          className="btn-primary"
        >
          Go Home
        </button>
      </div>
    );
  }

  const handleCopy = async () => {
    clearTimeout(copiedTimeoutRef.current);
    setCopied(false);
    if (card.number) {
      await navigator.clipboard.writeText(card.number);
      setCopied(true);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCopy();
    }
  };

  const handleDelete = async () => {
    isDeletingRef.current = true;
    await deleteCard(card.id);
    navigate('/');
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate(`/edit/${card.id}`)}
            className="btn-secondary"
          >
            Edit
          </button>
          <button
            onClick={() => navigate('/unlock')}
            className="btn-secondary"
          >
            Lock
          </button>
        </div>
      </header>

      <div className="sensitive prose">
        {card.number && (
          <CodeDisplay
            value={card.number}
            codeType={card.codeType}
            showSelector={false}
            // fullWidth={true}
          />
        )}

        <div
          className="card-detail"
          style={{ marginTop: 20 }}
        >
          {card.imageData ? (
            <img
              src={card.imageData}
              alt={card.name}
              className="card-detail-image"
            />
          ) : (
            <div
              className="card-detail-placeholder"
              style={
                {
                  '--card-gradient-start': getCardGradient(card).start,
                  '--card-gradient-end': getCardGradient(card).end,
                } as React.CSSProperties
              }
            >
              <span>{card.name[0].toUpperCase()}</span>
            </div>
          )}

          <div className="card-detail-info">
            <h2>{card.name}</h2>

            {card.number && (
              <div
                className="card-number-container"
                onClick={handleCopy}
                onKeyDown={handleCopyKeyDown}
                role="button"
                tabIndex={0}
                aria-label={`Copy card number for ${card.name}`}
              >
                <span className="card-number-label">Card Number</span>
                <div className="card-number-row">
                  <span
                    className="card-number"
                    title="Click to copy"
                  >
                    {card.number}
                  </span>
                </div>
                {copied && <span className="copied-text">Copied!</span>}
              </div>
            )}

            <div className="card-actions">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn-danger"
              >
                Delete Card
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal sensitive">
            <h3>Delete Card?</h3>
            <p>Are you sure you want to delete "{card.name}"? This cannot be undone.</p>
            <div className="modal-actions">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
