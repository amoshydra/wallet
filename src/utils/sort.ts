import type { Card } from '../types/card';

export type SortOption = 'recentlyViewed' | 'nameAsc' | 'createdAtDesc' | 'createdAtAsc';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recentlyViewed', label: 'Recently viewed' },
  { value: 'nameAsc', label: 'Name (A→Z)' },
  { value: 'createdAtDesc', label: 'Created (newest first)' },
  { value: 'createdAtAsc', label: 'Created (oldest first)' },
];

const SORT_STORAGE_KEY = 'cardSortPreference';

export function getSortPreference(): SortOption {
  try {
    const stored = localStorage.getItem(SORT_STORAGE_KEY);
    if (stored && SORT_OPTIONS.some((opt) => opt.value === stored)) {
      return stored as SortOption;
    }
  } catch {
    return 'recentlyViewed';
  }
  return 'recentlyViewed';
}

export function setSortPreference(sort: SortOption): void {
  try {
    localStorage.setItem(SORT_STORAGE_KEY, sort);
  } catch {}
}

export function sortCards(cards: Card[], sortBy: SortOption): Card[] {
  const sorted = [...cards];

  switch (sortBy) {
    case 'recentlyViewed':
      return sorted.sort((a, b) => {
        const aTime = a.lastViewedAt ?? 0;
        const bTime = b.lastViewedAt ?? 0;
        if (aTime === 0 && bTime === 0) return b.createdAt - a.createdAt;
        if (aTime === 0) return 1;
        if (bTime === 0) return -1;
        return bTime - aTime;
      });

    case 'nameAsc':
      return sorted.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );

    case 'createdAtDesc':
      return sorted.sort((a, b) => b.createdAt - a.createdAt);

    case 'createdAtAsc':
      return sorted.sort((a, b) => a.createdAt - b.createdAt);

    default:
      return sorted;
  }
}
