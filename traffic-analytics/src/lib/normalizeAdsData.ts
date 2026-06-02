import type { AdsRow } from '@/types/ads';

function parseBR(v: string | number | undefined): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const s = String(v).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(s) || 0;
}

function parseDate(v: string | undefined): string {
  if (!v) return '';
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d+$/.test(s)) {
    const serial = parseInt(s);
    const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  return s;
}

const FIELD_MAP: Record<string, keyof AdsRow> = {
  date: 'date', data: 'date',
  account: 'account', conta: 'account',
  campaign: 'campaign', campanha: 'campaign',
  ad_group: 'adGroup', adGroup: 'adGroup', grupo: 'adGroup',
  'grupo de anúncios': 'adGroup', 'grupo de anuncios': 'adGroup',
  ad_id: 'adId', adId: 'adId', anuncio: 'adId', anúncio: 'adId',
  ad_name: 'adName', adName: 'adName',
  cost: 'cost', investimento: 'cost', custo: 'cost',
  impressions: 'impressions', impressoes: 'impressions', impressões: 'impressions',
  clicks: 'clicks', cliques: 'clicks',
  conversions: 'conversions', conversoes: 'conversions', conversões: 'conversions',
  platform: 'platform', plataforma: 'platform',
};

export function normalizeAdsRow(raw: Record<string, string>): AdsRow {
  const out: Partial<AdsRow> = {
    date: '', account: '', campaign: '', adGroup: '', adId: '', adName: '',
    cost: 0, impressions: 0, clicks: 0, conversions: 0, platform: 'Google Ads',
  };

  for (const [key, val] of Object.entries(raw)) {
    const normalized = key.toLowerCase().trim();
    const field = FIELD_MAP[normalized];
    if (!field) continue;
    if (['cost', 'impressions', 'clicks', 'conversions'].includes(field)) {
      (out as Record<string, number | string>)[field] = parseBR(val);
    } else if (field === 'date') {
      out.date = parseDate(val);
    } else {
      (out as Record<string, string>)[field] = val || '';
    }
  }

  return out as AdsRow;
}

export function normalizeAdsData(rawRows: Record<string, string>[]): AdsRow[] {
  return rawRows.map(normalizeAdsRow).filter((r) => r.date && (r.cost > 0 || r.clicks > 0 || r.impressions > 0));
}
