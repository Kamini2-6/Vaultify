// The Encryption Key lives only here, in memory. It is never put in Redux,
// localStorage, or the console.
let encKey: CryptoKey | null = null;

export const session = {
  set(key: CryptoKey): void {
    encKey = key;
  },
  get(): CryptoKey {
    if (!encKey) throw new Error('Vault is locked');
    return encKey;
  },
  clear(): void {
    encKey = null;
  },
};