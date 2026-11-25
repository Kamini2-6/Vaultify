import crypto from 'node:crypto';
import { config } from '../config.js';

export const newSalt = (): string => crypto.randomBytes(16).toString('base64');

export const hashAuthKey = (authKey: string, salt: string): string =>
  crypto.scryptSync(authKey, salt, 32).toString('base64');

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Stable fake salt for unknown emails, so attackers cannot tell which accounts exist.
export const fakeKdfSalt = (email: string): string =>
  crypto.createHmac('sha256', config.jwtSecret).update(email).digest().subarray(0, 16).toString('base64');

// AES-256-GCM encryption of the TOTP secret before it goes into MongoDB.
export function sealSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', config.totpKey, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ct].map((b) => b.toString('base64')).join('.');
}

export function openSecret(sealed: string): string {
  const [iv, tag, ct] = sealed.split('.').map((p) => Buffer.from(p, 'base64'));
  if (!iv || !tag || !ct) throw new Error('Corrupt sealed secret');
  const decipher = crypto.createDecipheriv('aes-256-gcm', config.totpKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}