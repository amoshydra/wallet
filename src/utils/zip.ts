import {
  BlobReader,
  BlobWriter,
  TextReader,
  TextWriter,
  ZipReader,
  ZipWriter,
  type FileEntry,
} from '@zip.js/zip.js';
import type { Card } from '../types/card';

function escapeCSVField(field: string | undefined): string {
  if (field === undefined || field === null) {
    return '';
  }
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function cardsToCSV(cards: Card[]): string {
  const headers = ['id', 'name', 'number', 'codeType', 'createdAt', 'imageFile'];
  const rows = cards.map((card) => {
    const imageFile = card.imageData ? `images/${card.id}.png` : '';
    return [
      escapeCSVField(card.id),
      escapeCSVField(card.name),
      escapeCSVField(card.number),
      escapeCSVField(card.codeType),
      escapeCSVField(String(card.createdAt)),
      escapeCSVField(imageFile),
    ].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

function parseCSV(csvText: string): Array<Record<string, string>> {
  const lines = csvText.split('\n').filter((line) => line.trim());
  if (lines.length < 2) {
    return [];
  }

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }
    result.push(current);
    return result;
  };

  const headers = parseCSVLine(lines[0]);
  const data: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }

  return data;
}

export interface ExportResult {
  blob: Blob;
  filename: string;
}

export async function createEncryptedZip(cards: Card[], password: string): Promise<ExportResult> {
  const zipWriter = new ZipWriter(new BlobWriter('application/zip'));

  const csvContent = cardsToCSV(cards);
  await zipWriter.add('cards.csv', new TextReader(csvContent), {
    password: password || undefined,
    encryptionStrength: 3,
  });

  for (const card of cards) {
    if (card.imageData) {
      const imageFile = `images/${card.id}.png`;
      const base64Data = card.imageData.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      await zipWriter.add(imageFile, new BlobReader(new Blob([bytes])), {
        password: password || undefined,
        encryptionStrength: 3,
      });
    }
  }

  const zipBlob = await zipWriter.close();
  const date = new Date();
  const filename = `wallet-export-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.zip`;

  return { blob: zipBlob, filename };
}

export interface ImportedCard {
  name: string;
  number?: string;
  codeType?: import('../types/card').CodeType;
  imageData?: string;
}

export interface ImportResult {
  cards: ImportedCard[];
  errors: string[];
}

export async function readEncryptedZip(file: File, password: string): Promise<ImportResult> {
  const cards: ImportedCard[] = [];
  const errors: string[] = [];

  try {
    const zipReader = new ZipReader(new BlobReader(file));
    const entries = await zipReader.getEntries();

    if (entries.length === 0) {
      errors.push('ZIP file is empty');
      await zipReader.close();
      return { cards, errors };
    }

    const fileEntries = entries.filter((e): e is FileEntry => e.directory === false);

    const csvEntry = fileEntries.find((e) => e.filename === 'cards.csv');
    if (!csvEntry) {
      errors.push('cards.csv not found in ZIP');
      await zipReader.close();
      return { cards, errors };
    }

    const csvText = await csvEntry.getData(new TextWriter(), {
      password: password || undefined,
    });

    const rows = parseCSV(csvText);

    for (const row of rows) {
      const card: ImportedCard = {
        name: row.name || 'Unnamed Card',
        number: row.number || undefined,
        codeType: (row.codeType as import('../types/card').CodeType) || undefined,
        imageData: undefined,
      };

      if (row.imageFile) {
        const imageEntry = fileEntries.find((e) => e.filename === row.imageFile);
        if (imageEntry) {
          try {
            const imageBlob = await imageEntry.getData(new BlobWriter('image/png'), {
              password: password || undefined,
            });
            const imageData = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(imageBlob);
            });
            card.imageData = imageData;
          } catch {
            errors.push(`Failed to read image for card "${card.name}"`);
          }
        }
      }

      cards.push(card);
    }

    await zipReader.close();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    errors.push(`Failed to read ZIP: ${message}`);
  }

  return { cards, errors };
}

export function generateCSVPreview(cards: Card[]): string {
  return cardsToCSV(cards.slice(0, 5));
}
