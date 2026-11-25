import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Not signed in' });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret);
    if (typeof payload === 'string' || typeof payload.sub !== 'string') throw new Error('bad token');
    res.locals.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
}