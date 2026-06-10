import { Router, Response } from 'express';
import { sql } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const metricsRouter = Router();
metricsRouter.use(requireAuth);

function dateRange(req: any, defaultDays = 7) {
  const to = (req.query.to as string) || new Date().toISOString().split('T')[0];
  const from = (req.query.from as string) || (() => {
    const d = new Date(to);
    d.setDate(d.getDate() - defaultDays + 1);
    return d.toISOString().split('T')[0];
  })();
  return { from, to };
}

// GET /api/metrics/dashboard?platform=meta|google
metricsRouter.get('/dashboard', async (req: AuthRequest, res: Response) => {
  const { from, to } = dateRange(req, 7);
  const platform = (req.query.platform as string) || null;

  // Período anterior de mesmo tamanho, imediatamente antes de `from` (pro comparativo)
  const fromD = new Date(from);
  const toD = new Date(to);
  const lenDays = Math.round((toD.getTime() - fromD.getTime()) / 86400000) + 1;
  const prevTo = new Date(fromD); prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - lenDays + 1);
  const prevFromStr = prevFrom.toISOString().split('T')[0];
  const prevToStr = prevTo.toISOString().split('T')[0];

  const summaryFor = (dFrom: string, dTo: string) => sql`
    SELECT
      COALESCE(SUM(m.spend), 0)                                          AS total_spend,
      COALESCE(SUM(m.leads), 0)                                          AS total_leads,
      COALESCE(SUM(m.clicks), 0)                                         AS total_clicks,
      COALESCE(SUM(m.impressions), 0)                                    AS total_impressions,
      CASE WHEN SUM(m.leads) > 0
        THEN SUM(m.spend) / SUM(m.leads) ELSE 0 END                     AS avg_cpa,
      CASE WHEN SUM(m.spend) > 0
        THEN SUM(m.spend * m.roas) / NULLIF(SUM(CASE WHEN m.roas > 0 THEN m.spend ELSE 0 END), 0)
        ELSE 0 END                                                        AS avg_roas,
      CASE WHEN SUM(m.impressions) > 0
        THEN (SUM(m.clicks)::float / SUM(m.impressions)) * 100 ELSE 0 END AS avg_ctr,
      CASE WHEN SUM(m.clicks) > 0
        THEN SUM(m.spend) / SUM(m.clicks) ELSE 0 END                    AS avg_cpc,
      COUNT(DISTINCT c.id)                                                AS total_campaigns
    FROM campaigns c
    LEFT JOIN metrics m ON m.campaign_id = c.id
      AND m.date >= ${dFrom} AND m.date <= ${dTo}
    WHERE c.user_id = ${req.userId!}
      AND c.status = 'active'
      AND (${platform}::text IS NULL OR c.platform = ${platform})
  `;

  const [summary] = await summaryFor(from, to);
  const [previous] = await summaryFor(prevFromStr, prevToStr);

  const weekly = await sql`
    SELECT
      TO_CHAR(m.date, 'DD/MM')                             AS day,
      m.date::text                                          AS date,
      SUM(m.spend)                                          AS spend,
      SUM(m.leads)                                          AS leads,
      SUM(m.clicks)                                         AS clicks,
      SUM(m.impressions)                                    AS impressions,
      CASE WHEN SUM(m.leads) > 0 THEN SUM(m.spend) / SUM(m.leads) ELSE 0 END AS cpa,
      CASE WHEN SUM(m.impressions) > 0 THEN (SUM(m.clicks)::float / SUM(m.impressions)) * 100 ELSE 0 END AS ctr,
      CASE WHEN SUM(m.clicks) > 0 THEN SUM(m.spend) / SUM(m.clicks) ELSE 0 END AS cpc
    FROM metrics m
    JOIN campaigns c ON c.id = m.campaign_id
    WHERE c.user_id = ${req.userId!}
      AND m.date >= ${from} AND m.date <= ${to}
      AND (${platform}::text IS NULL OR c.platform = ${platform})
    GROUP BY m.date
    ORDER BY m.date
  `;

  const fmt = (s: any) => ({
    spend: Number(s.total_spend),
    leads: Number(s.total_leads),
    clicks: Number(s.total_clicks),
    impressions: Number(s.total_impressions),
    cpa: Number(s.avg_cpa),
    roas: Number(s.avg_roas),
    ctr: Number(s.avg_ctr),
    cpc: Number(s.avg_cpc),
    campaigns: Number(s.total_campaigns),
  });

  res.json({
    success: true,
    data: {
      period: { from, to },
      previousPeriod: { from: prevFromStr, to: prevToStr },
      summary: fmt(summary),
      previous: fmt(previous),
      weekly,
    },
  });
});

// GET /api/metrics/:campaignId
metricsRouter.get('/:campaignId', async (req: AuthRequest, res: Response) => {
  const [campaign] = await sql`
    SELECT id FROM campaigns WHERE id = ${req.params.campaignId} AND user_id = ${req.userId!}
  `;
  if (!campaign) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campanha não encontrada' } });
    return;
  }

  const { from, to } = dateRange(req, 30);

  const metrics = await sql`
    SELECT * FROM metrics
    WHERE campaign_id = ${req.params.campaignId}
      AND date >= ${from} AND date <= ${to}
    ORDER BY date DESC
  `;

  res.json({ success: true, data: { metrics, period: { from, to } } });
});

// POST /api/metrics/:campaignId
metricsRouter.post('/:campaignId', async (req: AuthRequest, res: Response) => {
  const [campaign] = await sql`
    SELECT id FROM campaigns WHERE id = ${req.params.campaignId} AND user_id = ${req.userId!}
  `;
  if (!campaign) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campanha não encontrada' } });
    return;
  }

  const { date, spend, leads, conversions, impressions, clicks } = req.body;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  const [metric] = await sql`
    INSERT INTO metrics (campaign_id, date, spend, leads, conversions, impressions, clicks, cpc, cpa, ctr)
    VALUES (${req.params.campaignId}, ${date}, ${spend}, ${leads}, ${conversions}, ${impressions}, ${clicks}, ${cpc}, ${cpa}, ${ctr})
    ON CONFLICT (campaign_id, date) DO UPDATE SET
      spend = EXCLUDED.spend, leads = EXCLUDED.leads, conversions = EXCLUDED.conversions,
      impressions = EXCLUDED.impressions, clicks = EXCLUDED.clicks,
      cpc = EXCLUDED.cpc, cpa = EXCLUDED.cpa, ctr = EXCLUDED.ctr
    RETURNING *
  `;

  res.status(201).json({ success: true, data: { metric } });
});
