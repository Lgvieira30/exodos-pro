import { Router, Response } from 'express';
import { sql } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const metricsRouter = Router();
metricsRouter.use(requireAuth);

function buildDateFilter(params: Record<string, string | undefined>) {
  const { date_range, since, until } = params;
  if (since && until) return { since, until };
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  if (date_range === 'today') return { since: today, until: today };
  if (date_range === '30d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    return { since: d.toISOString().split('T')[0], until: today };
  }
  const d = new Date(now);
  d.setDate(d.getDate() - 6);
  return { since: d.toISOString().split('T')[0], until: today };
}

metricsRouter.get('/dashboard', async (req: AuthRequest, res: Response) => {
  const { since, until } = buildDateFilter(req.query as Record<string, string | undefined>);

  const [summary] = await sql`
    SELECT
      COALESCE(SUM(m.spend), 0)       AS total_spend,
      COALESCE(SUM(m.leads), 0)       AS total_leads,
      COALESCE(SUM(m.purchases), 0)   AS total_purchases,
      COALESCE(SUM(m.revenue), 0)     AS total_revenue,
      COALESCE(AVG(m.cpa) FILTER (WHERE m.cpa > 0), 0) AS avg_cpa,
      COALESCE(AVG(m.roas) FILTER (WHERE m.roas > 0), 0) AS avg_roas,
      COUNT(DISTINCT c.id)             AS total_campaigns
    FROM campaigns c
    LEFT JOIN metrics m ON m.campaign_id = c.id AND m.date BETWEEN ${since} AND ${until}
    WHERE c.user_id = ${req.userId!}
      AND c.status = 'active'
  `;

  const weekly = await sql`
    SELECT
      TO_CHAR(m.date, 'Dy') AS day,
      m.date,
      SUM(m.spend)           AS spend,
      SUM(m.leads)           AS leads,
      AVG(m.cpa)             AS cpa
    FROM metrics m
    JOIN campaigns c ON c.id = m.campaign_id
    WHERE c.user_id = ${req.userId!}
      AND m.date BETWEEN ${since} AND ${until}
    GROUP BY m.date, day
    ORDER BY m.date
  `;

  res.json({
    success: true,
    data: {
      summary: {
        spend: Number(summary.total_spend),
        leads: Number(summary.total_leads),
        purchases: Number(summary.total_purchases),
        revenue: Number(summary.total_revenue),
        cpa: Number(summary.avg_cpa),
        roas: Number(summary.avg_roas),
        campaigns: Number(summary.total_campaigns),
      },
      weekly,
    },
  });
});

metricsRouter.get('/:campaignId/summary', async (req: AuthRequest, res: Response) => {
  const [campaign] = await sql`
    SELECT id FROM campaigns WHERE id = ${req.params.campaignId} AND user_id = ${req.userId!}
  `;
  if (!campaign) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campanha não encontrada' } });
    return;
  }

  const { since, until } = buildDateFilter(req.query as Record<string, string | undefined>);

  const [summary] = await sql`
    SELECT
      COALESCE(SUM(spend), 0) AS total_spend,
      COALESCE(SUM(impressions), 0) AS total_impressions,
      COALESCE(SUM(clicks), 0) AS total_clicks,
      COALESCE(SUM(reach), 0) AS total_reach,
      COALESCE(SUM(leads), 0) AS total_leads,
      COALESCE(SUM(conversions), 0) AS total_conversions,
      COALESCE(SUM(purchases), 0) AS total_purchases,
      COALESCE(SUM(revenue), 0) AS total_revenue,
      COALESCE(SUM(video_views), 0) AS total_video_views,
      COALESCE(SUM(thruplays), 0) AS total_thruplays,
      COALESCE(AVG(ctr) FILTER (WHERE ctr > 0), 0) AS avg_ctr,
      COALESCE(AVG(cpc) FILTER (WHERE cpc > 0), 0) AS avg_cpc,
      COALESCE(AVG(cpm) FILTER (WHERE cpm > 0), 0) AS avg_cpm,
      COALESCE(AVG(frequency) FILTER (WHERE frequency > 0), 0) AS avg_frequency,
      COALESCE(AVG(cpa) FILTER (WHERE cpa > 0), 0) AS avg_cpa,
      COALESCE(AVG(roas) FILTER (WHERE roas > 0), 0) AS avg_roas
    FROM metrics
    WHERE campaign_id = ${req.params.campaignId} AND date BETWEEN ${since} AND ${until}
  `;

  const timeseries = await sql`
    SELECT date, spend, impressions, clicks, reach, leads, conversions, ctr, cpc, cpa, roas, video_views, thruplays
    FROM metrics
    WHERE campaign_id = ${req.params.campaignId} AND date BETWEEN ${since} AND ${until}
    ORDER BY date ASC
  `;

  const adSetBreakdown = await sql`
    SELECT
      ads.id, ads.name, ads.status,
      COALESCE(SUM(m.spend), 0) AS total_spend,
      COALESCE(SUM(m.impressions), 0) AS total_impressions,
      COALESCE(SUM(m.clicks), 0) AS total_clicks,
      COALESCE(SUM(m.reach), 0) AS total_reach,
      COALESCE(SUM(m.leads), 0) AS total_leads,
      COALESCE(AVG(m.cpa) FILTER (WHERE m.cpa > 0), 0) AS avg_cpa,
      COALESCE(AVG(m.roas) FILTER (WHERE m.roas > 0), 0) AS avg_roas
    FROM ad_sets ads
    LEFT JOIN ad_set_metrics m ON m.ad_set_id = ads.id AND m.date BETWEEN ${since} AND ${until}
    WHERE ads.campaign_id = ${req.params.campaignId}
    GROUP BY ads.id
    ORDER BY SUM(m.spend) DESC NULLS LAST
  `;

  res.json({ success: true, data: { summary, timeseries, ad_sets: adSetBreakdown } });
});

metricsRouter.get('/:campaignId', async (req: AuthRequest, res: Response) => {
  const [campaign] = await sql`
    SELECT id FROM campaigns WHERE id = ${req.params.campaignId} AND user_id = ${req.userId!}
  `;
  if (!campaign) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campanha não encontrada' } });
    return;
  }

  const { since, until } = buildDateFilter(req.query as Record<string, string | undefined>);

  const metrics = await sql`
    SELECT id, campaign_id, date, spend, leads, conversions, purchases, revenue,
      impressions, clicks, reach, frequency, cpm, cpc, cpa, ctr, roas,
      video_views, video_p25, video_p50, video_p75, video_p100, thruplays
    FROM metrics
    WHERE campaign_id = ${req.params.campaignId} AND date BETWEEN ${since} AND ${until}
    ORDER BY date DESC
    LIMIT 90
  `;

  res.json({ success: true, data: { metrics } });
});

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
