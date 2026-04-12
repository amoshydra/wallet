# AGENTS.md

Guidelines for AI agents working in this codebase.

## Project Overview

A React-based wallet application for storing loyalty/membership cards with encrypted local storage using IndexedDB and the Web Crypto API.

## Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **React Compiler**: Enabled via `babel-plugin-react-compiler` - no need for `useMemo`, `useCallback`, or `memo`
- **Routing**: wouter (lightweight router)
- **Storage**: idb (IndexedDB wrapper) + Web Crypto API for encryption
- **Package Manager**: pnpm (v10.19.0)
- **Node Version**: 24.14.0 (managed via Volta)

## Build/Lint/Test Commands

```bash
# Development
pnpm run dev              # Start dev server with HMR

# Build
pnpm run build            # TypeScript check + Vite build (tsc -b && vite build)

# Linting & Formatting
pnpm run lint             # Check for lint issues (oxlint)
pnpm run lint:fix         # Auto-fix lint issues (oxlint --fix)
pnpm run fmt              # Check formatting (oxfmt --check)
pnpm run fmt:fix          # Auto-fix formatting (oxfmt)

# Preview
pnpm run preview          # Preview production build

# E2E Testing
pnpm run test:e2e        # Run Playwright E2E tests
pnpm run test:e2e:ui     # Run E2E tests with Playwright UI inspector

# Pre-commit Hooks
# Lefthook automatically runs lint:fix and fmt:fix on staged files before commit
```

## Code Style Guidelines

### Imports

```typescript
// Use verbatimModuleSyntax - import types explicitly with `type` keyword
import { createContext, useCallback, type ReactNode } from "react";
import type { Card } from "../types/card";

// React imports: use named imports, not default import
import { useState, useEffect } from "react"; // Preferred
// NOT: import React, { useState } from 'react';

// External imports first, then internal imports (separate by blank line)
import { useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
```

### Formatting

- **Quotes**: Single quotes for strings
- **JSX**: Single attribute per line
- **No comments**: Do not add comments unless explicitly requested

```tsx
// GOOD
<button
  onClick={() => setLocation('/add')}
  className="btn-primary"
>
  Add Card
</button>

// BAD
<button onClick={() => setLocation('/add')} className="btn-primary">
  Add Card
</button>
```

### TypeScript

- **Strict mode enabled**: All strict TypeScript checks are on
- **No unused locals/parameters**: Will cause build errors
- **Type annotations**: Prefer explicit return types for functions exported from modules
- **Interface vs Type**: Use `interface` for object shapes, `type` for unions/utility types

```typescript
// Interface for object shapes
export interface Card {
  id: string;
  name: string;
}

// Type for unions
export type CodeType = "qr" | "code128" | "code39";
```

### Component Conventions

- **Page components**: Default export from `src/pages/`
- **Reusable components**: Default export from `src/components/`
- **Contexts**: Named export `Provider` and `useX` hook
- **Utilities**: Named exports from `src/utils/`
- **Types**: Named exports from `src/types/`

```typescript
// pages/HomePage.tsx
export default function HomePage() { ... }

// components/ErrorBoundary.tsx
export default class ErrorBoundary extends Component { ... }

// contexts/AuthContext.tsx
export function AuthProvider({ children }: { children: ReactNode }) { ... }
export function useAuth() { ... }

// utils/crypto.ts
export async function encrypt(data: string, key: CryptoKey) { ... }
```

### React Patterns

- **No memoization needed**: React Compiler handles `useMemo`, `useCallback`, and `memo` automatically
- **Functional components**: Use function declarations, not arrow functions for components
- **State naming**: Use descriptive names like `isLoading`, `isUnlocked`, `hasError`

```typescript
// GOOD
export default function HomePage() {
  const { getCards, lock } = useAuth();
  return ( ... );
}

// BAD
const HomePage = () => { ... };
export default HomePage;
```

### Error Handling

- Use try/catch in async functions
- Extract error message: `e instanceof Error ? e.message : 'Unknown error'`
- Use console.error for logging errors
- Show user-friendly error messages in UI

```typescript
try {
  await someAsyncOperation();
} catch (e) {
  const message = e instanceof Error ? e.message : "Unknown error";
  setError(`Operation failed: ${message}`);
  console.error("Operation error:", e);
}
```

### File Naming

- **Components/Pages**: PascalCase with `.tsx` extension (e.g., `HomePage.tsx`, `CodeDisplay.tsx`)
- **Utilities**: camelCase with `.ts` extension (e.g., `crypto.ts`, `db.ts`)
- **Types**: camelCase with `.ts` extension (e.g., `card.ts`)
- **Styles**: lowercase with `.css` extension (e.g., `index.css`)

### CSS Classes

Use semantic class names following BEM-like patterns:

- Page containers: `.page`
- Layout elements: `.header`, `.card-grid`, `.card-item`
- Components: `.btn-primary`, `.btn-secondary`, `.btn-text`
- States: `.empty-state`, `.error-boundary`

## Project Structure

```
src/
├── App.tsx              # Main app with routing
├── main.tsx             # Entry point
├── index.css            # Global styles
├── App.css              # App-specific styles
├── components/          # Reusable components
│   ├── CodeDisplay.tsx
│   ├── DropdownMenu.tsx
│   ├── ErrorBoundary.tsx
│   ├── ExportModal.tsx
│   └── ImportModal.tsx
├── contexts/            # React contexts
│   ├── AuthContext.tsx
│   └── NavigationContext.tsx
├── pages/               # Route pages
│   ├── AddCardPage.tsx
│   ├── CardDetailPage.tsx
│   ├── CodePage.tsx
│   ├── HomePage.tsx
│   ├── SecurityPage.tsx
│   ├── SetupPage.tsx
│   └── UnlockPage.tsx
├── types/               # TypeScript type definitions
│   ├── auth.ts
│   ├── card.ts
│   └── pdf417-generator.d.ts
└── utils/               # Utility functions
    ├── crypto.ts
    ├── db.ts
    ├── sort.ts
    ├── uuid.ts
    ├── webauthn.ts
    └── zip.ts
tests/
└── e2e/                 # Playwright E2E tests
    ├── auth.spec.ts
    ├── delete-card.spec.ts
    ├── edge.spec.ts
    ├── export-import.spec.ts
    ├── lock.spec.ts
    ├── passkey-password.spec.ts
    ├── security-page.spec.ts
    ├── security.spec.ts
    ├── session.spec.ts
    ├── setup-flow.spec.ts
    ├── sort.spec.ts
    └── helpers/           # Test helpers
        ├── auth.ts
        ├── db.ts
        └── storage.ts
```

## Important Notes

- **Pre-commit hooks**: Lefthook automatically fixes linting and formatting on commit
- **React Compiler**: Do not add `useMemo`, `useCallback`, or `memo` - the compiler handles this
- **Encryption**: User password encrypts all card data stored in IndexedDB
- **E2E Tests**: Tests are located in `tests/e2e/` and use Playwright browser automation
- **CI/CD**: GitHub Actions runs lint, format check, tests, and deploys to GitHub Pages on push to main
