import type { CrmRow, CrmStatus } from '@/types/crm';

const CAMPAIGNS = [
  'Monaco | Gestao Documental | Pesquisa',
  'Monaco | Frota Leve | Pesquisa',
  'Monaco | Locadora | Pesquisa',
];

const AD_GROUPS: Record<string, string[]> = {
  'Monaco | Gestao Documental | Pesquisa': [
    'Gestao de Documentos Empresariais',
    'Digitalizacao de Documentos',
    'Guarda de Documentos',
  ],
  'Monaco | Frota Leve | Pesquisa': ['Gestao de Frota Leve', 'Controle de Veiculos'],
  'Monaco | Locadora | Pesquisa': [
    'Locadora de Veiculos Corporativos',
    'Terceirizacao de Frota',
    'Aluguel de Frota Empresarial',
  ],
};

const AD_IDS: Record<string, string[]> = {
  'Gestao de Documentos Empresariais': ['ad_gde_01', 'ad_gde_02'],
  'Digitalizacao de Documentos': ['ad_digi_01', 'ad_digi_02'],
  'Guarda de Documentos': ['ad_guard_01'],
  'Gestao de Frota Leve': ['ad_gfl_01', 'ad_gfl_02'],
  'Controle de Veiculos': ['ad_cv_01'],
  'Locadora de Veiculos Corporativos': ['ad_loc_01', 'ad_loc_02'],
  'Terceirizacao de Frota': ['ad_terc_01', 'ad_terc_02'],
  'Aluguel de Frota Empresarial': ['ad_alug_01'],
};

const KEYWORDS: Record<string, string[]> = {
  'Gestao de Documentos Empresariais': [
    'gestao de documentos empresariais', 'gestao documental empresa',
    'sistema de gestao documental',
  ],
  'Digitalizacao de Documentos': [
    'digitalizacao de documentos', 'digitalizar documentos empresa',
    'servico de digitalizacao',
  ],
  'Guarda de Documentos': ['guarda de documentos', 'guarda documental', 'armazenagem de documentos'],
  'Gestao de Frota Leve': ['gestao de frota leve', 'controle de frota veiculos leves'],
  'Controle de Veiculos': ['controle de veiculos empresa', 'rastreamento de frota'],
  'Locadora de Veiculos Corporativos': [
    'locadora corporativa', 'locacao de veiculos para empresa',
  ],
  'Terceirizacao de Frota': ['terceirizacao de frota', 'frota terceirizada empresarial'],
  'Aluguel de Frota Empresarial': ['aluguel de frota', 'aluguel de veiculos empresarial'],
};

const SEGMENTS = ['Locadora', 'Transportadora', 'Industria', 'Servicos', 'Comercio'];
const STATES = ['SP', 'RJ', 'MG', 'PR', 'RS', 'SC', 'GO', 'DF', 'BA', 'PE'];
const FLEET_RANGES = ['1-10', '11-30', '31-50', '51-100', '100+'];
const MATCH_TYPES = ['Exata', 'Frase', 'Ampla'];

const LEAD_NAMES = [
  'Carlos Silva', 'Ana Beatriz Santos', 'Roberto Almeida', 'Fernanda Costa',
  'Marcos Oliveira', 'Juliana Lima', 'Paulo Mendes', 'Luciana Ferreira',
  'Andre Rodrigues', 'Patricia Souza', 'Thiago Nascimento', 'Camila Barbosa',
  'Diego Carvalho', 'Bianca Araujo', 'Felipe Gomes', 'Renata Pereira',
  'Leonardo Martins', 'Tatiana Ribeiro', 'Eduardo Castro', 'Vanessa Moreira',
  'Bruno Cavalcanti', 'Leticia Correia', 'Fabio Monteiro', 'Daniela Freitas',
  'Gustavo Teixeira', 'Simone Cardoso', 'Henrique Pinto', 'Mariana Cunha',
  'Rafael Nunes', 'Amanda Vieira', 'Rodrigo Pires', 'Cristina Azevedo',
  'Alexandre Santos', 'Monica Figueiredo', 'Igor Siqueira', 'Priscila Duarte',
  'Vitor Ramos', 'Natalia Borges', 'Wellington Lopes', 'Sabrina Melo',
  'Caio Andrade', 'Larissa Rezende', 'Adriano Campos', 'Flavia Pontes',
  'Murilo Brito', 'Isabela Xavier', 'Leandro Machado', 'Soraya Dias',
];

const LANDING_PAGES = [
  'lp.monacobr.com.br/gestao-documental',
  'lp.monacobr.com.br/frota-leve',
  'lp.monacobr.com.br/locadora',
];

function rnd(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateDays(from: string, to: string): string[] {
  const days: string[] = [];
  const cur = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

const days = generateDays('2026-05-01', '2026-05-31');

function buildLeads(): CrmRow[] {
  const leads: CrmRow[] = [];
  let nameIdx = 0;

  const statusWeights: [CrmStatus, number][] = [
    ['Ganhou', 0.20],
    ['Perdeu', 0.18],
    ['Agendou', 0.22],
    ['Aberto', 0.40],
  ];

  function pickStatus(): CrmStatus {
    const r = Math.random();
    let acc = 0;
    for (const [s, w] of statusWeights) {
      acc += w;
      if (r < acc) return s;
    }
    return 'Aberto';
  }

  for (const date of days) {
    const dow = new Date(date + 'T00:00:00').getDay();
    const isWeekend = dow === 0 || dow === 6;
    const leadsPerDay = isWeekend ? Math.floor(rnd(0, 3)) : Math.floor(rnd(3, 8));

    for (let i = 0; i < leadsPerDay; i++) {
      const campaign = pick(CAMPAIGNS);
      const adGroup = pick(AD_GROUPS[campaign]);
      const adId = pick(AD_IDS[adGroup]);
      const keyword = pick(KEYWORDS[adGroup] || ['']);
      const lpIdx = CAMPAIGNS.indexOf(campaign);

      leads.push({
        date,
        leadName: LEAD_NAMES[nameIdx % LEAD_NAMES.length] + ' ' + (nameIdx + 1),
        status: pickStatus(),
        campaign,
        adGroup,
        adId,
        landingPage: LANDING_PAGES[lpIdx] || LANDING_PAGES[0],
        matchType: pick(MATCH_TYPES),
        keyword,
        segment: pick(SEGMENTS),
        state: pick(STATES),
        fleetRange: pick(FLEET_RANGES),
        source: 'google',
        medium: 'cpc',
      });
      nameIdx++;
    }
  }

  return leads;
}

export const mockCrmData: CrmRow[] = buildLeads();
