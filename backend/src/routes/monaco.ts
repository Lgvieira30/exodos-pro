import { Router, Request, Response } from 'express';
import axios from 'axios';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { sql } from '../db/index.js';

export const monacoRouter = Router();

const MOSKIT_API = 'https://api.ms.prod.moskit.services/v2';
const DATA_INICIAL = '2026-05-01';

const CF = {
  url: 'CF_Pj3qYeieC0PvXqQe',
  palavraChave: 'CF_G21qV7ilCpZ1KMAX',
  medium: 'CF_A4wMWNigCBxK7qB8',
  source: 'CF_dVKmQ5i1C4aKomWR',
  anuncio: 'CF_2ojMxLiPCvGENMOE',
  lp: 'CF_Lo1qjyi1Ca2vKDer',
  match: 'CF_3nGqEoirCaJ4nmYA',
  campanha: 'CF_6rRmweivCyWYLq4X',
};

function getCustomField(deal: any, fieldId: string): string {
  const fields: any[] = deal.entityCustomFields || [];
  const field = fields.find((f) => f.id === fieldId);
  if (!field) return '';
  if (field.textValue !== undefined) return String(field.textValue || '');
  if (field.numericValue !== undefined) return String(field.numericValue || '');
  if (field.dateValue !== undefined) return String(field.dateValue || '');
  if (field.options !== undefined) return Array.isArray(field.options) ? field.options.join(', ') : String(field.options);
  return '';
}

function extractUrlParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!url || !url.includes('?')) return params;
  const query = url.split('?')[1].split('#')[0];
  query.split('&').forEach((pair) => {
    const parts = pair.split('=');
    const key = decodeURIComponent(parts[0] || '').trim();
    const value = decodeURIComponent((parts[1] || '').replace(/\+/g, ' ')).trim();
    if (key) params[key] = value;
  });
  return params;
}

function isMonacoGoogleAdsDeal(deal: any): boolean {
  const url = getCustomField(deal, CF.url).toLowerCase();
  const campanha = getCustomField(deal, CF.campanha).toLowerCase();
  const source = getCustomField(deal, CF.source).toLowerCase();
  const medium = getCustomField(deal, CF.medium).toLowerCase();
  const nome = String(deal.name || '').toLowerCase();
  const origin = String(deal.origin || '').toLowerCase();
  const dealSource = String(deal.source || '').toLowerCase();
  const stageId = deal.stage?.id ? String(deal.stage.id) : '';

  if (url.includes('bee2go.com.br')) return false;
  if (campanha.includes('bee_')) return false;
  if (stageId === '294887') return false;
  if (origin === 'moskit') return false;
  if (dealSource === 'manual') return false;
  if (nome.includes('pc_')) return false;
  if (nome.includes('evento')) return false;
  if (nome.includes('renovação') || nome.includes('renovacao')) return false;
  if (nome.includes('parceria')) return false;
  if (url.includes('/contato')) return false;

  if (url.includes('lp.monacobr.com.br') && url.includes('utm_source=google')) return true;
  if (url.includes('lp.monacobr.com.br') && url.includes('gclid=')) return true;
  if (source === 'google' && medium === 'paidsearch') return true;
  if (campanha === '23569743510') return true;

  return false;
}

function mapDealToLead(deal: any) {
  const url = getCustomField(deal, CF.url);
  const params = extractUrlParams(url);

  let campanha = getCustomField(deal, CF.campanha) || params.utm_campaign || params.gad_campaignid || '';
  let grupo = params.utm_adgroup || '';
  const anuncio = getCustomField(deal, CF.anuncio) || params.utm_content || '';
  const lp = getCustomField(deal, CF.lp) || '';
  const matchRaw = getCustomField(deal, CF.match) || params.utm_matchtype || '';
  const palavra = getCustomField(deal, CF.palavraChave) || params.utm_term || '';

  const matchMap: Record<string, string> = { p: 'Frase', e: 'Exata', b: 'Ampla' };
  const match = matchMap[matchRaw.toLowerCase()] || matchRaw;

  const statusMap: Record<string, string> = { WON: 'Ganhou', LOST: 'Perdeu', OPEN: 'Aberto' };
  const status = statusMap[String(deal.status || '').toUpperCase()] || 'Aberto';

  if (campanha === '23569743510') campanha = 'Search - Alta Intenção';
  if (grupo === '197239802870') grupo = 'Multas';

  const dateCreated = deal.dateCreated ? deal.dateCreated.split('T')[0] : null;

  return {
    moskit_deal_id: String(deal.id),
    data: dateCreated,
    lead: deal.name || '',
    status,
    campanha,
    grupo,
    anuncio,
    lp,
    match,
    palavra_chave: palavra,
  };
}

