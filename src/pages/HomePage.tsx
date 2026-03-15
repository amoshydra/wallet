import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import DropdownMenu from '../components/DropdownMenu';
import ExportModal from '../components/ExportModal';
import ImportModal from '../components/ImportModal';
import type { Card } from '../types/card';

export default function HomePage() {
  const { getCards, lock, importCards } = useAuth();
  const [, setLocation] = useLocation();
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const cards = getCards();

  const handleImport = async (importedCards: Omit<Card, 'id' | 'createdAt'>[]) => {
    await importCards(importedCards);
  };

  const dropdownItems = [
    { label: 'Export', onClick: () => setShowExportModal(true) },
    { label: 'Import', onClick: () => setShowImportModal(true) },
  ];

  return (
    <div className="page">
      <header className="header">
        <h1>My Cards</h1>
        <div className="header-actions">
          <DropdownMenu
            trigger={<button className="btn-secondary">Menu</button>}
            items={dropdownItems}
          />
          <button
            onClick={() => lock()}
            className="btn-secondary"
          >
            Lock
          </button>
        </div>
      </header>

      {cards.length === 0 ? (
        <div className="empty-state">
          <p>No cards yet</p>
          <button
            onClick={() => setLocation('/add')}
            className="btn-primary"
          >
            Add Your First Card
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {cards.map((card: Card) => (
            <div
              key={card.id}
              className="card-item"
              onClick={() => setLocation(`/card/${card.id}`)}
            >
              {card.imageData ? (
                <img
                  src={card.imageData}
                  alt={card.name}
                  className="card-image"
                />
              ) : (
                <div className="card-placeholder">
                  <span>{card.name[0].toUpperCase()}</span>
                </div>
              )}
              <div className="card-info">
                <span className="card-name">{card.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        className="fab"
        onClick={() => setLocation('/add')}
        title="Add Card"
      >
        +
      </button>

      {showExportModal && (
        <ExportModal
          cards={cards}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showImportModal && (
        <ImportModal
          onImport={handleImport}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}
