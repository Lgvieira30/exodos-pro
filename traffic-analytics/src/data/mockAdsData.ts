import type { AdsRow } from '@/types/ads';

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
  'Monaco | Frota Leve | Pesquisa': [
    'Gestao de Frota Leve',
    'Controle de Veiculos',
  ],
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

function rnd(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function rndInt(min: number, max: number) {
  return Math.floor(rnd(min, max + 1));
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

export const mockAdsData: AdsRow[] = [];

for (const date of days) {
  const dow = new Date(date + 'T00:00:00').getDay();
  const isWeekend = dow === 0 || dow === 6;

  for (const campaign of CAMPAIGNS) {
    const groups = AD_GROUPS[campaign];
    for (const adGroup of groups) {
      const ads = AD_IDS[adGroup];
      for (const adId of ads) {
        const mult = isWeekend ? 0.55 : 1.0;
        const impressions = Math.round(rndInt(800, 2400) * mult);
        const ctr = rnd(0.025, 0.065);
        const clicks = Math.max(1, Math.round(impressions * ctr));
        const cpc = rnd(2.5, 8.5);
        const cost = parseFloat((clicks * cpc).toFixed(2));
        const convRate = rnd(0.04, 0.14);
        const conversions = parseFloat((clicks * convRate).toFixed(1));

        mockAdsData.push({
          date,
          account: 'Monaco Gestao Documental',
          campaign,
          adGroup,
          adId,
          adName: adId,
          cost,
          impressions,
          clicks,
          conversions,
          platform: 'Google Ads',
        });
      }
    }
  }
}
