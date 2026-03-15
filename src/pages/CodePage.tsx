import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import CodeDisplay from '../components/CodeDisplay';
import type { Card } from '../types/card';

export default function CodePage() {
  const { getCards } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/card/:id/code');

  const cards = getCards();
  const card: Card | undefined = cards.find((c) => c.id === params?.id);

  const [codeValue, setCodeValue] = useState(card?.number || '');
  const [manualValue, setManualValue] = useState('');
  const [useManual, setUseManual] = useState(!card?.number);

  useEffect(() => {
    if (card?.number) {
      setCodeValue(card.number);
    }
  }, [card]);

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

  const handleGenerate = () => {
    if (manualValue.trim()) {
      setCodeValue(manualValue.trim());
      setUseManual(false);
    }
  };

  return (
    <div className="page">
      <header className="header">
        <button
          onClick={() => setLocation(`/card/${card.id}`)}
          className="btn-text"
        >
          ← Back
        </button>
        <h1>Show Code</h1>
      </header>

      {!codeValue ? (
        <div className="form">
          <p className="info-text">No card number stored. Enter data to generate code:</p>
          <div className="form-group">
            <label htmlFor="manual-code">Data to encode</label>
            <input
              id="manual-code"
              type="text"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="Enter data"
            />
          </div>
          <button
            onClick={handleGenerate}
            className="btn-primary"
            disabled={!manualValue.trim()}
          >
            Generate Code
          </button>
        </div>
      ) : (
        <>
          <CodeDisplay
            value={codeValue}
            codeType={card.codeType}
          />

          <div className="code-actions">
            <button
              onClick={() => setUseManual(!useManual)}
              className="btn-secondary"
            >
              {useManual ? 'Use Card Number' : 'Enter Different Data'}
            </button>

            {useManual && (
              <div
                className="form-group"
                style={{ marginTop: 16 }}
              >
                <label htmlFor="manual-input">Enter data</label>
                <input
                  id="manual-input"
                  type="text"
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  placeholder="Enter data to encode"
                />
                <button
                  onClick={handleGenerate}
                  className="btn-primary"
                  style={{ marginTop: 8 }}
                  disabled={!manualValue.trim()}
                >
                  Update Code
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
