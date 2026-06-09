import { Router, Response } from 'express';
import axios from 'axios';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { sql } from '../db/index.js';

export const beemonRouter = Router();
beemonRouter.use(requireAuth);

const MOSKIT_API = 'https://api.ms.prod.moskit.services/v2';

// Custom fields do Moskit (mesma instancia da Monaco)
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
    const key = decodeURIComponent(parts[0] || '').trim().toLowerCase();
    const value = decodeURIComponent((parts[1] || '').replace(/\+/g, ' ')).trim();
    if (key) params[key] = value;
  });
  return params;
}

// Inclui leads da Beemon (oposto do filtro da Monaco, que exclui bee2go)
function isBeemonDeal(deal: any): boolean {
  const url = getCustomField(deal, CF.url).toLowerCase();
  const campanha = getCustomField(deal, CF.campanha).toLowerCase();
  const source = getCustomField(deal, CF.source).toLowerCase();
  const origin = String(deal.origin || '').toLowerCase();
  const dealSource = String(deal.source || '').toLowerCase();

  if (origin === 'moskit') return false;       // criado manualmente
  if (dealSource === 'manual') return false;

  if (url.includes('bee2go.com.br')) return true;
  if (campanha.includes('bee_')) return true;
  if (['facebook', 'instagram', 'meta', 'ig', 'fb'].includes(source)) return true;
  return false;
}

const STATUS_MAP: Record<string, string> = { WON: 'Ganhou', LOST: 'Perdido', OPEN: 'Aberto' };

function mapDeal(deal: any) {
  const url = getCustomField(deal, CF.url);
  const p = extractUrlParams(url);
  return {
    moskit_deal_id: String(deal.id),
    data: deal.dateCreated ? deal.dateCreated.split('T')[0] : null,
    lead: deal.name || '',
    empresa: deal.name || '',
    veiculos: '',
    estado: '',
    status: STATUS_MAP[String(deal.status || '').toUpperCase()] || 'Aberto',
    utm_source: p.utm_source || getCustomField(deal, CF.source) || '',
    utm_campaign: p.utm_campaign || getCustomField(deal, CF.campanha) || '',
    utm_term: p.utm_term || getCustomField(deal, CF.palavraChave) || '',
    utm_content: p.utm_content || getCustomField(deal, CF.anuncio) || '',
    pagina: url || '',
  };
}

// POST /api/beemon/sync/crm — puxa os leads bee2go do Moskit
beemonRouter.post('/sync/crm', async (req: AuthRequest, res: Response) => {
  const [integration] = await sql`
    SELECT id, access_token FROM user_integrations
    WHERE user_id = ${req.userId!} AND platform = 'moskit' AND is_active = true
  `;
  if (!integration) {
    res.status(400).json({ success: false, error: { message: 'Moskit nao conectado. Conecte na pagina Monaco (Configurar Moskit).' } });
    return;
  }

  const apiKey = integration.access_token;
  let synced = 0, updated = 0, totalFetched = 0, matched = 0;
  let startOffset = 0, nextPageToken = '';

  try {
    for (let i = 0; i < 40; i++) {
      let url = `${MOSKIT_API}/deals?quantity=100&sort=id&order=desc`;
      if (nextPageToken) url += `&nextPageToken=${encodeURIComponent(nextPageToken)}`;
      else if (i > 0) url += `&start=${startOffset}`;

      const resp = await axios.get(url, { headers: { Accept: 'application/json', apikey: apiKey }, timeout: 25000 });
      const deals: any[] = resp.data;
      if (!Array.isArray(deals) || deals.length === 0) break;

      totalFetched += deals.length;
      startOffset += deals.length;

      for (const deal of deals) {
        if (!isBeemonDeal(deal)) continue;
        matched++;
        const lead = mapDeal(deal);
        const existing = await sql`
          SELECT id FROM beemon_crm_leads WHERE user_id = ${req.userId!} AND moskit_deal_id = ${lead.moskit_deal_id}
        `;
        if (existing.length > 0) {
          await sql`
            UPDATE beemon_crm_leads SET
              data = ${lead.data}, lead = ${lead.lead}, status = ${lead.status},
              utm_source = ${lead.utm_source}, utm_campaign = ${lead.utm_campaign},
              utm_term = ${lead.utm_term}, utm_content = ${lead.utm_content},
              pagina = ${lead.pagina}, synced_at = NOW()
            WHERE user_id = ${req.userId!} AND moskit_deal_id = ${lead.moskit_deal_id}
          `;
          updated++;
        } else {
          await sql`
            INSERT INTO beemon_crm_leads
              (user_id, moskit_deal_id, data, lead, empresa, veiculos, estado, status, utm_source, utm_campaign, utm_term, utm_content, pagina)
            VALUES (${req.userId!}, ${lead.moskit_deal_id}, ${lead.data}, ${lead.lead}, ${lead.empresa},
              ${lead.veiculos}, ${lead.estado}, ${lead.status}, ${lead.utm_source}, ${lead.utm_campaign},
              ${lead.utm_term}, ${lead.utm_content}, ${lead.pagina})
          `;
          synced++;
        }
      }

      const headers = resp.headers as any;
      nextPageToken = headers['x-moskit-listing-next-page-token'] || headers['X-Moskit-Listing-Next-Page-Token'] || '';
      if (deals.length < 100) break;
    }

    res.json({ success: true, data: { synced, updated, matched, total_fetched: totalFetched, message: `${matched} lead(s) Beemon encontrados — ${synced} novos, ${updated} atualizados.` } });
  } catch (err: any) {
    const msg = err.response?.data?.error?.message || err.message || 'Erro ao sincronizar Moskit';
    console.error('[beemon/sync/crm] ERRO:', msg);
    res.status(500).json({ success: false, error: { message: msg } });
  }
});

