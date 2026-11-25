import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { twofaRouter } from './routes/twofa.js';
import { vaultRouter } from './routes/vault.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '2mb' }));

if (config.isProd) {
  // Force HTTPS in production.
  app.use((req, res, next) => (req.secure ? next() : res.redirect(301, `https://${req.headers.host}${req.url}`)));
}

app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 200 }));
const strictLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 });
app.use('/api/auth/login', strictLimit);
app.use('/api/auth/register', strictLimit);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'vaultify-server' });
});
app.use('/api/auth', authRouter);
app.use('/api/vault', vaultRouter);
app.use('/api/2fa', twofaRouter);

// Never log request bodies: they can contain keys.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }
  console.error(err instanceof Error ? err.message : 'Unknown error');
  res.status(500).json({ error: 'Server error' });
});

await mongoose.connect(config.mongoUri);
app.listen(config.port, () => console.log(`Vaultify API listening on :${config.port}`));