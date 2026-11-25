# Architecture

## Dual-key derivation

```mermaid
flowchart TD
  P["Master Password"] --> K["PBKDF2-SHA256<br/>600,000 iterations + per-user salt"]
  K --> M["Master Key (256-bit)<br/>never stored, never sent"]
  M -->|"HKDF, info = vaultify/auth/v1"| A["Auth Key"]
  M -->|"HKDF, info = vaultify/enc/v1"| E["Encryption Key<br/>AES-256-GCM, non-extractable"]
  A -->|"sent over TLS"| S["Server: scrypt(Auth Key)"]
  E -->|"stays in browser memory"| C["Encrypt / decrypt vault"]
```

## Where encryption happens

```mermaid
flowchart LR
  subgraph Browser["Browser (trusted)"]
    UI["React UI"] --> CR["crypto.ts<br/>derive keys, AES-GCM"]
    CR --> MEM["Memory only:<br/>Encryption Key + decrypted entries"]
  end
  subgraph Server["Server (untrusted storage)"]
    API["Express API<br/>helmet, rate limit, zod"] --> DB[("MongoDB<br/>email, salts, auth hash,<br/>encrypted vault blob,<br/>encrypted TOTP secret")]
  end
  CR -- "Auth Key + encrypted blob only (HTTPS)" --> API
```

The line between the two boxes is the zero-knowledge boundary. Plaintext passwords, the Master Password and the Encryption Key never cross it.

## Login flow

1. Client asks `GET /api/auth/salt?email=...` and receives the KDF salt.
2. Client derives the Auth Key and Encryption Key locally.
3. Client sends the Auth Key (and a TOTP code if 2FA is on) to `POST /api/auth/login`.
4. Server verifies scrypt(Auth Key), issues a 30-minute JWT.
5. Client fetches the encrypted blob with `GET /api/vault` and decrypts it in the browser.