// GET /api/beemon/leads — lista os leads sincronizados (para conferir os UTMs)
beemonRouter.get('/leads', async (req: AuthRequest, res: Response) => {
  const leads = await sql`
    SELECT moskit_deal_id, data, lead, status, utm_source, utm_campaign, utm_term, utm_content, pagina
    FROM beemon_crm_leads WHERE user_id = ${req.userId!}
    ORDER BY data DESC NULLS LAST, synced_at DESC
    LIMIT 500
  `;
  res.json({ success: true, data: { leads } });
});

// GET /api/beemon/report?from=&to= — resumo CRM + rankings por UTM + comparativo
beemonRouter.get('/report', async (req: AuthRequest, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
  const to = (req.query.to as string) || today;
  const from = (req.query.from as string) || new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];

  // Periodo anterior de mesma duracao (para o comparativo semana vs semana)
  const fromD = new Date(from), toD = new Date(to);
  const lenDays = Math.round((toD.getTime() - fromD.getTime()) / 86400000) + 1;
  const prevTo = new Date(fromD); prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - lenDays + 1);
  const prevFromStr = prevFrom.toISOString().split('T')[0];
  const prevToStr = prevTo.toISOString().split('T')[0];

  const totalsFor = async (dFrom: string, dTo: string) => {
    const [t] = await sql`
      SELECT
        COUNT(*) AS oportunidades,
        COUNT(*) FILTER (WHERE status = 'Ganhou') AS ganhos,
        COUNT(*) FILTER (WHERE status = 'Aberto') AS abertos,
        COUNT(*) FILTER (WHERE status = 'Perdido') AS perdidos
      FROM beemon_crm_leads
      WHERE user_id = ${req.userId!} AND data BETWEEN ${dFrom} AND ${dTo}
    `;
    return {
      oportunidades: Number(t?.oportunidades || 0),
      ganhos: Number(t?.ganhos || 0),
      abertos: Number(t?.abertos || 0),
      perdidos: Number(t?.perdidos || 0),
    };
  };

  const [totals, previous] = await Promise.all([
    totalsFor(from, to),
    totalsFor(prevFromStr, prevToStr),
  ]);

  // Série diária (leads por dia, por status) para gráfico/calendário
  const daily = await sql`
    SELECT data::text AS date,
      COUNT(*) AS leads,
      COUNT(*) FILTER (WHERE status = 'Ganhou') AS ganhos,
      COUNT(*) FILTER (WHERE status = 'Aberto') AS abertos,
      COUNT(*) FILTER (WHERE status = 'Perdido') AS perdidos
    FROM beemon_crm_leads
    WHERE user_id = ${req.userId!} AND data BETWEEN ${from} AND ${to}
    GROUP BY data ORDER BY data
  `;

  const ranking = (col: 'utm_campaign' | 'utm_term' | 'utm_content') => sql`
    SELECT ${sql(col)} AS chave,
      COUNT(*) AS leads,
      COUNT(*) FILTER (WHERE status = 'Ganhou') AS ganhos,
      COUNT(*) FILTER (WHERE status = 'Aberto') AS abertos,
      COUNT(*) FILTER (WHERE status = 'Perdido') AS perdidos
    FROM beemon_crm_leads
    WHERE user_id = ${req.userId!} AND data BETWEEN ${from} AND ${to}
      AND ${sql(col)} IS NOT NULL AND ${sql(col)} != ''
    GROUP BY ${sql(col)}
    ORDER BY COUNT(*) FILTER (WHERE status = 'Ganhou') DESC, COUNT(*) DESC
    LIMIT 30
  `;

  const [campanhas, conjuntos, criativos] = await Promise.all([
    ranking('utm_campaign'),
    ranking('utm_term'),
    ranking('utm_content'),
  ]);

  // ─── Criativo × CRM × Ganhos (o ranking que importa) ───
  // Cruza os leads do CRM (por utm_content = nome do criativo) com o gasto do Meta
  // (tabela ads, casando pelo nome do anuncio). Onde nao casa, o investimento fica nulo.
  const cruzamento = await sql`
    SELECT
      l.utm_content AS criativo,
      COUNT(*) AS total_crm,
      COUNT(*) FILTER (WHERE l.status = 'Ganhou') AS ganhos,
      COUNT(*) FILTER (WHERE l.status = 'Aberto') AS abertos,
      COUNT(*) FILTER (WHERE l.status = 'Perdido') AS perdidos,
      MAX(a.spend) AS investimento,
      MAX(a.leads) AS leads_meta
    FROM beemon_crm_leads l
    LEFT JOIN ads a ON a.user_id = l.user_id AND LOWER(TRIM(a.name)) = LOWER(TRIM(l.utm_content))
    WHERE l.user_id = ${req.userId!} AND l.data BETWEEN ${from} AND ${to}
      AND l.utm_content IS NOT NULL AND l.utm_content != ''
    GROUP BY l.utm_content
    ORDER BY COUNT(*) FILTER (WHERE l.status = 'Ganhou') DESC, COUNT(*) DESC
    LIMIT 40
  `;

  res.json({
    success: true,
    data: {
      period: { from, to },
      previousPeriod: { from: prevFromStr, to: prevToStr },
      totals,
      previous,
      daily,
      campanhas, conjuntos, criativos,
      cruzamento,
    },
  });
});
