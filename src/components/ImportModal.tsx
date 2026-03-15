import { useState, useRef } from 'react';
import type { Card } from '../types/card';
import { readEncryptedZip, type ImportedCard } from '../utils/zip';

interface ImportModalProps {
  onImport: (cards: Omit<Card, 'id' | 'createdAt'>[]) => Promise<void>;
  onClose: () => void;
}

export default function ImportModal({ onImport, onClose }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [previewCards, setPreviewCards] = useState<ImportedCard[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreviewCards([]);
    setErrors([]);

    if (!selectedFile.name.endsWith('.zip')) {
      setErrors(['Please select a ZIP file']);
      return;
    }
  };

  const handleReadFile = async () => {
    if (!file) return;

    setIsReading(true);
    setPreviewCards([]);
    setErrors([]);

    try {
      const result = await readEncryptedZip(file, password);
      setPreviewCards(result.cards);
      setErrors(result.errors);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setErrors([`Failed to read file: ${message}`]);
    } finally {
      setIsReading(false);
    }
  };

  const handleImport = async () => {
    if (previewCards.length === 0) return;

    setIsImporting(true);
    try {
      const cardsToAdd = previewCards.map((card) => ({
        name: card.name,
        number: card.number,
        codeType: card.codeType,
        imageData: card.imageData,
      }));
      await onImport(cardsToAdd);
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setErrors([`Import failed: ${message}`]);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="modal modal-import"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Import Cards</h3>

        <div className="form-group">
          <label>Select ZIP File</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            disabled={isReading || isImporting}
          />
        </div>

        <div className="form-group">
          <label>Password (if encrypted)</label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password for encrypted ZIP"
              disabled={isReading || isImporting}
            />
            <button
              type="button"
              className="btn-text"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button
          onClick={handleReadFile}
          className="btn-secondary"
          disabled={!file || isReading || isImporting}
        >
          {isReading ? 'Reading...' : 'Preview Import'}
        </button>

        {errors.length > 0 && (
          <div className="import-errors">
            {errors.map((error, index) => (
              <p
                key={index}
                className="error"
              >
                {error}
              </p>
            ))}
          </div>
        )}

        {previewCards.length > 0 && (
          <div className="import-preview">
            <label>Cards to import ({previewCards.length}):</label>
            <div className="import-card-list">
              {previewCards.map((card, index) => (
                <div
                  key={index}
                  className="import-card-item"
                >
                  <span className="import-card-name">{card.name}</span>
                  {card.number && <span className="import-card-number">{card.number}</span>}
                  {card.imageData && <span className="import-card-badge">has image</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={isImporting}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            className="btn-primary"
            disabled={previewCards.length === 0 || isImporting}
          >
            {isImporting ? 'Importing...' : `Import ${previewCards.length} Cards`}
          </button>
        </div>
      </div>
    </div>
  );
}
