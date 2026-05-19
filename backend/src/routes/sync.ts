import { Router, Response } from 'express';
import axios from 'axios';
import { sql } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const syncRouter = Router();
syncRouter.use(requireAuth);

syncRouter.get('/status', async (req: AuthRequest, res: Response) => {
  const rows = await sql`
    SELECT platform, account_id, last_sync_at, last_sync_status
    FROM user_integrations WHERE user_id = ${req.userId!}
  `;
  res.json({ success: true, data: { integrations: rows } });
});

// Debug: ver dados reais no banco
syncRouter.get('/debug', async (req: AuthRequest, res: Response) => {
  const campaigns = await sql`
    SELECT id, name, platform, status, meta_id FROM campaigns
    WHERE user_id = ${req.userId!} ORDER BY name
  `;

  const metrics = await sql`
    SELECT c.name AS campaign_name, m.date, m.spend, m.leads, m.clicks, m.impressions, m.cpa, m.ctr, m.cpc, m.roas
    FROM metrics m
    JOIN campaigns c ON c.id = m.campaign_id
    WHERE c.user_id = ${req.userId!}
    ORDER BY m.date DESC, c.name
    LIMIT 120
  `;

  // Show how many daily rows exist per campaign (should be up to 30, not 1)
  const rowsPerCampaign = await sql`
    SELECT c.name, COUNT(*) AS daily_rows, MIN(m.date) AS oldest, MAX(m.date) AS newest
    FROM metrics m
    JOIN campaigns c ON c.id = m.campaign_id
    WHERE c.user_id = ${req.userId!}
    GROUP BY c.name
    ORDER BY c.name
  `;

  const [totals] = await sql`
    SELECT
      COUNT(DISTINCT m.campaign_id) AS campaigns_with_data,
      SUM(m.spend) AS total_spend,
      SUM(m.leads) AS total_leads,
      SUM(m.clicks) AS total_clicks,
      MIN(m.date) AS oldest_date,
      MAX(m.date) AS newest_date
    FROM metrics m
    JOIN campaigns c ON c.id = m.campaign_id
    WHERE c.user_id = ${req.userId!}
  `;

  res.json({
    success: true,
    data: {
      campaigns,
      recent_metrics: metrics,
      rows_per_campaign: rowsPerCampaign,
      totals,
    },
  });
});

// Priority order: first match with value > 0 is used (avoids double-counting when
// one conversion fires multiple action types, e.g. contact + lead simultaneously)
const LEAD_ACTION_PRIORITY = [
  'contact',
  'lead',
  'offsite_conversion.fb_pixel_lead',
  'onsite_conversion.lead_grouped',
  'complete_registration',
  'submit_application',
  'schedule',
  'start_trial',
  'subscribe',
  'onsite_conversion.messaging_conversation_started_7d',
];

const PURCHASE_ACTION_TYPES = [
  'offsite_conversion.fb_pixel_purchase',
  'purchase',
  'omni_purchase',
];

function extractActions(actions: any[], actionValues: any[]) {
  // Use the highest-priority lead action type that has a value.
  // Summing all types inflates counts because one conversion can fire multiple events.
  let leads = 0;
  for (const type of LEAD_ACTION_PRIORITY) {
    const match = actions.find((a: any) => a.action_type === type);
    if (match && Number(match.value || 0) > 0) {
      leads = Number(match.value);
      break;
    }
  }

  const conversions = actions
    .filter((a: any) => PURCHASE_ACTION_TYPES.includes(a.action_type))
    .reduce((sum: number, a: any) => sum + Number(a.value || 0), 0);

  const revenue = actionValues
    .filter((a: any) => PURCHASE_ACTION_TYPES.includes(a.action_type))
    .reduce((sum: number, a: any) => sum + Number(a.value || 0), 0);

  return { leads, conversions, revenue };
}

// Fetch all pages from a paginated Meta API endpoint
async function fetchAllPages(url: string, params: Record<string, any>, timeout = 20000): Promise<any[]> {
  const results: any[] = [];
  let nextUrl: string | null = null;

  const firstRes = await axios.get(url, { params, timeout });
  results.push(...(firstRes.data?.data || []));
  nextUrl = firstRes.data?.paging?.next || null;

  while (nextUrl) {
    const res = await axios.get(nextUrl, { timeout });
    results.push(...(res.data?.data || []));
    nextUrl = res.data?.paging?.next || null;
  }

  return results;
}

