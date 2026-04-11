# Wallet

> **⚠️ Work in Progress**  
> This app is still being built! Things might break, and your data could be lost when updates roll out. Consider exporting your cards regularly as backup.

A privacy-focused wallet app for storing loyalty cards, membership cards, and tickets. All data is encrypted locally in your browser using AES-256-GCM.

## Features

- **Encrypted Storage**: All card data is encrypted with your password using the Web Crypto API
- **Multiple Card Types**: Support for QR codes, barcodes (Code 128, Code 39, EAN, UPC, PDF417, etc.)
- **Card Images**: Add photos of physical cards
- **Export/Import**: Backup your cards as encrypted ZIP files
- **Auto-lock**: Automatically locks after 5 minutes of inactivity
- **Offline First**: No server, no cloud - everything stays on your device

## Tech Stack

- React 19 + TypeScript + Vite
- Web Crypto API for encryption
- IndexedDB for local storage
- wouter for routing

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm run dev

# Run tests
pnpm run test:e2e

# Build for production
pnpm run build
```

## Security

- Your password never leaves your device
- Data is encrypted using AES-256-GCM with PBKDF2 key derivation
- If you forget your password, your data cannot be recovered

## License

MIT
