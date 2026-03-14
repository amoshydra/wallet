import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import CodeDisplay from "../components/CodeDisplay";
import type { Card } from "../types/card";

type Tab = "code" | "details";

export default function CardDetailPage() {
  const { getCards, deleteCard, lock } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/card/:id");
  const [showNumber, setShowNumber] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("code");
  
  const cards = getCards();
  const card: Card | undefined = cards.find((c) => c.id === params?.id);

  if (!match || !card) {
    return (
      <div className="page">
        <p>Card not found</p>
        <button onClick={() => setLocation("/")} className="btn-primary">
          Go Home
        </button>
      </div>
    );
  }

  const hasCode = !!card.number;
  
  if (activeTab === "code" && !hasCode) {
    setActiveTab("details");
  }

  const handleCopy = async () => {
    if (card.number) {
      await navigator.clipboard.writeText(card.number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = async () => {
    await deleteCard(card.id);
    setLocation("/");
  };

  return (
    <div className="page">
      <header className="header">
        <button onClick={() => setLocation("/")} className="btn-text">
          ← Back
        </button>
        <button onClick={() => lock()} className="btn-secondary">
          Lock
        </button>
      </header>

      {hasCode && (
        <div className="detail-tabs">
          <button
            className={`tab ${activeTab === "code" ? "active" : ""}`}
            onClick={() => setActiveTab("code")}
          >
            Code
          </button>
          <button
            className={`tab ${activeTab === "details" ? "active" : ""}`}
            onClick={() => setActiveTab("details")}
          >
            Details
          </button>
        </div>
      )}

      {activeTab === "code" && hasCode ? (
        <CodeDisplay value={card.number!} cardType={card.type} />
      ) : (
        <div className="card-detail">
          {card.imageData ? (
            <img src={card.imageData} alt={card.name} className="card-detail-image" />
          ) : (
            <div className="card-detail-placeholder">
              <span>{card.name[0].toUpperCase()}</span>
            </div>
          )}
          
          <div className="card-detail-info">
            <span className="card-type-badge">{card.type}</span>
            <h2>{card.name}</h2>
            
            {card.number && (
              <div className="card-number-container">
                <span className="card-number-label">Card Number</span>
                <div className="card-number-row">
                  <span 
                    className="card-number"
                    onClick={handleCopy}
                    title="Click to copy"
                  >
                    {showNumber ? card.number : "•".repeat(card.number.length)}
                  </span>
                  <button 
                    onClick={() => setShowNumber(!showNumber)}
                    className="btn-text"
                  >
                    {showNumber ? "Hide" : "Show"}
                  </button>
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
      )}
      
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
              <button onClick={handleDelete} className="btn-danger">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
