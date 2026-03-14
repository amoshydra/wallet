import { useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import type { Card } from "../types/card";

export default function HomePage() {
  const { getCards, lock } = useAuth();
  const [, setLocation] = useLocation();
  const cards = getCards();

  return (
    <div className="page">
      <header className="header">
        <h1>My Cards</h1>
        <button onClick={() => lock()} className="btn-secondary">
          Lock
        </button>
      </header>
      
      {cards.length === 0 ? (
        <div className="empty-state">
          <p>No cards yet</p>
          <button 
            onClick={() => setLocation("/add")} 
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
                <img src={card.imageData} alt={card.name} className="card-image" />
              ) : (
                <div className="card-placeholder">
                  <span>{card.type[0].toUpperCase()}</span>
                </div>
              )}
              <div className="card-info">
                <span className="card-name">{card.name}</span>
                <span className="card-type">{card.type}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <button 
        className="fab" 
        onClick={() => setLocation("/add")}
        title="Add Card"
      >
        +
      </button>
    </div>
  );
}
