# Vaultify Threat Model

## What happens if the user forgets their Master Password?

**The vault is lost forever. This is a feature, not a bug.**

The Encryption Key only exists as the output of PBKDF2 and HKDF applied to the Master Password. The server stores no key, no copy of the password, and nothing that can decrypt the vault blob.

A "Reset password" button would need a second way to reach the key: an escrowed key, an admin override, or a recovery email that unlocks data. That second path is exactly what an attacker, a rogue employee, or a court order would use. If Vaultify can recover your vault, so can anyone who breaks into Vaultify. Permanent loss is the price of "nobody but you can read this".

What we do instead:
- The sign-up screen warns that the password cannot be recovered.
- Users are encouraged to choose a long passphrase they can remember.
- A future option is a Recovery Key generated in the browser and kept offline by the user.

## What is protected

| Asset | Where it lives | Protection |
|---|---|---|
| Master Password | User's head and browser memory while typing | Never stored, never sent |
| Encryption Key | Browser memory only | Non-extractable AES-GCM CryptoKey, cleared on lock |
| Vault entries | Encrypted blob in MongoDB | AES-256-GCM, fresh random IV per save |
| Auth Key | Sent to server over TLS | Hashed again with scrypt before storing |
| TOTP secret | MongoDB | Encrypted at rest with AES-256-GCM (server key) |

## Trust boundary

Everything on the client side of the boundary (key derivation, encryption, decryption) runs in the browser using the Web Crypto API. The server only ever receives the Auth Key and an encrypted blob. See `docs/architecture.md`.

## Threats and outcomes

| Threat | Outcome |
|---|---|
| Database stolen | Attacker gets emails, salts, scrypt hashes, encrypted blobs. Each password guess costs a 600,000-iteration PBKDF2 run. The Auth Key hash does not reveal the Encryption Key because HKDF derives them with different labels. |
| Malicious or curious admin | Same as above. Nothing readable. |
| Network attacker | HTTPS is forced in production (redirect + HSTS). Only the Auth Key and ciphertext cross the network. |
| Server tampers with the blob | AES-GCM authentication fails on decrypt and the client refuses the data. |
| Stolen Auth Key | Cannot log in without a TOTP code when 2FA is on, and cannot decrypt anything. |
| Brute-force login | Rate limiting (20 attempts per 15 minutes on login and register). |
| Account enumeration | `/api/auth/salt` returns a stable fake salt for unknown emails, and login errors are identical for wrong email and wrong password. |
| Weak master password | The main remaining risk. An offline attack on a stolen blob is limited only by password strength and KDF cost. |
| Unattended unlocked device | Auto-lock clears the key and all plaintext from memory after 5 minutes of inactivity. Copied passwords are cleared from the clipboard after 20 seconds. |
| Malicious JavaScript (XSS) | Out of scope for zero-knowledge: script running in the page can read decrypted data. Mitigated with Helmet security headers, no raw HTML rendering, and pinned dependencies. |
| Breach check privacy | Only the first 5 characters of a SHA-1 hash are sent to Have I Been Pwned (k-anonymity). Passwords and usernames are never sent. |

## Known limitations

- Two-factor authentication protects access to the server, not the encryption itself.
- Emails are stored in plain text so users can sign in.
- The session token is held in memory only, so a page refresh signs the user out.
- The server delivers the JavaScript that does the cryptography, so users trust the host to serve unmodified code.
- Concurrent saves from two devices use last-write-wins.
- No account deletion or master-password change yet.