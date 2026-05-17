import { Router, Response } from 'express';
import { sql } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const adSetsRouter = Router();
adSetsRouter.use(requireAuth);

adSetsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { campaign_id } = req.query;
    const rows = campaign_id
      ? await sql`
          SELECT * FROM ad_sets
          WHERE user_id = ${req.userId!} AND campaign_id = ${campaign_id as string}
          ORDER BY spend DESC
        `
      : await sql`
          SELECT * FROM ad_sets WHERE user_id = ${req.userId!} ORDER BY spend DESC
        `;
    res.json({ success: true, data: { ad_sets: rows } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

adSetsRouter.get('/:adSetId/ads', async (req: AuthRequest, res: Response) => {
  try {
    const rows = await sql`
      SELECT * FROM ads
      WHERE user_id = ${req.userId!} AND ad_set_id = ${req.params.adSetId}
      ORDER BY spend DESC
    `;
    res.json({ success: true, data: { ads: rows } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});
