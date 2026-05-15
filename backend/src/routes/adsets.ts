import { Router, Response } from 'express';
import { sql } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const adSetsRouter = Router();
adSetsRouter.use(requireAuth);

function dateFilter(since?: string, until?: string, date_range?: string) {
  if (since && until) return { since, until };
  const ranges: Record<string, number> = { today: 0, '7d': 7, '30d': 30 };
  const days = ranges[date_range || '7d'] ?? 7;
  const s = new Date();
  s.setDate(s.getDate() - days);
  return { since: s.toISOString().split('T')[0], until: new Date().toISOString().split('T')[0] };
}

// GET /api/adsets?campaign_id=<uuid>
adSetsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const { campaign_id, since, until, date_range } = req.query as Record<string, string>;

  const [campaign] = await sql`
    SELECT id FROM campaigns WHERE id = ${campaign_id} AND user_id = ${req.userId!}
  `;
  if (!campaign) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campanha não encontrada' } });
    return;
  }

  const { since: s, until: u } = dateFilter(since, until, date_range);

  const adSets = await sql`
    SELECT
      a.id, a.meta_id, a.name, a.status, a.daily_budget, a.created_at,
      COALESCE(SUM(m.spend), 0)          AS spend,
      COALESCE(SUM(m.impressions), 0)    AS impressions,
      COALESCE(SUM(m.clicks), 0)         AS clicks,
      COALESCE(MAX(m.reach), 0)          AS reach,
      COALESCE(AVG(m.frequency) FILTER (WHERE m.frequency > 0), 0) AS frequency,
      COALESCE(AVG(m.cpm) FILTER (WHERE m.cpm > 0), 0)             AS cpm,
      COALESCE(AVG(m.cpc) FILTER (WHERE m.cpc > 0), 0)             AS cpc,
      COALESCE(AVG(m.ctr) FILTER (WHERE m.ctr > 0), 0)             AS ctr,
      COALESCE(SUM(m.leads), 0)          AS leads,
      COALESCE(SUM(m.conversions), 0)    AS conversions,
      COALESCE(SUM(m.purchases), 0)      AS purchases,
      COALESCE(SUM(m.revenue), 0)        AS revenue,
      COALESCE(AVG(m.cpa) FILTER (WHERE m.cpa > 0), 0)             AS cpa,
      COALESCE(AVG(m.roas) FILTER (WHERE m.roas > 0), 0)           AS roas,
      COALESCE(SUM(m.video_views), 0)    AS video_views,
      COALESCE(SUM(m.thruplays), 0)      AS thruplays
    FROM ad_sets a
    LEFT JOIN ad_set_metrics m ON m.ad_set_id = a.id AND m.date BETWEEN ${s} AND ${u}
    WHERE a.campaign_id = ${campaign_id}
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `;

  res.json({ success: true, data: { adSets } });
});

// GET /api/adsets/:id
adSetsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const { since, until, date_range } = req.query as Record<string, string>;
  const { since: s, until: u } = dateFilter(since, until, date_range);

  const [adSet] = await sql`
    SELECT a.* FROM ad_sets a
    JOIN campaigns c ON c.id = a.campaign_id
    WHERE a.id = ${req.params.id} AND c.user_id = ${req.userId!}
  `;
  if (!adSet) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Conjunto não encontrado' } });
    return;
  }

  const [summary] = await sql`
    SELECT
      COALESCE(SUM(spend), 0)          AS spend,
      COALESCE(SUM(impressions), 0)    AS impressions,
      COALESCE(SUM(clicks), 0)         AS clicks,
      COALESCE(MAX(reach), 0)          AS reach,
      COALESCE(AVG(frequency) FILTER (WHERE frequency > 0), 0) AS frequency,
      COALESCE(AVG(cpm) FILTER (WHERE cpm > 0), 0)             AS cpm,
      COALESCE(AVG(cpc) FILTER (WHERE cpc > 0), 0)             AS cpc,
      COALESCE(AVG(ctr) FILTER (WHERE ctr > 0), 0)             AS ctr,
      COALESCE(SUM(leads), 0)          AS leads,
      COALESCE(SUM(conversions), 0)    AS conversions,
      COALESCE(SUM(purchases), 0)      AS purchases,
      COALESCE(SUM(revenue), 0)        AS revenue,
      COALESCE(AVG(cpa) FILTER (WHERE cpa > 0), 0)             AS cpa,
      COALESCE(AVG(roas) FILTER (WHERE roas > 0), 0)           AS roas,
      COALESCE(SUM(video_views), 0)    AS video_views,
      COALESCE(SUM(thruplays), 0)      AS thruplays
    FROM ad_set_metrics
    WHERE ad_set_id = ${req.params.id} AND date BETWEEN ${s} AND ${u}
  `;

  const timeSeries = await sql`
    SELECT date, spend, impressions, clicks, leads, conversions, cpa, roas, ctr
    FROM ad_set_metrics
    WHERE ad_set_id = ${req.params.id} AND date BETWEEN ${s} AND ${u}
    ORDER BY date
  `;

  res.json({ success: true, data: { adSet, summary, timeSeries } });
});
