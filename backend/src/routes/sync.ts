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

function buildDateParams(date_range: string, start_date?: string, end_date?: string): Record<string, string> {
  if (date_range === 'custom' && start_date && end_date) {
    return { time_range: JSON.stringify({ since: start_date, until: end_date }) };
  }
  const presets: Record<string, string> = { today: 'today', '7d': 'last_7d', '30d': 'last_30d' };
  return { date_preset: presets[date_range] || 'last_7d' };
}

function extractActions(actions: { action_type: string; value: string }[], types: string[]): number {
  for (const t of types) {
    const found = actions.find((a) => a.action_type === t);
    if (found) return Number(found.value || 0);
  }
  return 0;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

syncRouter.post('/meta', async (req: AuthRequest, res: Response) => {
  const [integration] = await sql`
    SELECT access_token, account_id FROM user_integrations
    WHERE user_id = ${req.userId!} AND platform = 'meta'
  `;
  if (!integration) {
    res.status(400).json({ success: false, error: { message: 'Meta Ads não conectado. Configure em Configurações.' } });
    return;
  }

  const { date_range = '7d', start_date, end_date } = req.body || {};
  const { access_token, account_id } = integration;

  try {
    const dateParams = buildDateParams(date_range, start_date, end_date);

    const insightsRes = await axios.get(
      `https://graph.facebook.com/v20.0/act_${account_id}/insights`,
      {
        params: {
          fields: 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,reach,frequency,cpm,cpc,ctr,actions,action_values,video_30_sec_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions',
          level: 'ad',
          access_token,
          limit: 500,
          ...dateParams,
        },
        timeout: 30000,
      }
    );

    type MetaRow = Record<string, unknown>;
    type ActionRow = { action_type: string; value: string };

    const rows: MetaRow[] = insightsRes.data?.data || [];
    const today = new Date().toISOString().split('T')[0];

    interface AdEntry {
      ad_id: string; ad_name: string; spend: number; impressions: number; clicks: number;
      reach: number; frequency: number; cpm: number; cpc: number; ctr: number;
      leads: number; conversions: number; purchases: number; revenue: number;
      video_views: number; video_p25: number; video_p50: number; video_p75: number;
      video_p100: number; thruplays: number;
    }
    interface AdSetEntry { adset_name: string; ads: AdEntry[]; }
    interface CampaignEntry { campaign_name: string; adsets: Map<string, AdSetEntry>; }

    const byCampaign = new Map<string, CampaignEntry>();
    const adIdList: string[] = [];

    for (const row of rows) {
      const campaign_id = String(row.campaign_id);
      const adset_id = String(row.adset_id);
      const ad_id = String(row.ad_id);

      const actions: ActionRow[] = (row.actions as ActionRow[]) || [];
      const actionValues: ActionRow[] = (row.action_values as ActionRow[]) || [];

      const spend = parseFloat(String(row.spend || '0'));
      const impressions = parseInt(String(row.impressions || '0'));
      const clicks = parseInt(String(row.clicks || '0'));
      const reach = parseInt(String(row.reach || '0'));
      const frequency = parseFloat(String(row.frequency || '0'));
      const cpm = parseFloat(String(row.cpm || '0'));
      const cpc = parseFloat(String(row.cpc || '0'));
      const ctr = parseFloat(String(row.ctr || '0'));

      const leads = extractActions(actions, ['lead', 'onsite_conversion.lead_grouped']);
      const conversions = extractActions(actions, ['offsite_conversion.fb_pixel_purchase', 'purchase']);
      const revenue = extractActions(actionValues, ['offsite_conversion.fb_pixel_purchase', 'purchase']);

      const getVideoVal = (key: string) =>
        ((row[key] as ActionRow[]) || []).reduce((s, a) => s + Number(a.value || 0), 0);

      const video_views = getVideoVal('video_30_sec_watched_actions');
      const video_p25 = getVideoVal('video_p25_watched_actions');
      const video_p50 = getVideoVal('video_p50_watched_actions');
      const video_p75 = getVideoVal('video_p75_watched_actions');
      const video_p100 = getVideoVal('video_p100_watched_actions');
      const thruplays = extractActions(actions, ['video_thruplay_watched_actions']);

      if (!byCampaign.has(campaign_id)) {
        byCampaign.set(campaign_id, { campaign_name: String(row.campaign_name), adsets: new Map() });
      }
      const camp = byCampaign.get(campaign_id)!;

      if (!camp.adsets.has(adset_id)) {
        camp.adsets.set(adset_id, { adset_name: String(row.adset_name), ads: [] });
      }
      camp.adsets.get(adset_id)!.ads.push({
        ad_id, ad_name: String(row.ad_name), spend, impressions, clicks, reach, frequency,
        cpm, cpc, ctr, leads, conversions, purchases: conversions, revenue,
        video_views, video_p25, video_p50, video_p75, video_p100, thruplays,
      });

      if (!adIdList.includes(ad_id)) adIdList.push(ad_id);
    }

    for (const [meta_campaign_id, camp] of byCampaign) {
      let campaignId: string;
      const [byMetaId] = await sql`
        SELECT id FROM campaigns WHERE user_id = ${req.userId!} AND meta_id = ${meta_campaign_id} AND platform = 'meta'
      `;
      if (byMetaId) {
        campaignId = byMetaId.id;
        await sql`UPDATE campaigns SET name = ${camp.campaign_name}, status = 'active', updated_at = NOW() WHERE id = ${campaignId}`;
      } else {
        const [byName] = await sql`
          SELECT id FROM campaigns WHERE user_id = ${req.userId!} AND name = ${camp.campaign_name} AND platform = 'meta'
        `;
        if (byName) {
          campaignId = byName.id;
          await sql`UPDATE campaigns SET meta_id = ${meta_campaign_id}, status = 'active', updated_at = NOW() WHERE id = ${campaignId}`;
        } else {
          const [created] = await sql`
            INSERT INTO campaigns (user_id, name, platform, objective, status, budget, meta_id)
            VALUES (${req.userId!}, ${camp.campaign_name}, 'meta', 'leads', 'active', 0, ${meta_campaign_id})
            RETURNING id
          `;
          campaignId = created.id;
        }
      }

      let campSpend = 0, campImpressions = 0, campClicks = 0, campReach = 0;
      let campLeads = 0, campConversions = 0, campPurchases = 0, campRevenue = 0;
      let campVideoViews = 0, campThruplays = 0;

      for (const [meta_adset_id, adset] of camp.adsets) {
        let adSetId: string;
        const [existingAS] = await sql`SELECT id FROM ad_sets WHERE campaign_id = ${campaignId} AND meta_id = ${meta_adset_id}`;
        if (existingAS) {
          adSetId = existingAS.id;
          await sql`UPDATE ad_sets SET name = ${adset.adset_name}, updated_at = NOW() WHERE id = ${adSetId}`;
        } else {
          const [created] = await sql`
            INSERT INTO ad_sets (meta_id, campaign_id, name, status)
            VALUES (${meta_adset_id}, ${campaignId}, ${adset.adset_name}, 'active')
            RETURNING id
          `;
          adSetId = created.id;
        }

        let asSpend = 0, asImpressions = 0, asClicks = 0, asReach = 0;
        let asLeads = 0, asConversions = 0, asPurchases = 0, asRevenue = 0;
        let asVideoViews = 0, asThruplays = 0;

        for (const ad of adset.ads) {
          asSpend += ad.spend; asImpressions += ad.impressions; asClicks += ad.clicks;
          asReach += ad.reach; asLeads += ad.leads; asConversions += ad.conversions;
          asPurchases += ad.purchases; asRevenue += ad.revenue;
          asVideoViews += ad.video_views; asThruplays += ad.thruplays;

          let adDbId: string;
          const [existingAd] = await sql`SELECT id FROM ads WHERE ad_set_id = ${adSetId} AND meta_id = ${ad.ad_id}`;
          if (existingAd) {
            adDbId = existingAd.id;
            await sql`UPDATE ads SET name = ${ad.ad_name}, updated_at = NOW() WHERE id = ${adDbId}`;
          } else {
            const [created] = await sql`
              INSERT INTO ads (meta_id, ad_set_id, name, status)
              VALUES (${ad.ad_id}, ${adSetId}, ${ad.ad_name}, 'active')
              RETURNING id
            `;
            adDbId = created.id;
          }

          const leadsOrConv = ad.leads || ad.conversions;
          const adCpa = leadsOrConv > 0 ? ad.spend / leadsOrConv : 0;
          const adRoas = ad.spend > 0 && ad.revenue > 0 ? ad.revenue / ad.spend : 0;
          const hookRate = ad.impressions > 0 ? (ad.video_p25 / ad.impressions) * 100 : 0;
          const holdRate = ad.video_p25 > 0 ? (ad.video_p100 / ad.video_p25) * 100 : 0;

          await sql`
            INSERT INTO ad_metrics (ad_id, date, spend, impressions, clicks, reach, frequency, cpm, cpc, ctr,
              leads, conversions, purchases, revenue, cpa, roas, video_views, video_p25, video_p50,
              video_p75, video_p100, thruplays, hook_rate, hold_rate)
            VALUES (${adDbId}, ${today}, ${ad.spend}, ${ad.impressions}, ${ad.clicks}, ${ad.reach},
              ${ad.frequency}, ${ad.cpm}, ${ad.cpc}, ${ad.ctr}, ${ad.leads}, ${ad.conversions},
              ${ad.purchases}, ${ad.revenue}, ${adCpa}, ${adRoas}, ${ad.video_views}, ${ad.video_p25},
              ${ad.video_p50}, ${ad.video_p75}, ${ad.video_p100}, ${ad.thruplays}, ${hookRate}, ${holdRate})
            ON CONFLICT (ad_id, date) DO UPDATE SET
              spend=EXCLUDED.spend, impressions=EXCLUDED.impressions, clicks=EXCLUDED.clicks,
              reach=EXCLUDED.reach, frequency=EXCLUDED.frequency, cpm=EXCLUDED.cpm, cpc=EXCLUDED.cpc,
              ctr=EXCLUDED.ctr, leads=EXCLUDED.leads, conversions=EXCLUDED.conversions,
              purchases=EXCLUDED.purchases, revenue=EXCLUDED.revenue, cpa=EXCLUDED.cpa, roas=EXCLUDED.roas,
              video_views=EXCLUDED.video_views, video_p25=EXCLUDED.video_p25, video_p50=EXCLUDED.video_p50,
              video_p75=EXCLUDED.video_p75, video_p100=EXCLUDED.video_p100, thruplays=EXCLUDED.thruplays,
              hook_rate=EXCLUDED.hook_rate, hold_rate=EXCLUDED.hold_rate
          `;
        }

        const asFreq = asReach > 0 ? asImpressions / asReach : 0;
        const asCpm = asImpressions > 0 ? (asSpend / asImpressions) * 1000 : 0;
        const asCpc = asClicks > 0 ? asSpend / asClicks : 0;
        const asCtr = asImpressions > 0 ? (asClicks / asImpressions) * 100 : 0;
        const asLeadsOrConv = asLeads || asConversions;
        const asCpa = asLeadsOrConv > 0 ? asSpend / asLeadsOrConv : 0;
        const asRoas = asSpend > 0 && asRevenue > 0 ? asRevenue / asSpend : 0;

        await sql`
          INSERT INTO ad_set_metrics (ad_set_id, date, spend, impressions, clicks, reach, frequency, cpm, cpc, ctr,
            leads, conversions, purchases, revenue, cpa, roas, video_views, thruplays)
          VALUES (${adSetId}, ${today}, ${asSpend}, ${asImpressions}, ${asClicks}, ${asReach},
            ${asFreq}, ${asCpm}, ${asCpc}, ${asCtr}, ${asLeads}, ${asConversions}, ${asPurchases},
            ${asRevenue}, ${asCpa}, ${asRoas}, ${asVideoViews}, ${asThruplays})
          ON CONFLICT (ad_set_id, date) DO UPDATE SET
            spend=EXCLUDED.spend, impressions=EXCLUDED.impressions, clicks=EXCLUDED.clicks,
            reach=EXCLUDED.reach, frequency=EXCLUDED.frequency, cpm=EXCLUDED.cpm, cpc=EXCLUDED.cpc,
            ctr=EXCLUDED.ctr, leads=EXCLUDED.leads, conversions=EXCLUDED.conversions,
            purchases=EXCLUDED.purchases, revenue=EXCLUDED.revenue, cpa=EXCLUDED.cpa, roas=EXCLUDED.roas,
            video_views=EXCLUDED.video_views, thruplays=EXCLUDED.thruplays
        `;

        campSpend += asSpend; campImpressions += asImpressions; campClicks += asClicks;
        campReach += asReach; campLeads += asLeads; campConversions += asConversions;
        campPurchases += asPurchases; campRevenue += asRevenue;
        campVideoViews += asVideoViews; campThruplays += asThruplays;
      }

      const campFreq = campReach > 0 ? campImpressions / campReach : 0;
      const campCpm = campImpressions > 0 ? (campSpend / campImpressions) * 1000 : 0;
      const campCpc = campClicks > 0 ? campSpend / campClicks : 0;
      const campCtr = campImpressions > 0 ? (campClicks / campImpressions) * 100 : 0;
      const campLeadsOrConv = campLeads || campConversions;
      const campCpa = campLeadsOrConv > 0 ? campSpend / campLeadsOrConv : 0;
      const campRoas = campSpend > 0 && campRevenue > 0 ? campRevenue / campSpend : 0;

      await sql`
        INSERT INTO metrics (campaign_id, date, spend, leads, conversions, impressions, clicks, cpc, cpa, ctr, roas,
          reach, frequency, cpm, purchases, revenue, video_views, thruplays)
        VALUES (${campaignId}, ${today}, ${campSpend}, ${campLeads}, ${campConversions}, ${campImpressions},
          ${campClicks}, ${campCpc}, ${campCpa}, ${campCtr}, ${campRoas}, ${campReach}, ${campFreq},
          ${campCpm}, ${campPurchases}, ${campRevenue}, ${campVideoViews}, ${campThruplays})
        ON CONFLICT (campaign_id, date) DO UPDATE SET
          spend=EXCLUDED.spend, leads=EXCLUDED.leads, conversions=EXCLUDED.conversions,
          impressions=EXCLUDED.impressions, clicks=EXCLUDED.clicks, cpc=EXCLUDED.cpc, cpa=EXCLUDED.cpa,
          ctr=EXCLUDED.ctr, roas=EXCLUDED.roas, reach=EXCLUDED.reach, frequency=EXCLUDED.frequency,
          cpm=EXCLUDED.cpm, purchases=EXCLUDED.purchases, revenue=EXCLUDED.revenue,
          video_views=EXCLUDED.video_views, thruplays=EXCLUDED.thruplays
      `;
    }

    // Criativos em batches
    try {
      for (const batch of chunk(adIdList, 5)) {
        const results = await Promise.all(
          batch.map((ad_id) =>
            axios.get(`https://graph.facebook.com/v20.0/${ad_id}`, {
              params: { fields: 'creative{thumbnail_url,title,body}', access_token },
              timeout: 10000,
            }).catch(() => null)
          )
        );
        for (const res of results) {
          if (!res?.data) continue;
          const creative = res.data.creative || {};
          await sql`
            UPDATE ads SET
              creative_url = COALESCE(${creative.thumbnail_url || null}, creative_url),
              headline = COALESCE(${creative.title || null}, headline),
              body = COALESCE(${creative.body || null}, body),
              updated_at = NOW()
            WHERE meta_id = ${String(res.data.id)}
          `;
        }
      }
    } catch { /* criativos não são críticos */ }

    // Breakdowns por idade/gênero e placement
    try {
      const breakdownDefs = [
        { breakdowns: 'age,gender', type: 'age_gender' },
        { breakdowns: 'publisher_platform,platform_position', type: 'placement' },
      ];
      for (const { breakdowns, type } of breakdownDefs) {
        const bdRes = await axios.get(
          `https://graph.facebook.com/v20.0/act_${account_id}/insights`,
          {
            params: { fields: 'ad_id,spend,impressions,clicks,actions,cpc,ctr', level: 'ad', breakdowns, access_token, limit: 500, ...dateParams },
            timeout: 20000,
          }
        );
        for (const bdRow of (bdRes.data?.data || []) as MetaRow[]) {
          const [adDb] = await sql`SELECT id FROM ads WHERE meta_id = ${String(bdRow.ad_id)}`;
          if (!adDb) continue;

          const breakdown_value = type === 'age_gender'
            ? `${bdRow.age || ''}_${bdRow.gender || ''}`
            : `${bdRow.publisher_platform || ''}_${bdRow.platform_position || ''}`;

          type ActionRow2 = { action_type: string; value: string };
          const bdActions: ActionRow2[] = (bdRow.actions as ActionRow2[]) || [];
          const bdSpend = parseFloat(String(bdRow.spend || '0'));
          const bdImpressions = parseInt(String(bdRow.impressions || '0'));
          const bdClicks = parseInt(String(bdRow.clicks || '0'));
          const bdLeads = extractActions(bdActions, ['lead', 'onsite_conversion.lead_grouped']);
          const bdConv = extractActions(bdActions, ['offsite_conversion.fb_pixel_purchase', 'purchase']);
          const bdCpc = parseFloat(String(bdRow.cpc || '0'));
          const bdCtr = parseFloat(String(bdRow.ctr || '0'));
          const bdLeadsOrConv = bdLeads || bdConv;
          const bdCpa = bdLeadsOrConv > 0 ? bdSpend / bdLeadsOrConv : 0;

          await sql`
            INSERT INTO metric_breakdowns (entity_type, entity_id, date, breakdown_type, breakdown_value,
              spend, impressions, clicks, leads, conversions, cpc, ctr, cpa)
            VALUES ('ad', ${adDb.id}, ${today}, ${type}, ${breakdown_value},
              ${bdSpend}, ${bdImpressions}, ${bdClicks}, ${bdLeads}, ${bdConv}, ${bdCpc}, ${bdCtr}, ${bdCpa})
          `;
        }
      }
    } catch { /* breakdowns não são críticos */ }

    await sql`
      UPDATE user_integrations SET last_sync_at = NOW(), last_sync_status = 'success'
      WHERE user_id = ${req.userId!} AND platform = 'meta'
    `;

    res.json({ success: true, data: { synced: rows.length, message: `${rows.length} anúncio(s) sincronizado(s) do Meta Ads.` } });
  } catch (err: unknown) {
    await sql`
      UPDATE user_integrations SET last_sync_at = NOW(), last_sync_status = 'error'
      WHERE user_id = ${req.userId!} AND platform = 'meta'
    `.catch(() => {});
    const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
    res.status(500).json({ success: false, error: { message: e.response?.data?.error?.message || e.message || 'Erro ao sincronizar com Meta Ads' } });
  }
});