syncRouter.post('/meta', async (req: AuthRequest, res: Response) => {
  const [integration] = await sql`
    SELECT id, access_token, account_id FROM user_integrations
    WHERE user_id = ${req.userId!} AND platform = 'meta' AND is_active = true
  `;
  if (!integration) {
    res.status(400).json({ success: false, error: { message: 'Meta Ads nao conectado. Configure em Configuracoes.' } });
    return;
  }

  try {
    const { access_token, account_id } = integration;
    const BASE = `https://graph.facebook.com/v20.0`;

    // Build explicit date ranges so time_increment=1 (daily breakout) is always respected.
    // date_preset alone can cause the API to return a single aggregate row instead of daily rows.
    const todayStr = new Date().toISOString().split('T')[0];
    const d30 = new Date(); d30.setDate(d30.getDate() - 29);
    const since30 = d30.toISOString().split('T')[0];
    const d7 = new Date(); d7.setDate(d7.getDate() - 6);
    const since7 = d7.toISOString().split('T')[0];

    const timeRange30 = JSON.stringify({ since: since30, until: todayStr });
    const timeRange7  = JSON.stringify({ since: since7,  until: todayStr });

    // Fetch all pages for each endpoint in parallel
    const [campaignDailyRows, adSetInfoRows, adSetInsightRows, adSetDailyRows, adInfoRows, adInsightRows, adDailyRows] = await Promise.all([
      fetchAllPages(`${BASE}/act_${account_id}/insights`, {
        fields: 'campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions,action_values,date_start,date_stop',
        time_range: timeRange30,
        time_increment: 1,
        level: 'campaign',
        action_attribution_windows: ['7d_click', '1d_view'],
        access_token,
        limit: 500,
      }),
      fetchAllPages(`${BASE}/act_${account_id}/adsets`, {
        fields: 'id,name,campaign_id,status,daily_budget',
        access_token, limit: 500,
      }, 15000),
      fetchAllPages(`${BASE}/act_${account_id}/insights`, {
        fields: 'adset_id,adset_name,campaign_id,spend,impressions,clicks,ctr,cpc,actions,action_values',
        time_range: timeRange7, level: 'adset',
        action_attribution_windows: ['7d_click', '1d_view'],
        access_token, limit: 500,
      }, 15000),
      // Daily breakdown per ad set (last 7 days)
      fetchAllPages(`${BASE}/act_${account_id}/insights`, {
        fields: 'adset_id,campaign_id,spend,impressions,clicks,ctr,cpc,actions,action_values,date_start',
        time_range: timeRange7, level: 'adset', time_increment: 1,
        action_attribution_windows: ['7d_click', '1d_view'],
        access_token, limit: 500,
      }, 20000),
      fetchAllPages(`${BASE}/act_${account_id}/ads`, {
        fields: 'id,name,adset_id,campaign_id,status',
        access_token, limit: 500,
      }, 15000),
      fetchAllPages(`${BASE}/act_${account_id}/insights`, {
        fields: 'ad_id,ad_name,adset_id,campaign_id,spend,impressions,clicks,ctr,cpc,actions,action_values',
        time_range: timeRange7, level: 'ad',
        action_attribution_windows: ['7d_click', '1d_view'],
        access_token, limit: 500,
      }, 15000),
      // Daily breakdown per ad (last 7 days)
      fetchAllPages(`${BASE}/act_${account_id}/insights`, {
        fields: 'ad_id,adset_id,campaign_id,spend,impressions,clicks,ctr,cpc,actions,action_values,date_start',
        time_range: timeRange7, level: 'ad', time_increment: 1,
        action_attribution_windows: ['7d_click', '1d_view'],
        access_token, limit: 500,
      }, 20000),
    ]);

    const campaignIdMap: Record<string, string> = {};

    // ─── Pass 1: Upsert unique campaigns ───
    const seenMetaCampaigns = new Set<string>();
    for (const row of campaignDailyRows) {
      if (seenMetaCampaigns.has(row.campaign_id)) continue;
      seenMetaCampaigns.add(row.campaign_id);

      const [existing] = await sql`
        SELECT id FROM campaigns WHERE user_id = ${req.userId!} AND meta_id = ${row.campaign_id}
      `;

      let campaignId: string;
      if (existing) {
        campaignId = existing.id;
        await sql`UPDATE campaigns SET status = 'active', updated_at = NOW() WHERE id = ${campaignId}`;
      } else {
        const [byName] = await sql`
          SELECT id FROM campaigns WHERE user_id = ${req.userId!} AND name = ${row.campaign_name} AND platform = 'meta'
        `;
        if (byName) {
          campaignId = byName.id;
          await sql`UPDATE campaigns SET meta_id = ${row.campaign_id}, status = 'active', updated_at = NOW() WHERE id = ${campaignId}`;
        } else {
          const [created] = await sql`
            INSERT INTO campaigns (user_id, name, platform, objective, status, budget, meta_id)
            VALUES (${req.userId!}, ${row.campaign_name}, 'meta', 'leads', 'active', 0, ${row.campaign_id})
            RETURNING id
          `;
          campaignId = created.id;
        }
      }
      campaignIdMap[row.campaign_id] = campaignId;
    }

    // ─── Pass 2: Save daily metrics (one row per campaign per day) ───
    let syncedMetrics = 0;
    for (const row of campaignDailyRows) {
      const campaignId = campaignIdMap[row.campaign_id];
      if (!campaignId) continue;

      const date = row.date_start; // YYYY-MM-DD — actual day from Meta
      const { leads, conversions, revenue } = extractActions(row.actions || [], row.action_values || []);
      const spend = parseFloat(row.spend || '0');
      const clicks = parseInt(row.clicks || '0');
      const impressions = parseInt(row.impressions || '0');
      const cpc = parseFloat(row.cpc || '0');
      const ctr = parseFloat(row.ctr || '0');
      const leadsOrConv = leads || conversions;
      const cpa = leadsOrConv > 0 ? spend / leadsOrConv : 0;
      const roas = spend > 0 && revenue > 0 ? revenue / spend : 0;

      await sql`
        INSERT INTO metrics (campaign_id, date, spend, leads, conversions, impressions, clicks, cpc, cpa, ctr, roas)
        VALUES (${campaignId}, ${date}, ${spend}, ${leads}, ${conversions}, ${impressions}, ${clicks}, ${cpc}, ${cpa}, ${ctr}, ${roas})
        ON CONFLICT (campaign_id, date) DO UPDATE SET
          spend = EXCLUDED.spend, leads = EXCLUDED.leads, conversions = EXCLUDED.conversions,
          impressions = EXCLUDED.impressions, clicks = EXCLUDED.clicks,
          cpc = EXCLUDED.cpc, cpa = EXCLUDED.cpa, ctr = EXCLUDED.ctr, roas = EXCLUDED.roas
      `;
      syncedMetrics++;
    }

    // ─── Ad Sets ───
    const adSetInfoMap: Record<string, any> = {};
    for (const as of adSetInfoRows) adSetInfoMap[as.id] = as;

    let syncedAdSets = 0;
    for (const row of adSetInsightRows) {
      const campaignId = campaignIdMap[row.campaign_id];
      if (!campaignId) continue;

      const info = adSetInfoMap[row.adset_id] || {};
      const { leads, conversions, revenue } = extractActions(row.actions || [], row.action_values || []);
      const spend = parseFloat(row.spend || '0');
      const clicks = parseInt(row.clicks || '0');
      const impressions = parseInt(row.impressions || '0');
      const cpc = parseFloat(row.cpc || '0');
      const ctr = parseFloat(row.ctr || '0');
      const leadsOrConv = leads || conversions;
      const cpa = leadsOrConv > 0 ? spend / leadsOrConv : 0;
      const roas = spend > 0 && revenue > 0 ? revenue / spend : 0;
      const daily_budget = parseFloat(info.daily_budget || '0') / 100;
      const status = info.status?.toLowerCase() || 'active';

      await sql`
        INSERT INTO ad_sets (meta_id, campaign_id, user_id, name, status, daily_budget, spend, impressions, clicks, leads, ctr, cpc, cpa, roas, updated_at)
        VALUES (${row.adset_id}, ${campaignId}, ${req.userId!}, ${row.adset_name}, ${status}, ${daily_budget}, ${spend}, ${impressions}, ${clicks}, ${leadsOrConv}, ${ctr}, ${cpc}, ${cpa}, ${roas}, NOW())
        ON CONFLICT (meta_id) DO UPDATE SET
          status = EXCLUDED.status, daily_budget = EXCLUDED.daily_budget,
          spend = EXCLUDED.spend, impressions = EXCLUDED.impressions, clicks = EXCLUDED.clicks,
          leads = EXCLUDED.leads, ctr = EXCLUDED.ctr, cpc = EXCLUDED.cpc, cpa = EXCLUDED.cpa,
          roas = EXCLUDED.roas, updated_at = NOW()
      `;
      syncedAdSets++;
    }

    // Update status for ALL known ad sets — even those without recent spend
    for (const [metaId, info] of Object.entries(adSetInfoMap)) {
      const status = (info as any).status?.toLowerCase() || 'unknown';
      await sql`
        UPDATE ad_sets SET status = ${status}, updated_at = NOW()
        WHERE meta_id = ${metaId} AND user_id = ${req.userId!}
      `;
    }

    // ─── Ad Set daily metrics ───
    for (const row of adSetDailyRows) {
      const campaignId = campaignIdMap[row.campaign_id];
      if (!campaignId) continue;
      const [adSet] = await sql`SELECT id FROM ad_sets WHERE meta_id = ${row.adset_id} AND user_id = ${req.userId!}`;
      if (!adSet) continue;
      const { leads, revenue } = extractActions(row.actions || [], row.action_values || []);
      const spend = parseFloat(row.spend || '0');
      const clicks = parseInt(row.clicks || '0');
      const impressions = parseInt(row.impressions || '0');
      const cpc = parseFloat(row.cpc || '0');
      const ctr = parseFloat(row.ctr || '0');
      const cpa = leads > 0 ? spend / leads : 0;
      const roas = spend > 0 && revenue > 0 ? revenue / spend : 0;
      await sql`
        INSERT INTO ad_set_daily_metrics (ad_set_id, campaign_id, user_id, date, spend, impressions, clicks, leads, ctr, cpc, cpa, roas)
        VALUES (${adSet.id}, ${campaignId}, ${req.userId!}, ${row.date_start}, ${spend}, ${impressions}, ${clicks}, ${leads}, ${ctr}, ${cpc}, ${cpa}, ${roas})
        ON CONFLICT (ad_set_id, date) DO UPDATE SET
          spend = EXCLUDED.spend, impressions = EXCLUDED.impressions, clicks = EXCLUDED.clicks,
          leads = EXCLUDED.leads, ctr = EXCLUDED.ctr, cpc = EXCLUDED.cpc, cpa = EXCLUDED.cpa, roas = EXCLUDED.roas
      `;
    }

    // ─── Ads ───
    const adInfoMap: Record<string, any> = {};
    for (const ad of adInfoRows) adInfoMap[ad.id] = ad;

    let syncedAds = 0;
    for (const row of adInsightRows) {
      const campaignId = campaignIdMap[row.campaign_id];
      if (!campaignId) continue;

      const [adSet] = await sql`SELECT id FROM ad_sets WHERE meta_id = ${row.adset_id}`;
      if (!adSet) continue;

      const info = adInfoMap[row.ad_id] || {};
      const { leads, conversions, revenue } = extractActions(row.actions || [], row.action_values || []);
      const spend = parseFloat(row.spend || '0');
      const clicks = parseInt(row.clicks || '0');
      const impressions = parseInt(row.impressions || '0');
      const cpc = parseFloat(row.cpc || '0');
      const ctr = parseFloat(row.ctr || '0');
      const leadsOrConv = leads || conversions;
      const cpa = leadsOrConv > 0 ? spend / leadsOrConv : 0;
      const roas = spend > 0 && revenue > 0 ? revenue / spend : 0;
      const status = info.status?.toLowerCase() || 'active';

      await sql`
        INSERT INTO ads (meta_id, ad_set_id, campaign_id, user_id, name, status, spend, impressions, clicks, leads, ctr, cpc, cpa, roas, updated_at)
        VALUES (${row.ad_id}, ${adSet.id}, ${campaignId}, ${req.userId!}, ${row.ad_name}, ${status}, ${spend}, ${impressions}, ${clicks}, ${leadsOrConv}, ${ctr}, ${cpc}, ${cpa}, ${roas}, NOW())
        ON CONFLICT (meta_id) DO UPDATE SET
          status = EXCLUDED.status, spend = EXCLUDED.spend, impressions = EXCLUDED.impressions,
          clicks = EXCLUDED.clicks, leads = EXCLUDED.leads, ctr = EXCLUDED.ctr,
          cpc = EXCLUDED.cpc, cpa = EXCLUDED.cpa, roas = EXCLUDED.roas, updated_at = NOW()
      `;
      syncedAds++;
    }

    // Update status for ALL known ads — even those without recent spend
    for (const [metaId, info] of Object.entries(adInfoMap)) {
      const status = (info as any).status?.toLowerCase() || 'unknown';
      await sql`
        UPDATE ads SET status = ${status}, updated_at = NOW()
        WHERE meta_id = ${metaId} AND user_id = ${req.userId!}
      `;
    }

    // ─── Ad daily metrics ───
    for (const row of adDailyRows) {
      const campaignId = campaignIdMap[row.campaign_id];
      if (!campaignId) continue;
      const [adSet] = await sql`SELECT id FROM ad_sets WHERE meta_id = ${row.adset_id} AND user_id = ${req.userId!}`;
      if (!adSet) continue;
      const [ad] = await sql`SELECT id FROM ads WHERE meta_id = ${row.ad_id} AND user_id = ${req.userId!}`;
      if (!ad) continue;
      const { leads, revenue } = extractActions(row.actions || [], row.action_values || []);
      const spend = parseFloat(row.spend || '0');
      const clicks = parseInt(row.clicks || '0');
      const impressions = parseInt(row.impressions || '0');
      const cpc = parseFloat(row.cpc || '0');
      const ctr = parseFloat(row.ctr || '0');
      const cpa = leads > 0 ? spend / leads : 0;
      const roas = spend > 0 && revenue > 0 ? revenue / spend : 0;
      await sql`
        INSERT INTO ad_daily_metrics (ad_id, ad_set_id, campaign_id, user_id, date, spend, impressions, clicks, leads, ctr, cpc, cpa, roas)
        VALUES (${ad.id}, ${adSet.id}, ${campaignId}, ${req.userId!}, ${row.date_start}, ${spend}, ${impressions}, ${clicks}, ${leads}, ${ctr}, ${cpc}, ${cpa}, ${roas})
        ON CONFLICT (ad_id, date) DO UPDATE SET
          spend = EXCLUDED.spend, impressions = EXCLUDED.impressions, clicks = EXCLUDED.clicks,
          leads = EXCLUDED.leads, ctr = EXCLUDED.ctr, cpc = EXCLUDED.cpc, cpa = EXCLUDED.cpa, roas = EXCLUDED.roas
      `;
    }

    await sql`
      UPDATE user_integrations SET last_sync_at = NOW(), last_sync_status = 'success'
      WHERE id = ${integration.id}
    `;

    // Collect all unique action_types seen for diagnostics
    const actionTypesFound = new Set<string>();
    for (const row of campaignDailyRows) {
      for (const a of (row.actions || [])) actionTypesFound.add(a.action_type as string);
    }

    res.json({
      success: true,
      data: {
        synced: seenMetaCampaigns.size,
        daily_metrics: syncedMetrics,
        ad_sets: syncedAdSets,
        ads: syncedAds,
        action_types_found: Array.from(actionTypesFound),
        message: `${seenMetaCampaigns.size} campanha(s) — ${syncedMetrics} registros diarios — ${syncedAdSets} conjunto(s) — ${syncedAds} anuncio(s) sincronizados.`,
      },
    });
  } catch (err: any) {
    await sql`
      UPDATE user_integrations SET last_sync_at = NOW(), last_sync_status = 'error'
      WHERE id = ${integration.id}
    `.catch(() => {});
    const msg = err.response?.data?.error?.message || err.message || 'Erro ao sincronizar com Meta Ads';
    res.status(500).json({ success: false, error: { message: msg } });
  }
});
