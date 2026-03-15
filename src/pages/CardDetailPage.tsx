import { useRef, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import CodeDisplay from '../components/CodeDisplay';
import { useAuth } from '../contexts/AuthContext';
import type { Card } from '../types/card';

export default function CardDetailPage() {
  const { getCards, deleteCard, lock } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/card/:id');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const copiedTimeoutRef = useRef(-1);
  const [copied, setCopied] = useState(false);

  const cards = getCards();
  const card: Card | undefined = cards.find((c) => c.id === params?.id);

  if (!match || !card) {
    return (
      <div className="page">
        <p>Card not found</p>
        <button
          onClick={() => setLocation('/')}
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

  const handleDelete = async () => {
    await deleteCard(card.id);
    setLocation('/');
  };

  return (
    <div className="page">
      <header className="header">
        <button
          onClick={() => setLocation('/')}
          className="btn-text"
        >
          ← Back
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setLocation(`/edit/${card.id}`)}
            className="btn-secondary"
          >
            Edit
          </button>
          <button
            onClick={() => lock()}
            className="btn-secondary"
          >
            Lock
          </button>
        </div>
      </header>

      {card.number && (
        <CodeDisplay
          value={card.number}
          codeType={card.codeType}
          showSelector={false}
          fullWidth={true}
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
          <div className="card-detail-placeholder">
            <span>{card.name[0].toUpperCase()}</span>
          </div>
        )}

        <div className="card-detail-info">
          <h2>{card.name}</h2>

          {card.number && (
            <div
              className="card-number-container"
              onClick={handleCopy}
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

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
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
