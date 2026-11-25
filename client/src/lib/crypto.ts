/**
 * Vaultify crypto module (Web Crypto API only).
 *
 *   Master Password + per-user salt
 *        | PBKDF2-SHA256, 600,000 iterations
 *        v
 *   Master Key (256 bits, never stored, never sent)
 *        | HKDF-SHA256 with a different `info` label per key
 *        |--> Auth Key        sent to the server to log in
 *        '--> Encryption Key  AES-256-GCM, non-extractable, stays in the browser
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const PBKDF2_ITERATIONS = 600_000;
const AUTH_INFO = 'vaultify/auth/v1';
const ENC_INFO = 'vaultify/enc/v1';

export interface DerivedKeys {
  authKey: string; // base64, safe to send to the server
  encKey: CryptoKey; // AES-GCM key, never leaves the browser
}

interface EncryptedBlob {
  v: 1;
  iv: string;
  ct: string;
}

export const toBase64 = (bytes: ArrayBuffer | Uint8Array): string => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const b of view) binary += String.fromCharCode(b);
  return btoa(binary);
};

export const fromBase64 = (text: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(text);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
};

/** 16 random bytes as base64. The salt is public and is stored on the server. */
export const randomSalt = (): string => toBase64(crypto.getRandomValues(new Uint8Array(16)));

/** Derive the Auth Key and the Encryption Key from the master password. */
export async function deriveKeys(
  masterPassword: string,
  kdfSalt: string,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<DerivedKeys> {
  const passwordKey = await crypto.subtle.importKey('raw', encoder.encode(masterPassword), 'PBKDF2', false, [
    'deriveBits',
  ]);

  const masterBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(kdfSalt), iterations },
    passwordKey,
    256,
  );

  const hkdfKey = await crypto.subtle.importKey('raw', masterBits, 'HKDF', false, ['deriveBits', 'deriveKey']);
  const hkdfParams = (info: string): HkdfParams => ({
    name: 'HKDF',
    hash: 'SHA-256',
    salt: new Uint8Array(0),
    info: encoder.encode(info),
  });

  const authBits = await crypto.subtle.deriveBits(hkdfParams(AUTH_INFO), hkdfKey, 256);
  const encKey = await crypto.subtle.deriveKey(
    hkdfParams(ENC_INFO),
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['encrypt', 'decrypt'],
  );

  return { authKey: toBase64(authBits), encKey };
}

/** Encrypt any JSON value. A new random 96-bit IV is used for every call. */
export async function encrypt(encKey: CryptoKey, data: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, encKey, encoder.encode(JSON.stringify(data)));
  const blob: EncryptedBlob = { v: 1, iv: toBase64(iv), ct: toBase64(ct) };
  return JSON.stringify(blob);
}

/** Decrypt a blob. Throws if the key is wrong or the data was changed (GCM auth tag). */
export async function decrypt<T = unknown>(encKey: CryptoKey, blob: string): Promise<T> {
  const parsed = JSON.parse(blob) as Partial<EncryptedBlob>;
  if (parsed.v !== 1 || typeof parsed.iv !== 'string' || typeof parsed.ct !== 'string') {
    throw new Error('Unsupported vault format');
  }
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(parsed.iv) },
    encKey,
    fromBase64(parsed.ct),
  );
  return JSON.parse(decoder.decode(plain)) as T;
}

const CLASSES = ['abcdefghijkmnopqrstuvwxyz', 'ABCDEFGHJKLMNPQRSTUVWXYZ', '23456789', '!@#$%^&*-_=+'] as const;

function randomChar(charset: string): string {
  // Rejection sampling avoids modulo bias.
  const limit = 256 - (256 % charset.length);
  for (;;) {
    for (const byte of crypto.getRandomValues(new Uint8Array(32))) {
      if (byte < limit) return charset.charAt(byte % charset.length);
    }
  }
}

/** Cryptographically secure password with at least one character from each class. */
export function generatePassword(length = 20): string {
  if (length < CLASSES.length) throw new Error(`Length must be at least ${CLASSES.length}`);
  const all = CLASSES.join('');
  const chars: string[] = CLASSES.map((set) => randomChar(set));
  while (chars.length < length) chars.push(randomChar(all));

  // Fisher-Yates shuffle with secure randomness, so the guaranteed characters
  // are not always at the start.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) % (i + 1);
    const tmp = chars[i] as string;
    chars[i] = chars[j] as string;
    chars[j] = tmp;
  }
  return chars.join('');
}

/** HIBP k-anonymity: only the first 5 hex characters of the SHA-1 leave the browser. */
export async function breachCount(password: string): Promise<number> {
  const digest = await crypto.subtle.digest('SHA-1', encoder.encode(password));
  const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const res = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, {
    headers: { 'Add-Padding': 'true' },
  });
  if (!res.ok) throw new Error('Breach check unavailable');
  const line = (await res.text()).split('\n').find((l) => l.startsWith(hash.slice(5)));
  return line ? Number.parseInt(line.split(':')[1] ?? '0', 10) : 0;
}