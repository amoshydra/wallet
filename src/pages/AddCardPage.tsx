import { useEffect, useState, type ChangeEvent, type SubmitEvent } from 'react';
import { useLocation, useRoute } from 'wouter';
import CodeDisplay from '../components/CodeDisplay';
import { useAuth } from '../contexts/AuthContext';
import type { Card, CodeType } from '../types/card';

export default function AddCardPage() {
  const { addCard, updateCard, getCards } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/edit/:id');

  const cardId = match ? params?.id : undefined;
  const isEditing = !!cardId;

  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [codeType, setCodeType] = useState<CodeType>('qr');
  const [imageData, setImageData] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing && cardId) {
      const cards = getCards();
      const card = cards.find((c: Card) => c.id === cardId);
      if (card) {
        setName(card.name);
        setNumber(card.number || '');
        setCodeType(card.codeType || 'qr');
        setImageData(card.imageData || null);
      }
    }
  }, [isEditing, cardId, getCards]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!name.trim() || !number.trim()) return;

    setIsSubmitting(true);
    try {
      if (isEditing && cardId) {
        await updateCard(cardId, {
          name: name.trim(),
          number: number.trim(),
          codeType,
          imageData: imageData || undefined,
        });
        setLocation(`/card/${cardId}`);
      } else {
        await addCard({
          name: name.trim(),
          number: number.trim(),
          codeType,
          imageData: imageData || undefined,
        });
        setLocation('/');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page">
      <header className="Header">
        <button
          onClick={() => setLocation('/')}
          className="btn-text"
        >
          ← Back
        </button>
        <h1>{isEditing ? 'Edit Card' : 'Add Card'}</h1>
      </header>

      <form
        onSubmit={handleSubmit}
        className="form"
      >
        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Starbucks Rewards"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="number">Card Number *</label>
          <input
            id="number"
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Card number"
            required
          />
        </div>

        <div className="form-group">
          <CodeDisplay
            value={number || 'Enter card number'}
            codeType={codeType}
            onCodeTypeChange={setCodeType}
            showSelector={true}
            standalone={true}
          />
        </div>

        <div className="form-group">
          <label htmlFor="image">Image (optional)</label>
          <input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
          {imageData && (
            <img
              src={imageData}
              alt="Preview"
              className="image-preview"
            />
          )}
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting || !name.trim() || !number.trim()}
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Card' : 'Save Card'}
        </button>
      </form>
    </div>
  );
}
