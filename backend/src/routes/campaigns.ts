import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { sql } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const campaignsRouter = Router();

campaignsRouter.use(requireAuth);

// GET /api/campaigns
campaignsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const campaigns = await sql`
    SELECT c.*,
      COALESCE(SUM(m.spend), 0) AS total_spend,
      COALESCE(SUM(m.leads), 0) AS total_leads,
      COALESCE(AVG(m.cpa) FILTER (WHERE m.cpa > 0), 0) AS avg_cpa,
      COALESCE(AVG(m.ctr) FILTER (WHERE m.ctr > 0), 0) AS avg_ctr
    FROM campaigns c
    LEFT JOIN metrics m ON m.campaign_id = c.id
    WHERE c.user_id = ${req.userId!}
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;
  res.json({ success: true, data: { campaigns } });
});

// GET /api/campaigns/:id
campaignsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const [campaign] = await sql`
    SELECT * FROM campaigns WHERE id = ${req.params.id} AND user_id = ${req.userId!}
  `;
  if (!campaign) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campanha não encontrada' } });
    return;
  }
  res.json({ success: true, data: { campaign } });
});

// POST /api/campaigns
campaignsRouter.post(
  '/',
  [
    body('name').trim().isLength({ min: 2 }),
    body('platform').isIn(['meta', 'google', 'linkedin']),
    body('objective').isIn(['leads', 'sales', 'awareness']),
    body('budget').isNumeric(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION', message: errors.array()[0].msg } });
      return;
    }

    const { name, platform, objective, budget, start_date, end_date } = req.body;

    const [campaign] = await sql`
      INSERT INTO campaigns (user_id, name, platform, objective, budget, start_date, end_date)
      VALUES (${req.userId!}, ${name}, ${platform}, ${objective}, ${budget}, ${start_date || null}, ${end_date || null})
      RETURNING *
    `;

    res.status(201).json({ success: true, data: { campaign } });
  }
);

// PATCH /api/campaigns/:id
campaignsRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  const [existing] = await sql`
    SELECT id FROM campaigns WHERE id = ${req.params.id} AND user_id = ${req.userId!}
  `;
  if (!existing) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campanha não encontrada' } });
    return;
  }

  const allowed = ['name', 'status', 'budget', 'start_date', 'end_date'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ success: false, error: { code: 'NO_FIELDS', message: 'Nenhum campo para atualizar' } });
    return;
  }

  const [campaign] = await sql`
    UPDATE campaigns
    SET ${sql(updates)}, updated_at = NOW()
    WHERE id = ${req.params.id}
    RETURNING *
  `;

  res.json({ success: true, data: { campaign } });
});

// DELETE /api/campaigns/:id
campaignsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const result = await sql`
    DELETE FROM campaigns WHERE id = ${req.params.id} AND user_id = ${req.userId!}
    RETURNING id
  `;
  if (result.length === 0) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campanha não encontrada' } });
    return;
  }
  res.json({ success: true, data: { message: 'Campanha removida' } });
});
