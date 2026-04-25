import type { Card } from '../types/card';

export interface ColorGradient {
  name: string;
  light: { start: string; end: string };
  dark: { start: string; end: string };
}

export const COLOR_PALETTE: ColorGradient[] = [
  {
    name: 'Purple',
    light: { start: '#667eea', end: '#764ba2' },
    dark: { start: '#4a5bb5', end: '#5a3a8a' },
  },
  {
    name: 'Blue',
    light: { start: '#2196F3', end: '#1565C0' },
    dark: { start: '#1976D2', end: '#0D47A1' },
  },
  {
    name: 'Teal',
    light: { start: '#009688', end: '#00695C' },
    dark: { start: '#00796B', end: '#004D40' },
  },
  {
    name: 'Green',
    light: { start: '#4CAF50', end: '#2E7D32' },
    dark: { start: '#388E3C', end: '#1B5E20' },
  },
  {
    name: 'Orange',
    light: { start: '#FF9800', end: '#E65100' },
    dark: { start: '#F57C00', end: '#BF360C' },
  },
  {
    name: 'Red',
    light: { start: '#F44336', end: '#C62828' },
    dark: { start: '#D32F2F', end: '#B71C1C' },
  },
  {
    name: 'Pink',
    light: { start: '#E91E63', end: '#AD1457' },
    dark: { start: '#C2185B', end: '#880E4F' },
  },
  {
    name: 'Indigo',
    light: { start: '#3F51B5', end: '#283593' },
    dark: { start: '#303F9F', end: '#1A237E' },
  },
  {
    name: 'Cyan',
    light: { start: '#00BCD4', end: '#00838F' },
    dark: { start: '#0097A7', end: '#006064' },
  },
  {
    name: 'Amber',
    light: { start: '#FFC107', end: '#FF8F00' },
    dark: { start: '#FFA000', end: '#FF6F00' },
  },
  {
    name: 'Brown',
    light: { start: '#795548', end: '#4E342E' },
    dark: { start: '#5D4037', end: '#3E2723' },
  },
  {
    name: 'Gray',
    light: { start: '#607D8B', end: '#37474F' },
    dark: { start: '#455A64', end: '#263238' },
  },
];

export const CUSTOM_COLOR_INDEX = -1;

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

export function getDefaultColorIndex(cardName: string): number {
  return hashString(cardName) % COLOR_PALETTE.length;
}

export function getCardGradient(card: Card): { start: string; end: string } {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (card.colorIndex === CUSTOM_COLOR_INDEX && card.customColor) {
    const base = card.customColor;
    const darker = adjustColorBrightness(base, -30);
    return { start: base, end: darker };
  }

  const index = card.colorIndex ?? getDefaultColorIndex(card.name);
  const palette = COLOR_PALETTE[index % COLOR_PALETTE.length];

  return isDark ? palette.dark : palette.light;
}

function adjustColorBrightness(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(clean.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(clean.substring(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(clean.substring(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
