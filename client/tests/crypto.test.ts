import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decrypt, deriveKeys, encrypt, generatePassword, randomSalt } from '../src/lib/crypto.ts';

const FAST = 1000; // low iterations keep the tests quick; production uses 600,000

describe('deriveKeys', () => {
  it('is deterministic for the same password and salt', async () => {
    const salt = randomSalt();
    const a = await deriveKeys('correct horse', salt, FAST);
    const b = await deriveKeys('correct horse', salt, FAST);
    assert.equal(a.authKey, b.authKey);
  });

  it('gives a different Auth Key for a different password or salt', async () => {
    const salt = randomSalt();
    const base = await deriveKeys('correct horse', salt, FAST);
    assert.notEqual(base.authKey, (await deriveKeys('wrong horse', salt, FAST)).authKey);
    assert.notEqual(base.authKey, (await deriveKeys('correct horse', randomSalt(), FAST)).authKey);
  });

  it('makes the Encryption Key non-extractable', async () => {
    const { encKey } = await deriveKeys('pw', randomSalt(), FAST);
    assert.equal(encKey.extractable, false);
    await assert.rejects(() => crypto.subtle.exportKey('raw', encKey));
  });
});

describe('encrypt / decrypt', () => {
  it('round-trips a vault', async () => {
    const { encKey } = await deriveKeys('pw', randomSalt(), FAST);
    const vault = [{ site: 'example.com', username: 'me', password: 'p@ss' }];
    assert.deepEqual(await decrypt(encKey, await encrypt(encKey, vault)), vault);
  });

  it('uses a fresh IV every time', async () => {
    const { encKey } = await deriveKeys('pw', randomSalt(), FAST);
    const a = JSON.parse(await encrypt(encKey, [])) as { iv: string };
    const b = JSON.parse(await encrypt(encKey, [])) as { iv: string };
    assert.notEqual(a.iv, b.iv);
  });

  it('fails with the wrong password', async () => {
    const salt = randomSalt();
    const right = await deriveKeys('right', salt, FAST);
    const wrong = await deriveKeys('wrong', salt, FAST);
    const blob = await encrypt(right.encKey, { secret: true });
    await assert.rejects(() => decrypt(wrong.encKey, blob));
  });

  it('detects tampering', async () => {
    const { encKey } = await deriveKeys('pw', randomSalt(), FAST);
    const blob = JSON.parse(await encrypt(encKey, { a: 1 })) as { ct: string };
    const bytes = Buffer.from(blob.ct, 'base64');
    bytes[0] = (bytes[0] ?? 0) ^ 1;
    blob.ct = bytes.toString('base64');
    await assert.rejects(() => decrypt(encKey, JSON.stringify(blob)));
  });
});

describe('generatePassword', () => {
  it('has the right length and all character classes', () => {
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword(16);
      assert.equal(pw.length, 16);
      assert.match(pw, /[a-z]/);
      assert.match(pw, /[A-Z]/);
      assert.match(pw, /[0-9]/);
      assert.match(pw, /[^A-Za-z0-9]/);
    }
  });

  it('does not repeat', () => {
    assert.notEqual(generatePassword(), generatePassword());
  });
});