// GET /api/monaco/debug/moskit — diagnóstico: mostra raw deals do Moskit sem filtro
monacoRouter.get('/debug/moskit', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [integration] = await sql`
      SELECT id, access_token FROM user_integrations
      WHERE user_id = ${req.userId!} AND platform = 'moskit' AND is_active = true
    `;
    if (!integration) return res.status(400).json({ success: false, error: { message: 'Moskit não configurado' } });

    const from = String(req.query.from || DATA_INICIAL);
    const url = `${MOSKIT_API}/deals?quantity=100&sort=id&order=desc`;
    const resp = await axios.get(url, {
      headers: { Accept: 'application/json', apikey: integration.access_token },
      timeout: 25000,
    });

    const deals: any[] = Array.isArray(resp.data) ? resp.data : [];
    const headers = resp.headers as any;
    const nextPageToken = headers['x-moskit-listing-next-page-token'] || '';

    const stats = deals.map((deal: any) => {
      const dateStr = deal.dateCreated ? deal.dateCreated.split('T')[0] : '';
      const url = getCustomField(deal, CF.url);
      const campanha = getCustomField(deal, CF.campanha);
      const source = getCustomField(deal, CF.source);
      const medium = getCustomField(deal, CF.medium);
      const passaFiltro = isMonacoGoogleAdsDeal(deal);
      const maisAntigo = dateStr && dateStr < from;

      let motivo = '';
      if (maisAntigo) motivo = `mais antigo que ${from}`;
      else if (!passaFiltro) {
        if (url.includes('bee2go.com.br')) motivo = 'URL Beemon';
        else if (String(deal.origin || '').toLowerCase() === 'moskit') motivo = 'origin=moskit (manual)';
        else if (String(deal.source || '').toLowerCase() === 'manual') motivo = 'source=manual';
        else if (!url.includes('lp.monacobr.com.br')) motivo = `URL não é lp.monacobr.com.br (${url.slice(0, 80)})`;
        else if (!url.includes('utm_source=google') && !url.includes('gclid=')) motivo = 'URL sem utm_source=google ou gclid';
        else motivo = `source=${source} medium=${medium}`;
      } else motivo = '✅ Monaco Google Ads';

      return {
        id: deal.id,
        data: dateStr,
        nome: deal.name,
        status: deal.status,
        passaFiltro,
        motivo,
        url: url.slice(0, 100),
        campanha,
      };
    });

    const totalDeals = deals.length;
    const passaram = stats.filter((s: any) => s.passaFiltro).length;
    const maisAntigos = stats.filter((s: any) => s.motivo.startsWith('mais antigo')).length;
    const excluidos = stats.filter((s: any) => !s.passaFiltro && !s.motivo.startsWith('mais antigo')).length;

    res.json({
      success: true,
      data: {
        total_retornados: totalDeals,
        passaram_filtro: passaram,
        mais_antigos_que_cutoff: maisAntigos,
        excluidos_pelo_filtro: excluidos,
        has_next_page: !!nextPageToken,
        cutoff_date: from,
        deals: stats,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// GET /api/monaco/sync/status
monacoRouter.get('/sync/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const [moskit] = await sql`
      SELECT last_sync_at, last_sync_status FROM user_integrations
      WHERE user_id = ${req.userId!} AND platform = 'moskit' AND is_active = true
    `;
    const [leadCount] = await sql`SELECT COUNT(*) as count FROM monaco_crm_leads WHERE user_id = ${req.userId!}`;
    const [adsCount] = await sql`SELECT COUNT(*) as count FROM monaco_ads_metrics WHERE user_id = ${req.userId!}`;

    res.json({
      success: true,
      data: {
        moskit: moskit || null,
        leads_count: parseInt(String(leadCount?.count || '0')),
        ads_count: parseInt(String(adsCount?.count || '0')),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// POST /api/monaco/sync/moskit
monacoRouter.post('/sync/moskit', requireAuth, async (req: AuthRequest, res: Response) => {
  const [integration] = await sql`
    SELECT id, access_token FROM user_integrations
    WHERE user_id = ${req.userId!} AND platform = 'moskit' AND is_active = true
  `;

  if (!integration) {
    return res.status(400).json({
      success: false,
      error: { message: 'Integração Moskit não configurada. Adicione a API Key na aba de configuração.' },
    });
  }

  const apiKey = integration.access_token;
  let synced = 0;
  let updated = 0;
  let page = 1;
  let nextPageToken = '';
  let startOffset = 0;
  let totalFetched = 0;
  let totalExcludedFilter = 0;
  let totalOlder = 0;

  try {
    for (let i = 0; i < 50; i++) {
      let url = `${MOSKIT_API}/deals?quantity=100&sort=id&order=desc`;
      if (nextPageToken) {
        url += `&nextPageToken=${encodeURIComponent(nextPageToken)}`;
      } else if (i > 0) {
        url += `&start=${startOffset}`;
      }

      const resp = await axios.get(url, {
        headers: { Accept: 'application/json', apikey: apiKey },
        timeout: 25000,
      });

      const deals: any[] = resp.data;
      if (!Array.isArray(deals) || deals.length === 0) break;

      totalFetched += deals.length;
      startOffset += deals.length;
      let foundOlder = false;
      const toUpsert: ReturnType<typeof mapDealToLead>[] = [];

      for (const deal of deals) {
        const dateStr = deal.dateCreated ? deal.dateCreated.split('T')[0] : '';
        if (dateStr && dateStr < DATA_INICIAL) { foundOlder = true; totalOlder++; continue; }
        if (!isMonacoGoogleAdsDeal(deal)) { totalExcludedFilter++; continue; }
        toUpsert.push(mapDealToLead(deal));
      }

      for (const lead of toUpsert) {
        const existing = await sql`
          SELECT id FROM monaco_crm_leads WHERE user_id = ${req.userId!} AND moskit_deal_id = ${lead.moskit_deal_id}
        `;
        if (existing.length > 0) {
          await sql`
            UPDATE monaco_crm_leads SET
              status = ${lead.status}, campanha = ${lead.campanha}, grupo = ${lead.grupo},
              anuncio = ${lead.anuncio}, lp = ${lead.lp}, match = ${lead.match},
              palavra_chave = ${lead.palavra_chave}, synced_at = NOW()
            WHERE user_id = ${req.userId!} AND moskit_deal_id = ${lead.moskit_deal_id}
          `;
          updated++;
        } else {
          await sql`
            INSERT INTO monaco_crm_leads
              (user_id, moskit_deal_id, data, lead, status, campanha, grupo, anuncio, lp, match, palavra_chave)
            VALUES (
              ${req.userId!}, ${lead.moskit_deal_id}, ${lead.data}, ${lead.lead},
              ${lead.status}, ${lead.campanha}, ${lead.grupo}, ${lead.anuncio},
              ${lead.lp}, ${lead.match}, ${lead.palavra_chave}
            )
          `;
          synced++;
        }
      }

      const headers = resp.headers as any;
      nextPageToken =
        headers['x-moskit-listing-next-page-token'] ||
        headers['X-Moskit-Listing-Next-Page-Token'] ||
        '';

      if (foundOlder || deals.length < 100) break;
      page++;
    }

    await sql`
      UPDATE user_integrations SET last_sync_at = NOW(), last_sync_status = 'success'
      WHERE id = ${integration.id}
    `;

    res.json({ success: true, data: { synced, updated, pages: page, total_fetched: totalFetched, excluded_filter: totalExcludedFilter, older_than_cutoff: totalOlder } });
  } catch (err: any) {
    await sql`
      UPDATE user_integrations SET last_sync_at = NOW(), last_sync_status = 'error'
      WHERE id = ${integration.id}
    `.catch(() => {});
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// POST /api/monaco/ingest/ads
monacoRouter.post('/ingest/ads', requireAuth, async (req: AuthRequest, res: Response) => {
  const { rows } = req.body as { rows: any[] };
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, error: { message: 'Envie um array "rows" com os dados do Google Ads.' } });
  }

  let inserted = 0;
  let updated = 0;

  for (const row of rows) {
    const { data, conta, campanha, grupo, anuncio, investimento, impressoes, cliques, conversoes } = row;
    if (!data) continue;

    const invest = Number(investimento) || 0;
    const imp = Math.round(Number(impressoes) || 0);
    const cli = Math.round(Number(cliques) || 0);
    const conv = Number(conversoes) || 0;
    const ctr = imp > 0 ? cli / imp : 0;
    const cpc = cli > 0 ? invest / cli : 0;
    const cpl = conv > 0 ? invest / conv : 0;
    const campStr = String(campanha || '');
    const grupoStr = String(grupo || '');
    const anuncioStr = String(anuncio || '');
    const dataStr = typeof data === 'string' ? data.split('T')[0] : String(data);

    const existing = await sql`
      SELECT id FROM monaco_ads_metrics
      WHERE user_id = ${req.userId!} AND data = ${dataStr}
        AND campanha = ${campStr} AND grupo = ${grupoStr} AND anuncio = ${anuncioStr}
    `;

    if (existing.length > 0) {
      await sql`
        UPDATE monaco_ads_metrics SET
          conta = ${String(conta || '')}, investimento = ${invest}, impressoes = ${imp},
          cliques = ${cli}, conversoes = ${conv}, ctr = ${ctr}, cpc = ${cpc},
          cpl_ads = ${cpl}, synced_at = NOW()
        WHERE user_id = ${req.userId!} AND data = ${dataStr}
          AND campanha = ${campStr} AND grupo = ${grupoStr} AND anuncio = ${anuncioStr}
      `;
      updated++;
    } else {
      await sql`
        INSERT INTO monaco_ads_metrics
          (user_id, data, conta, campanha, grupo, anuncio, investimento, impressoes, cliques, conversoes, ctr, cpc, cpl_ads)
        VALUES (
          ${req.userId!}, ${dataStr}, ${String(conta || '')}, ${campStr}, ${grupoStr},
          ${anuncioStr}, ${invest}, ${imp}, ${cli}, ${conv}, ${ctr}, ${cpc}, ${cpl}
        )
      `;
      inserted++;
    }
  }

  res.json({ success: true, data: { inserted, updated, total: inserted + updated } });
});

// DELETE /api/monaco/ads — limpar todos os dados de ads do usuário
monacoRouter.delete('/ads', requireAuth, async (req: AuthRequest, res: Response) => {
  await sql`DELETE FROM monaco_ads_metrics WHERE user_id = ${req.userId!}`;
  res.json({ success: true });
});

// POST /api/monaco/ingest/crm — importar leads CRM da planilha
monacoRouter.post('/ingest/crm', requireAuth, async (req: AuthRequest, res: Response) => {
  const { rows } = req.body as { rows: any[] };
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, error: { message: 'Envie um array "rows" com os dados do CRM.' } });
  }

  let inserted = 0;
  let updated = 0;

  for (const row of rows) {
    const lead = String(row.lead || row.Lead || row.nome || row.Nome || '').trim();
    const dataStr = String(row.data || row.Data || row.date || '').split('T')[0];
    if (!lead || !dataStr) continue;

    const campanha = String(row.campanha || row.Campanha || '');
    const grupo = String(row.grupo || row.Grupo || '');
    const anuncio = String(row.anuncio || row.Anuncio || '');
    const lp = String(row.lp || row.LP || '');
    const match = String(row.match || row.Match || '');
    const palavra_chave = String(row.palavra_chave || row['palavra-chave'] || '');

    const statusRaw = String(row.status || row.Status || '').trim().toLowerCase();
    const statusMap: Record<string, string> = {
      ganhou: 'Ganhou', won: 'Ganhou', '1': 'Ganhou', fechado: 'Ganhou',
      perdeu: 'Perdeu', lost: 'Perdeu', '2': 'Perdeu',
      aberto: 'Aberto', open: 'Aberto', '3': 'Aberto', 'em aberto': 'Aberto',
    };
    const status = statusMap[statusRaw] || (statusRaw ? 'Aberto' : 'Aberto');

    const syntheticId = row.moskit_deal_id ||
      ('sheet_' + Buffer.from(`${lead}|${dataStr}|${campanha}`).toString('base64').replace(/[+=\/]/g, '').slice(0, 40));

    const existing = await sql`
      SELECT id FROM monaco_crm_leads WHERE user_id = ${req.userId!} AND moskit_deal_id = ${syntheticId}
    `;

    if (existing.length > 0) {
      await sql`
        UPDATE monaco_crm_leads SET
          data = ${dataStr}, lead = ${lead}, status = ${status},
          campanha = ${campanha}, grupo = ${grupo}, anuncio = ${anuncio},
          lp = ${lp}, match = ${match}, palavra_chave = ${palavra_chave}, synced_at = NOW()
        WHERE user_id = ${req.userId!} AND moskit_deal_id = ${syntheticId}
      `;
      updated++;
    } else {
      await sql`
        INSERT INTO monaco_crm_leads
          (user_id, moskit_deal_id, data, lead, status, campanha, grupo, anuncio, lp, match, palavra_chave)
        VALUES (
          ${req.userId!}, ${syntheticId}, ${dataStr}, ${lead}, ${status},
          ${campanha}, ${grupo}, ${anuncio}, ${lp}, ${match}, ${palavra_chave}
        )
      `;
      inserted++;
    }
  }

  res.json({ success: true, data: { inserted, updated, total: inserted + updated } });
});

// DELETE /api/monaco/crm — limpar todos os leads CRM do usuário
monacoRouter.delete('/crm', requireAuth, async (req: AuthRequest, res: Response) => {
  await sql`DELETE FROM monaco_crm_leads WHERE user_id = ${req.userId!}`;
  res.json({ success: true });
});

// GET /api/monaco/report
monacoRouter.get('/report', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { from, to, compare_from, compare_to } = req.query as Record<string, string>;

    const today = new Date().toISOString().split('T')[0];
    const endDate = to || today;
    const startDate = from || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const getSummary = async (dateFrom: string, dateTo: string) => {
      const [ads] = await sql`
        SELECT
          COALESCE(SUM(investimento), 0) as invest,
          COALESCE(SUM(impressoes), 0) as impressoes,
          COALESCE(SUM(cliques), 0) as cliques,
          COALESCE(SUM(conversoes), 0) as conversoes_ads
        FROM monaco_ads_metrics
        WHERE user_id = ${req.userId!} AND data BETWEEN ${dateFrom} AND ${dateTo}
      `;
      const [crm] = await sql`
        SELECT
          COUNT(*) as leads_crm,
          COUNT(*) FILTER (WHERE status = 'Ganhou') as ganhou,
          COUNT(*) FILTER (WHERE status = 'Perdeu') as perdeu,
          COUNT(*) FILTER (WHERE status = 'Aberto') as aberto
        FROM monaco_crm_leads
        WHERE user_id = ${req.userId!} AND data BETWEEN ${dateFrom} AND ${dateTo}
      `;

      const invest = Number(ads?.invest || 0);
      const impressoes = Number(ads?.impressoes || 0);
      const cliques = Number(ads?.cliques || 0);
      const conversoes_ads = Number(ads?.conversoes_ads || 0);
      const leads_crm = Number(crm?.leads_crm || 0);
      const ganhou = Number(crm?.ganhou || 0);
      const perdeu = Number(crm?.perdeu || 0);
      const aberto = Number(crm?.aberto || 0);

      return {
        invest,
        impressoes,
        cliques,
        conversoes_ads,
        leads_crm,
        ganhou,
        perdeu,
        aberto,
        cpl_ads: conversoes_ads > 0 ? invest / conversoes_ads : 0,
        cpl_crm: leads_crm > 0 ? invest / leads_crm : 0,
        win_rate: leads_crm > 0 ? (ganhou / leads_crm) * 100 : 0,
        ctr: impressoes > 0 ? (cliques / impressoes) * 100 : 0,
        cpc: cliques > 0 ? invest / cliques : 0,
      };
    };

    const getDaily = async (dateFrom: string, dateTo: string) => {
      const adsRows = await sql`
        SELECT data::text as date, SUM(investimento) as invest, SUM(cliques) as cliques, SUM(conversoes) as conversoes_ads
        FROM monaco_ads_metrics
        WHERE user_id = ${req.userId!} AND data BETWEEN ${dateFrom} AND ${dateTo}
        GROUP BY data ORDER BY data
      `;
      const crmRows = await sql`
        SELECT data::text as date,
          COUNT(*) as leads_crm,
          COUNT(*) FILTER (WHERE status = 'Ganhou') as ganhou,
          COUNT(*) FILTER (WHERE status = 'Perdeu') as perdeu,
          COUNT(*) FILTER (WHERE status = 'Aberto') as aberto
        FROM monaco_crm_leads
        WHERE user_id = ${req.userId!} AND data BETWEEN ${dateFrom} AND ${dateTo}
        GROUP BY data ORDER BY data
      `;

      const byDate: Record<string, any> = {};
      for (const r of adsRows) {
        byDate[r.date] = { date: r.date, invest: Number(r.invest), cliques: Number(r.cliques), conversoes_ads: Number(r.conversoes_ads), leads_crm: 0, ganhou: 0, perdeu: 0, aberto: 0 };
      }
      for (const r of crmRows) {
        if (!byDate[r.date]) byDate[r.date] = { date: r.date, invest: 0, cliques: 0, conversoes_ads: 0 };
        byDate[r.date].leads_crm = Number(r.leads_crm);
        byDate[r.date].ganhou = Number(r.ganhou);
        byDate[r.date].perdeu = Number(r.perdeu);
        byDate[r.date].aberto = Number(r.aberto);
      }

      return Object.values(byDate).sort((a: any, b: any) => a.date.localeCompare(b.date));
    };

    const getCampaigns = async (dateFrom: string, dateTo: string) => {
      const adsRows = await sql`
        SELECT campanha, grupo, anuncio,
          SUM(investimento) as invest, SUM(impressoes) as impressoes,
          SUM(cliques) as cliques, SUM(conversoes) as conversoes_ads
        FROM monaco_ads_metrics
        WHERE user_id = ${req.userId!} AND data BETWEEN ${dateFrom} AND ${dateTo}
        GROUP BY campanha, grupo, anuncio
        ORDER BY SUM(investimento) DESC
      `;
      const crmRows = await sql`
        SELECT campanha, grupo, anuncio,
          COUNT(*) as leads_crm,
          COUNT(*) FILTER (WHERE status = 'Ganhou') as ganhou,
          COUNT(*) FILTER (WHERE status = 'Perdeu') as perdeu,
          COUNT(*) FILTER (WHERE status = 'Aberto') as aberto
        FROM monaco_crm_leads
        WHERE user_id = ${req.userId!} AND data BETWEEN ${dateFrom} AND ${dateTo}
        GROUP BY campanha, grupo, anuncio
      `;

      const crmMap: Record<string, any> = {};
      for (const r of crmRows) {
        crmMap[`${r.campanha}|${r.grupo}|${r.anuncio}`] = r;
      }

      return adsRows.map((r) => {
        const c = crmMap[`${r.campanha}|${r.grupo}|${r.anuncio}`] || {};
        const invest = Number(r.invest);
        const leads_crm = Number(c.leads_crm || 0);
        const ganhou = Number(c.ganhou || 0);
        const perdeu = Number(c.perdeu || 0);
        const aberto = Number(c.aberto || 0);
        const impressoes = Number(r.impressoes);
        const cliques = Number(r.cliques);
        const conversoes_ads = Number(r.conversoes_ads);

        return {
          campanha: r.campanha,
          grupo: r.grupo,
          anuncio: r.anuncio,
          invest,
          impressoes,
          cliques,
          conversoes_ads,
          leads_crm,
          ganhou,
          perdeu,
          aberto,
          ctr: impressoes > 0 ? (cliques / impressoes) * 100 : 0,
          cpc: cliques > 0 ? invest / cliques : 0,
          cpl_ads: conversoes_ads > 0 ? invest / conversoes_ads : 0,
          cpl_crm: leads_crm > 0 ? invest / leads_crm : 0,
          win_rate: leads_crm > 0 ? (ganhou / leads_crm) * 100 : 0,
        };
      });
    };

    const getKeywords = async (dateFrom: string, dateTo: string) => {
      return sql`
        SELECT palavra_chave, match,
          COUNT(*) as leads,
          COUNT(*) FILTER (WHERE status = 'Ganhou') as ganhou,
          COUNT(*) FILTER (WHERE status = 'Perdeu') as perdeu,
          COUNT(*) FILTER (WHERE status = 'Aberto') as aberto
        FROM monaco_crm_leads
        WHERE user_id = ${req.userId!} AND data BETWEEN ${dateFrom} AND ${dateTo}
          AND palavra_chave IS NOT NULL AND palavra_chave != ''
        GROUP BY palavra_chave, match
        ORDER BY COUNT(*) DESC
        LIMIT 30
      `;
    };

    const [summary, comparison, daily, campaigns, keywords] = await Promise.all([
      getSummary(startDate, endDate),
      compare_from && compare_to ? getSummary(compare_from, compare_to) : Promise.resolve(null),
      getDaily(startDate, endDate),
      getCampaigns(startDate, endDate),
      getKeywords(startDate, endDate),
    ]);

    res.json({
      success: true,
      data: { summary, comparison, daily, campaigns, keywords, period: { from: startDate, to: endDate } },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});
