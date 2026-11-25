import { Router } from 'express';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { openSecret, sealSecret } from '../utils/crypto.js';

export const twofaRouter = Router();
twofaRouter.use(requireAuth);

// Step 1: create a secret and a QR code. 2FA is NOT active until step 2 succeeds.
twofaRouter.post('/setup', async (_req, res) => {
  const user = await User.findById(res.locals.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (user.totpEnabled) {
    res.status(400).json({ error: '2FA is already on' });
    return;
  }
  const secret = authenticator.generateSecret();
  user.totpSecretEnc = sealSecret(secret);
  await user.save();
  const otpauthUrl = authenticator.keyuri(user.email, 'Vaultify', secret);
  res.json({ secret, qrDataUrl: await QRCode.toDataURL(otpauthUrl) });
});

// Step 2: the user proves their authenticator app works by sending a valid code.
twofaRouter.post('/enable', async (req, res) => {
  const { code } = z.object({ code: z.string().regex(/^\d{6}$/) }).parse(req.body);
  const user = await User.findById(res.locals.userId);
  if (!user?.totpSecretEnc || !authenticator.check(code, openSecret(user.totpSecretEnc))) {
    res.status(400).json({ error: 'Invalid code' });
    return;
  }
  user.totpEnabled = true;
  await user.save();
  res.json({ ok: true });
});