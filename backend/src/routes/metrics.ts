import { Router, Response } from 'express';
import { sql } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const metricsRouter = Router();

metricsRouter.use(requireAuth);

// GET /api/metrics/dashboard — resumo geral do usuário
metricsRouter.get('/dashboard', async (req: AuthRequest, res: Response) => {
  const [summary] = await sql`
    SELECT
      COALESCE(SUM(m.spend), 0)       AS total_spend,
      COALESCE(SUM(m.leads), 0)       AS total_leads,
      COALESCE(AVG(m.cpa) FILTER (WHERE m.cpa > 0), 0) AS avg_cpa,
      COALESCE(AVG(m.roas) FILTER (WHERE m.roas > 0), 0) AS avg_roas,
      COUNT(DISTINCT c.id)             AS total_campaigns
    FROM campaigns c
    LEFT JOIN metrics m ON m.campaign_id = c.id
    WHERE c.user_id = ${req.userId!}
      AND c.status = 'active'
  `;

  const weekly = await sql`
    SELECT
      TO_CHAR(m.date, 'Dy') AS day,
      SUM(m.spend)           AS spend,
      SUM(m.leads)           AS leads,
      AVG(m.cpa)             AS cpa
    FROM metrics m
    JOIN campaigns c ON c.id = m.campaign_id
    WHERE c.user_id = ${req.userId!}
      AND m.date >= NOW() - INTERVAL '7 days'
    GROUP BY m.date, day
    ORDER BY m.date
  `;

  res.json({
    success: true,
    data: {
      summary: {
        spend: Number(summary.total_spend),
        leads: Number(summary.total_leads),
        cpa: Number(summary.avg_cpa),
        roas: Number(summary.avg_roas),
        campaigns: Number(summary.total_campaigns),
      },
      weekly,
    },
  });
});

// GET /api/metrics/:campaignId — métricas de uma campanha
metricsRouter.get('/:campaignId', async (req: AuthRequest, res: Response) => {
  const [campaign] = await sql`
    SELECT id FROM campaigns WHERE id = ${req.params.campaignId} AND user_id = ${req.userId!}
  `;
  if (!campaign) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campanha não encontrada' } });
    return;
  }

  const metrics = await sql`
    SELECT * FROM metrics
    WHERE campaign_id = ${req.params.campaignId}
    ORDER BY date DESC
    LIMIT 30
  `;

  res.json({ success: true, data: { metrics } });
});

// POST /api/metrics/:campaignId — inserir/atualizar métricas do dia
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
      spend = EXCLUDED.spend,
      leads = EXCLUDED.leads,
      conversions = EXCLUDED.conversions,
      impressions = EXCLUDED.impressions,
      clicks = EXCLUDED.clicks,
      cpc = EXCLUDED.cpc,
      cpa = EXCLUDED.cpa,
      ctr = EXCLUDED.ctr
    RETURNING *
  `;

  res.status(201).json({ success: true, data: { metric } });
});
