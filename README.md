# Vaultify

A zero-knowledge password manager. All encryption and decryption happen in your browser with the Web Crypto API. The server is a "dumb" storage locker that only ever sees encrypted data.

## Features

- Zero-knowledge encryption: PBKDF2 (600k iterations) + HKDF into separate Auth and Encryption keys, AES-256-GCM vault
- Password generator using secure randomness
- Auto-lock after 5 minutes of inactivity, clipboard cleared after 20 seconds
- TOTP two-factor authentication (authenticator app)
- Breach check with Have I Been Pwned using k-anonymity
- "View raw data" button showing the encrypted text the server stores
- Light and dark themes

## Tech stack

React, Redux Toolkit, TypeScript, Vite | Node.js, Express, TypeScript | MongoDB (Mongoose) | otplib, zod, helmet

## Documentation

- [Architecture and key derivation](docs/architecture.md)
- [Threat model](docs/threat-model.md)

## Setup

Requirements: Node.js 20+, and a MongoDB database (local or MongoDB Atlas).

```bash
git clone <your-repo-url>
cd Vaultify-Project

cd server
npm install
cp .env.example .env     # then fill in the values below
npm run dev              # API on http://localhost:5000

cd ../client
npm install
npm run dev              # App on http://localhost:5173
```

### Environment variables (`server/.env`)

| Name | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Random string, at least 32 characters |
| `TOTP_ENC_KEY` | 64 hex characters (32 bytes), encrypts TOTP secrets |
| `PORT` | API port (default 5000) |
| `CLIENT_ORIGIN` | Allowed browser origin (default http://localhost:5173) |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Never commit `.env`.

## Scripts

| Where | Command | What it does |
|---|---|---|
| `server` | `npm run dev` | Start the API with auto-reload |
| `server` | `npm run typecheck` | Type-check the server |
| `client` | `npm run dev` | Start the app |
| `client` | `npm run typecheck` | Type-check the app |
| `client` | `npm run test:crypto` | Run the crypto unit tests |

## API

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | none | Health check |
| GET | `/api/auth/salt?email=` | none | KDF salt for an email |
| POST | `/api/auth/register` | none | Create account (email, salt, Auth Key) |
| POST | `/api/auth/login` | none | Log in with Auth Key (+ TOTP code) |
| GET | `/api/vault` | JWT | Get the encrypted blob |
| PUT | `/api/vault` | JWT | Save the encrypted blob |
| POST | `/api/2fa/setup` | JWT | Create a TOTP secret and QR code |
| POST | `/api/2fa/enable` | JWT | Confirm with a code to turn 2FA on |

## Project structure

```
client/   React + Redux Toolkit app (src/lib/crypto.ts holds all cryptography)
server/   Express API (routes, models, middleware)
docs/     Threat model and architecture
```

## Deployment

Deploy behind HTTPS and set `NODE_ENV=production`, so the server redirects HTTP to HTTPS and sends HSTS.