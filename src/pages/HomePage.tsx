import { useEffect, useState } from 'react';
import { ArrowUpDown, MoreVertical } from 'lucide-react';
import DropdownMenu from '../components/DropdownMenu';
import ExportModal from '../components/ExportModal';
import ImportModal from '../components/ImportModal';
import { useAuth } from '../contexts/AuthContext';
import { useMaskedNavigation } from '../contexts/NavigationContext';
import type { Card } from '../types/card';
import {
  getSortPreference,
  setSortPreference,
  sortCards,
  type SortOption,
  SORT_OPTIONS,
} from '../utils/sort';

export default function HomePage() {
  const { getCards, importCards } = useAuth();
  const { navigate } = useMaskedNavigation();
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recentlyViewed');
  const cards = getCards();

  useEffect(() => {
    setSortBy(getSortPreference());
  }, []);

  const handleImport = async (importedCards: Omit<Card, 'id' | 'createdAt'>[]) => {
    await importCards(importedCards);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setSortPreference(newSort);
  };

  const sortedCards = sortCards(cards, sortBy);

  const menuItems = [
    { label: 'Security', onClick: () => navigate('/security') },
    { label: 'Export', onClick: () => setShowExportModal(true) },
    { label: 'Import', onClick: () => setShowImportModal(true) },
  ];

  const sortItems = SORT_OPTIONS.map((opt) => ({
    label: sortBy === opt.value ? `✓ ${opt.label}` : opt.label,
    onClick: () => handleSortChange(opt.value),
  }));

  return (
    <div className="page">
      <header className="header">
        <h1>My Cards</h1>
        <div className="header-actions">
          <DropdownMenu
            trigger={
              <button
                className="icon-btn"
                aria-label="Sort"
              >
                <ArrowUpDown size={20} />
              </button>
            }
            items={sortItems}
          />
          <DropdownMenu
            trigger={
              <button
                className="icon-btn"
                aria-label="Menu"
              >
                <MoreVertical size={20} />
              </button>
            }
            items={menuItems}
          />
          <button
            onClick={() => navigate('/unlock')}
            className="btn-secondary"
          >
            Lock
          </button>
        </div>
      </header>

      {sortedCards.length === 0 ? (
        <div className="empty-state">
          <p>No cards yet</p>
          <button
            onClick={() => navigate('/add')}
            className="btn-primary"
          >
            Add Your First Card
          </button>
        </div>
      ) : (
        <div className="card-grid sensitive">
          {sortedCards.map((card: Card) => (
            <div
              key={card.id}
              className="card-item"
              onClick={() => navigate(`/card/${card.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/card/${card.id}`);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`View ${card.name} card details`}
            >
              {card.imageData ? (
                <img
                  src={card.imageData}
                  alt=""
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
        onClick={() => navigate('/add')}
        title="Add Card"
      >
        +
      </button>

      {showExportModal && (
        <div className="sensitive">
          <ExportModal
            cards={sortedCards}
            onClose={() => setShowExportModal(false)}
          />
        </div>
      )}

      {showImportModal && (
        <div className="sensitive">
          <ImportModal
            onImport={handleImport}
            onClose={() => setShowImportModal(false)}
          />
        </div>
      )}
    </div>
  );
}
