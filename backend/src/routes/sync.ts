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

const LEAD_ACTION_TYPES = [
  'lead',
  'offsite_conversion.fb_pixel_lead',
  'onsite_conversion.lead_grouped',
  'onsite_conversion.messaging_conversation_started_7d',
  'contact',
  'complete_registration',
  'submit_application',
  'schedule',
  'start_trial',
  'subscribe',
];

const PURCHASE_ACTION_TYPES = [
  'offsite_conversion.fb_pixel_purchase',
  'purchase',
  'omni_purchase',
];

function extractActions(actions: any[], actionValues: any[]) {
  // Sum all lead-type actions (pixel lead, native lead form, registration, etc.)
  const leads = actions
    .filter((a: any) => LEAD_ACTION_TYPES.includes(a.action_type))
    .reduce((sum: number, a: any) => sum + Number(a.value || 0), 0);

  const conversions = actions
    .filter((a: any) => PURCHASE_ACTION_TYPES.includes(a.action_type))
    .reduce((sum: number, a: any) => sum + Number(a.value || 0), 0);

  const revenue = actionValues
    .filter((a: any) => PURCHASE_ACTION_TYPES.includes(a.action_type))
    .reduce((sum: number, a: any) => sum + Number(a.value || 0), 0);

  return { leads, conversions, revenue };
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

    // Fetch daily campaign breakdown (last 30 days), adsets/ads aggregated (last 7 days)
    const [campaignDailyRes, adSetInfoRes, adSetInsightsRes, adInfoRes, adInsightsRes] = await Promise.all([
      axios.get(`https://graph.facebook.com/v20.0/act_${account_id}/insights`, {
        params: {
          fields: 'campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions,action_values',
          date_preset: 'last_30d',
          time_increment: 1,
          level: 'campaign',
          access_token,
          limit: 1000,
        },
        timeout: 20000,
      }),
      axios.get(`https://graph.facebook.com/v20.0/act_${account_id}/adsets`, {
        params: { fields: 'id,name,campaign_id,status,daily_budget', access_token, limit: 500 },
        timeout: 15000,
      }),
      axios.get(`https://graph.facebook.com/v20.0/act_${account_id}/insights`, {
        params: { fields: 'adset_id,adset_name,campaign_id,spend,impressions,clicks,ctr,cpc,actions,action_values', date_preset: 'last_7d', level: 'adset', access_token, limit: 500 },
        timeout: 15000,
      }),
      axios.get(`https://graph.facebook.com/v20.0/act_${account_id}/ads`, {
        params: { fields: 'id,name,adset_id,campaign_id,status', access_token, limit: 500 },
        timeout: 15000,
      }),
      axios.get(`https://graph.facebook.com/v20.0/act_${account_id}/insights`, {
        params: { fields: 'ad_id,ad_name,adset_id,campaign_id,spend,impressions,clicks,ctr,cpc,actions,action_values', date_preset: 'last_7d', level: 'ad', access_token, limit: 500 },
        timeout: 15000,
      }),
    ]);

    const campaignDailyRows = campaignDailyRes.data?.data || [];
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
    for (const as of (adSetInfoRes.data?.data || [])) adSetInfoMap[as.id] = as;

    let syncedAdSets = 0;
    for (const row of (adSetInsightsRes.data?.data || [])) {
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

    // ─── Ads ───
    const adInfoMap: Record<string, any> = {};
    for (const ad of (adInfoRes.data?.data || [])) adInfoMap[ad.id] = ad;

    let syncedAds = 0;
    for (const row of (adInsightsRes.data?.data || [])) {
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

    await sql`
      UPDATE user_integrations SET last_sync_at = NOW(), last_sync_status = 'success'
      WHERE id = ${integration.id}
    `;

    // Collect all unique action_types seen for diagnostics
    const actionTypesFound = new Set<string>();
    for (const row of campaignDailyRows) {
      for (const a of (row.actions || [])) actionTypesFound.add(a.action_type);
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
