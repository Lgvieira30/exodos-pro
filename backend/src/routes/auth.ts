import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { sql } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().isLength({ min: 2 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION', message: errors.array()[0].msg } });
      return;
    }

    const { email, password, name } = req.body;

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'Email já cadastrado' } });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await sql`
      INSERT INTO users (email, password_hash, name)
      VALUES (${email}, ${passwordHash}, ${name})
      RETURNING id, email, name, created_at
    `;

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({ success: true, data: { token, user: { id: user.id, email: user.email, name: user.name } } });
  }
);

authRouter.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION', message: errors.array()[0].msg } });
      return;
    }

    const { email, password } = req.body;

    const [user] = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (!user) {
      res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Email ou senha incorretos' } });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Email ou senha incorretos' } });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({ success: true, data: { token, user: { id: user.id, email: user.email, name: user.name } } });
  }
);

authRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const [user] = await sql`SELECT id, email, name, created_at FROM users WHERE id = ${req.userId!}`;
  if (!user) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Usuário não encontrado' } });
    return;
  }
  res.json({ success: true, data: { user } });
});
