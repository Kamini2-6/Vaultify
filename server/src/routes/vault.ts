import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { User } from '../models/User.js';

export const vaultRouter = Router();
vaultRouter.use(requireAuth);

// The server never looks inside the blob. It stores and returns it as text.
vaultRouter.get('/', async (_req, res) => {
  const user = await User.findById(res.locals.userId).select('vault').lean();
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ blob: user.vault });
});

vaultRouter.put('/', async (req, res) => {
  const { blob } = z.object({ blob: z.string().max(1_500_000) }).parse(req.body);
  const user = await User.findByIdAndUpdate(res.locals.userId, { vault: blob });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ ok: true });
});