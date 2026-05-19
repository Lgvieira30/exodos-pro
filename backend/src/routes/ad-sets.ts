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

// GET /api/ad-sets/:adSetId/daily — últimos 7 dias do conjunto
adSetsRouter.get('/:adSetId/daily', async (req: AuthRequest, res: Response) => {
  try {
    const rows = await sql`
      SELECT date::text, TO_CHAR(date, 'DD/MM') AS label,
        spend, impressions, clicks, leads, ctr, cpc, cpa, roas
      FROM ad_set_daily_metrics
      WHERE ad_set_id = ${req.params.adSetId} AND user_id = ${req.userId!}
      ORDER BY date DESC LIMIT 7
    `;
    res.json({ success: true, data: { daily: rows.reverse() } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// GET /api/ad-sets/:adSetId/ads/:adId/daily — últimos 7 dias do anúncio
adSetsRouter.get('/:adSetId/ads/:adId/daily', async (req: AuthRequest, res: Response) => {
  try {
    const rows = await sql`
      SELECT date::text, TO_CHAR(date, 'DD/MM') AS label,
        spend, impressions, clicks, leads, ctr, cpc, cpa, roas
      FROM ad_daily_metrics
      WHERE ad_id = ${req.params.adId} AND user_id = ${req.userId!}
      ORDER BY date DESC LIMIT 7
    `;
    res.json({ success: true, data: { daily: rows.reverse() } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});
