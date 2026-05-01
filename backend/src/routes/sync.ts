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
    const metaRes = await axios.get(
      `https://graph.facebook.com/v20.0/act_${account_id}/insights`,
      {
        params: {
          fields: 'campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions,action_values',
          date_preset: 'last_7d',
          level: 'campaign',
          access_token,
          limit: 100,
        },
        timeout: 15000,
      }
    );

    const rows = metaRes.data?.data || [];
    let synced = 0;

    for (const row of rows) {
      const actions: any[] = row.actions || [];
      const actionValues: any[] = row.action_values || [];

      const leads = Number(actions.find((a: any) => a.action_type === 'lead')?.value || 0);
      const conversions = Number(actions.find((a: any) =>
        a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
        a.action_type === 'purchase'
      )?.value || 0);
      const revenue = Number(actionValues.find((a: any) =>
        a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
        a.action_type === 'purchase'
      )?.value || 0);

      const spend = parseFloat(row.spend || '0');
      const clicks = parseInt(row.clicks || '0');
      const impressions = parseInt(row.impressions || '0');
      const cpc = parseFloat(row.cpc || '0');
      const ctr = parseFloat(row.ctr || '0');
      const leadsOrConv = leads || conversions;
      const cpa = leadsOrConv > 0 ? spend / leadsOrConv : 0;
      const roas = spend > 0 && revenue > 0 ? revenue / spend : 0;
      const today = new Date().toISOString().split('T')[0];

      const [existing] = await sql`
        SELECT id FROM campaigns
        WHERE user_id = ${req.userId!} AND name = ${row.campaign_name} AND platform = 'meta'
      `;

      let campaignId: string;
      if (existing) {
        campaignId = existing.id;
        await sql`UPDATE campaigns SET status = 'active', updated_at = NOW() WHERE id = ${campaignId}`;
      } else {
        const [created] = await sql`
          INSERT INTO campaigns (user_id, name, platform, objective, status, budget)
          VALUES (${req.userId!}, ${row.campaign_name}, 'meta', 'leads', 'active', 0)
          RETURNING id
        `;
        campaignId = created.id;
      }

      await sql`
        INSERT INTO metrics (campaign_id, date, spend, leads, conversions, impressions, clicks, cpc, cpa, ctr, roas)
        VALUES (${campaignId}, ${today}, ${spend}, ${leads}, ${conversions}, ${impressions}, ${clicks}, ${cpc}, ${cpa}, ${ctr}, ${roas})
        ON CONFLICT (campaign_id, date) DO UPDATE SET
          spend = EXCLUDED.spend, leads = EXCLUDED.leads, conversions = EXCLUDED.conversions,
          impressions = EXCLUDED.impressions, clicks = EXCLUDED.clicks,
          cpc = EXCLUDED.cpc, cpa = EXCLUDED.cpa, ctr = EXCLUDED.ctr, roas = EXCLUDED.roas
      `;
      synced++;
    }

    await sql`
      UPDATE user_integrations SET last_sync_at = NOW(), last_sync_status = 'success'
      WHERE id = ${integration.id}
    `;

    res.json({ success: true, data: { synced, message: `${synced} campanha(s) sincronizada(s) do Meta Ads.` } });
  } catch (err: any) {
    await sql`
      UPDATE user_integrations SET last_sync_at = NOW(), last_sync_status = 'error'
      WHERE id = ${integration.id}
    `.catch(() => {});
    const msg = err.response?.data?.error?.message || err.message || 'Erro ao sincronizar com Meta Ads';
    res.status(500).json({ success: false, error: { message: msg } });
  }
});
