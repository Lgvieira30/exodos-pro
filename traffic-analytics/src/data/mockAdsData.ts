import type { AdsRow } from '@/types/ads';

// Mulberry32 — deterministic PRNG, consistent across SSR/CSR
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

// Budget share per campaign
const CAMP_SHARE = [0.50, 0.30, 0.20];

const TARGET_MONTHLY = 11_000; // R$
const PERIOD = days('2026-05-01', '2026-05-31');
const N_DAYS = PERIOD.length;

export const mockAdsData: AdsRow[] = [];

for (const date of PERIOD) {
  const dow = new Date(date + 'T00:00:00').getDay();
  const dayMult = (dow === 0 || dow === 6) ? 0.45 : 1.0;

  CAMPAIGNS.forEach((campaign, ci) => {
    const groups = AD_GROUPS[campaign];
    groups.forEach((adGroup, gi) => {
      const ads = AD_IDS[adGroup];
      ads.forEach((adId, ai) => {
        const rand = prng(strSeed(`${date}|${adId}`));

        // Daily budget for this row: split total monthly evenly across days, weighted by campaign/group/ad
        const dailyBase = (TARGET_MONTHLY / N_DAYS) * CAMP_SHARE[ci] * (1 / groups.length) * (1 / ads.length);
        const cost = parseFloat((dailyBase * dayMult * (0.70 + rand() * 0.60)).toFixed(2));

        const cpc = 4.0 + rand() * 4.5; // R$4–8.5
        const clicks = Math.max(1, Math.round(cost / cpc));
        const impressions = Math.round(clicks / (0.012 + rand() * 0.022)); // CTR 1.2–3.4%
        const conversions = parseFloat((clicks * (0.05 + rand() * 0.10)).toFixed(1)); // 5–15%

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
      });
    });
  });
}
