import type { CrmRow, CrmStatus } from '@/types/crm';

function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function strSeed(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

function days(from: string, to: string): string[] {
  const out: string[] = [];
  const cur = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  while (cur <= end) { out.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
  return out;
}

function pickIdx(rand: () => number, weights: number[]): number {
  const r = rand();
  let acc = 0;
  for (let i = 0; i < weights.length; i++) { acc += weights[i]; if (r < acc) return i; }
  return weights.length - 1;
}

const CAMPAIGNS = [
  'Monaco | Gestao Documental | Pesquisa',
  'Monaco | Frota Leve | Pesquisa',
  'Monaco | Locadora | Pesquisa',
];

const AD_GROUPS: Record<string, string[]> = {
  'Monaco | Gestao Documental | Pesquisa': ['Gestao de Documentos', 'Digitalizacao', 'Guarda de Documentos'],
  'Monaco | Frota Leve | Pesquisa': ['Gestao de Frota Leve', 'Controle de Veiculos'],
  'Monaco | Locadora | Pesquisa': ['Locadora Corporativa', 'Terceirizacao de Frota', 'Aluguel de Frota'],
};

const AD_IDS: Record<string, string[]> = {
  'Gestao de Documentos': ['ad_gde_01', 'ad_gde_02'],
  'Digitalizacao': ['ad_digi_01', 'ad_digi_02'],
  'Guarda de Documentos': ['ad_guard_01'],
  'Gestao de Frota Leve': ['ad_gfl_01', 'ad_gfl_02'],
  'Controle de Veiculos': ['ad_cv_01'],
  'Locadora Corporativa': ['ad_loc_01', 'ad_loc_02'],
  'Terceirizacao de Frota': ['ad_terc_01', 'ad_terc_02'],
  'Aluguel de Frota': ['ad_alug_01'],
};

const KEYWORDS: Record<string, string[]> = {
  'Gestao de Documentos': ['gestao de documentos empresariais', 'gestao documental empresa', 'sistema de gestao documental'],
  'Digitalizacao': ['digitalizacao de documentos', 'digitalizar documentos empresa', 'servico de digitalizacao'],
  'Guarda de Documentos': ['guarda de documentos', 'guarda documental', 'armazenagem de documentos'],
  'Gestao de Frota Leve': ['gestao de frota leve', 'controle de frota', 'sistema frota veiculos'],
  'Controle de Veiculos': ['controle de veiculos empresa', 'rastreamento de frota', 'monitoramento frota'],
  'Locadora Corporativa': ['locadora corporativa', 'locacao de veiculos para empresa', 'aluguel corporativo'],
  'Terceirizacao de Frota': ['terceirizacao de frota', 'frota terceirizada', 'outsourcing frota'],
  'Aluguel de Frota': ['aluguel de frota', 'aluguel de veiculos empresarial', 'frota locada'],
};

const LANDING_PAGES = [
  'lp.monacobr.com.br/gestao-documental',
  'lp.monacobr.com.br/frota-leve',
  'lp.monacobr.com.br/locadora',
];

const CAMP_WEIGHTS = [0.50, 0.30, 0.20];

// Status weights per campaign (Gestao Documental wins more)
const STATUS_WEIGHTS: Record<string, number[]> = {
  'Monaco | Gestao Documental | Pesquisa': [0.28, 0.15, 0.22, 0.35], // Ganhou, Perdeu, Agendou, Aberto
  'Monaco | Frota Leve | Pesquisa':        [0.20, 0.18, 0.20, 0.42],
  'Monaco | Locadora | Pesquisa':           [0.12, 0.22, 0.18, 0.48],
};

const STATUSES: CrmStatus[] = ['Ganhou', 'Perdeu', 'Agendou', 'Aberto'];

const SEGMENTS = ['Locadora', 'Transportadora', 'Industria', 'Servicos', 'Comercio'];
const STATES = ['SP', 'RJ', 'MG', 'PR', 'RS', 'SC', 'GO', 'DF', 'BA', 'PE'];
const FLEET_RANGES = ['1-10', '11-30', '31-50', '51-100', '100+'];
const MATCH_TYPES = ['Exata', 'Frase', 'Ampla'];

const FIRST_NAMES = ['Carlos','Ana','Roberto','Fernanda','Marcos','Juliana','Paulo','Luciana',
  'Andre','Patricia','Thiago','Camila','Diego','Bianca','Felipe','Renata',
  'Leonardo','Tatiana','Eduardo','Vanessa','Bruno','Leticia','Fabio','Daniela'];
const LAST_NAMES = ['Silva','Santos','Almeida','Costa','Oliveira','Lima','Mendes','Ferreira',
  'Rodrigues','Souza','Nascimento','Barbosa','Carvalho','Araujo','Gomes','Pereira'];

const PERIOD = days('2026-05-01', '2026-05-31');

export const mockCrmData: CrmRow[] = (() => {
  const leads: CrmRow[] = [];
  let seq = 0;

  for (const date of PERIOD) {
    const dow = new Date(date + 'T00:00:00').getDay();
    const isWeekend = dow === 0 || dow === 6;
    const dayRand = prng(strSeed(`day|${date}`));
    const count = isWeekend
      ? 1 + Math.floor(dayRand() * 3)   // 1–3 on weekends
      : 4 + Math.floor(dayRand() * 4);  // 4–7 on weekdays

    for (let i = 0; i < count; i++) {
      const rand = prng(strSeed(`lead|${date}|${seq}`));
      const ci = pickIdx(rand, CAMP_WEIGHTS);
      const campaign = CAMPAIGNS[ci];
      const groups = AD_GROUPS[campaign];
      const gi = Math.floor(rand() * groups.length);
      const adGroup = groups[gi];
      const adIds = AD_IDS[adGroup];
      const adId = adIds[Math.floor(rand() * adIds.length)];
      const kwList = KEYWORDS[adGroup] || [''];
      const keyword = kwList[Math.floor(rand() * kwList.length)];
      const status = STATUSES[pickIdx(rand, STATUS_WEIGHTS[campaign] || [0.2, 0.2, 0.2, 0.4])];

      leads.push({
        date,
        leadName: `${FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`,
        status,
        campaign,
        adGroup,
        adId,
        landingPage: LANDING_PAGES[ci] || LANDING_PAGES[0],
        matchType: MATCH_TYPES[Math.floor(rand() * MATCH_TYPES.length)],
        keyword,
        segment: SEGMENTS[Math.floor(rand() * SEGMENTS.length)],
        state: STATES[Math.floor(rand() * STATES.length)],
        fleetRange: FLEET_RANGES[Math.floor(rand() * FLEET_RANGES.length)],
        source: 'google',
        medium: 'cpc',
      });
      seq++;
    }
  }

  return leads;
})();
