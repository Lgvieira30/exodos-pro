import type { CrmRow, CrmStatus } from '@/types/crm';

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
  return s;
}

const STATUS_MAP: Record<string, CrmStatus> = {
  won: 'Ganhou', ganhou: 'Ganhou', fechado: 'Ganhou', venda: 'Ganhou', '1': 'Ganhou',
  lost: 'Perdeu', perdeu: 'Perdeu', perdido: 'Perdeu', '2': 'Perdeu',
  open: 'Aberto', aberto: 'Aberto', 'em aberto': 'Aberto', '3': 'Aberto',
  agendou: 'Agendou', agendamento: 'Agendou', reunião: 'Agendou', reuniao: 'Agendou', oportunidade: 'Agendou',
};

function normalizeStatus(v: string): CrmStatus {
  return STATUS_MAP[v.toLowerCase().trim()] || 'Aberto';
}

const FIELD_MAP: Record<string, keyof CrmRow> = {
  date: 'date', data: 'date',
  lead_name: 'leadName', leadName: 'leadName', lead: 'leadName', nome: 'leadName',
  status: 'status',
  campaign: 'campaign', campanha: 'campaign',
  ad_group: 'adGroup', adGroup: 'adGroup', grupo: 'adGroup',
  ad_id: 'adId', adId: 'adId', anuncio: 'adId', anúncio: 'adId',
  landing_page: 'landingPage', landingPage: 'landingPage', lp: 'landingPage',
  match_type: 'matchType', matchType: 'matchType', match: 'matchType',
  keyword: 'keyword', 'palavra-chave': 'keyword', palavra_chave: 'keyword',
  segment: 'segment', segmento: 'segment',
  state: 'state', uf: 'state', estado: 'state',
  fleet_range: 'fleetRange', fleetRange: 'fleetRange', 'faixa de frota': 'fleetRange', faixa_frota: 'fleetRange',
  source: 'source', origem: 'source',
  medium: 'medium', mídia: 'medium', midia: 'medium',
};

export function normalizeCrmRow(raw: Record<string, string>): CrmRow {
  const out: Partial<CrmRow> = {
    date: '', leadName: '', status: 'Aberto', campaign: '', adGroup: '',
    adId: '', landingPage: '', matchType: '', keyword: '',
    segment: '', state: '', fleetRange: '',
  };

  for (const [key, val] of Object.entries(raw)) {
    const normalized = key.toLowerCase().trim();
    const field = FIELD_MAP[normalized];
    if (!field) continue;
    if (field === 'date') {
      out.date = parseDate(val);
    } else if (field === 'status') {
      out.status = normalizeStatus(val);
    } else {
      (out as Record<string, string>)[field] = (val || '').trim();
    }
  }

  return out as CrmRow;
}

export function normalizeCrmData(rawRows: Record<string, string>[]): CrmRow[] {
  return rawRows.map(normalizeCrmRow).filter((r) => r.date && r.leadName);
}
