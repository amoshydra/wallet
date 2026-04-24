# Wallet

A privacy-focused wallet app for storing loyalty cards, membership cards, and tickets. All data is encrypted locally in your browser using AES-256-GCM.

Get started here https://amoshydra.github.io/wallet

<br><br><br>

> ## ⚠️ Work in Progress
>
> This app is still being built! Things might break, and your data could be lost when updates roll out. Consider exporting your cards regularly as backup.

<br><br><br>

## Features

<br>

<table>
<tbody>
<tr>
<td>
  <img width="590" height="922" alt="image" src="https://github.com/user-attachments/assets/83efae5e-c2bf-4302-9833-dcf2d5ba296f" /> 
</td>
<td>
  <img width="590" height="922" alt="image" src="https://github.com/user-attachments/assets/37792f0e-93c6-4c57-8636-69b86f26e55e" /> 
</td>
<td>
  <img width="590" height="922" alt="image" src="https://github.com/user-attachments/assets/aece1240-1d82-41ec-93cc-baa899cf730a" /> 
</td>
<td>
  <img width="590" height="922" alt="image" src="https://github.com/user-attachments/assets/14df7bcc-b0d4-40e3-ae66-d005bb90bc87" />
</td>
</tr>
</tbody>
</table>

- **Encrypted Storage**: All card data is encrypted with your password using the Web Crypto API
- **Multiple Card Types**: Support for QR codes, barcodes (Code 128, Code 39, EAN, UPC, PDF417, etc.)
- **Card Images**: Add photos of physical cards
- **Export/Import**: Backup your cards as encrypted ZIP files
- **Auto-lock**: Automatically locks after 5 minutes of inactivity
- **Offline First**: No server, no cloud - everything stays on your device

<br>

## Tech Stack

- React 19 + TypeScript + Vite
- Web Crypto API for encryption
- IndexedDB for local storage
- wouter for routing

<br>

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

<br>

## Security

- Your password never leaves your device
- Data is encrypted using AES-256-GCM with PBKDF2 key derivation
- If you forget your password, your data cannot be recovered

<br>

## License

MIT
