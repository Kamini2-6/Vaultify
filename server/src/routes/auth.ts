import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { z } from 'zod';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { fakeKdfSalt, hashAuthKey, newSalt, openSecret, safeEqual } from '../utils/crypto.js';

export const authRouter = Router();

const email = z.string().trim().toLowerCase().email().max(254);
const b64 = z.string().min(16).max(200).regex(/^[A-Za-z0-9+/=]+$/);

const registerBody = z.object({ email, kdfSalt: b64, authKey: b64 });
const loginBody = z.object({ email, authKey: b64, totp: z.string().regex(/^\d{6}$/).optional() });

const DUMMY_SALT = newSalt(); // keeps login timing the same for unknown emails

// The client needs its KDF salt before it can derive the Auth Key.
authRouter.get('/salt', async (req, res) => {
  const query = z.object({ email }).parse(req.query);
  const user = await User.findOne({ email: query.email }).select('kdfSalt').lean();
  res.json({ kdfSalt: user?.kdfSalt ?? fakeKdfSalt(query.email) });
});

authRouter.post('/register', async (req, res) => {
  const body = registerBody.parse(req.body);
  const authSalt = newSalt();
  try {
    await User.create({
      email: body.email,
      kdfSalt: body.kdfSalt,
      authSalt,
      authHash: hashAuthKey(body.authKey, authSalt),
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === 11000) {
      res.status(409).json({ error: 'Account already exists' });
      return;
    }
    throw err;
  }
});

authRouter.post('/login', async (req, res) => {
  const body = loginBody.parse(req.body);
  const user = await User.findOne({ email: body.email });

  const hash = hashAuthKey(body.authKey, user?.authSalt ?? DUMMY_SALT);
  if (!user || !safeEqual(hash, user.authHash)) {
    res.status(401).json({ error: 'Wrong email or master password' });
    return;
  }

  if (user.totpEnabled) {
    if (!body.totp) {
      res.status(401).json({ code: 'TOTP_REQUIRED', error: 'Enter your 2FA code' });
      return;
    }
    const valid = user.totpSecretEnc && authenticator.check(body.totp, openSecret(user.totpSecretEnc));
    if (!valid) {
      res.status(401).json({ code: 'TOTP_REQUIRED', error: 'Invalid 2FA code' });
      return;
    }
  }

  const token = jwt.sign({}, config.jwtSecret, { subject: user.id, expiresIn: '30m' });
  res.json({ token, totpEnabled: user.totpEnabled });
});