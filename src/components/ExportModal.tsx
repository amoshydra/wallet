import { useState } from 'react';
import type { Card } from '../types/card';
import { createEncryptedZip, generateCSVPreview } from '../utils/zip';

interface ExportModalProps {
  cards: Card[];
  onClose: () => void;
}

export default function ExportModal({ cards, onClose }: ExportModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const csvPreview = generateCSVPreview(cards);
  const hasMoreCards = cards.length > 5;

  const handleExport = async () => {
    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const { blob, filename } = await createEncryptedZip(cards, password);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setError(`Export failed: ${message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="modal modal-export"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Export Cards</h3>

        <div className="csv-preview">
          <label>Preview (CSV format):</label>
          <pre>{csvPreview}</pre>
          {hasMoreCards && <p className="preview-note">... and {cards.length - 5} more cards</p>}
        </div>

        <div className="form-group">
          <label>Export Password (optional)</label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty for unencrypted ZIP"
            />
            <button
              type="button"
              className="btn-text"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="form-hint">
            This password is separate from your app password. You will need it to import the
            exported file.
          </p>
        </div>

        {password && (
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
            />
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="btn-primary"
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Download ZIP'}
          </button>
        </div>
      </div>
    </div>
  );
}
