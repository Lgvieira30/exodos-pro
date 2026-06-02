import type { AdsRow } from '@/types/ads';
import type { CrmRow } from '@/types/crm';
import type { AggregatedRow, DashboardSummary, DailyRow, DataQualityIssue } from '@/types/dashboard';
import { applyDecision } from './decisionEngine';

function calcMetrics(cost: number, impressions: number, clicks: number, conversions: number, leads: number, open: number, scheduled: number, won: number, lost: number) {
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? cost / clicks : 0;
  const cplAds = conversions > 0 ? cost / conversions : 0;
  const cplReal = leads > 0 ? cost / leads : 0;
  const scheduleRate = leads > 0 ? (scheduled / leads) * 100 : 0;
  const closeRate = leads > 0 ? (won / leads) * 100 : 0;
  return { ctr, cpc, cplAds, cplReal, scheduleRate, closeRate };
}

export function computeSummary(ads: AdsRow[], crm: CrmRow[]): DashboardSummary {
  const cost = ads.reduce((s, r) => s + r.cost, 0);
  const impressions = ads.reduce((s, r) => s + r.impressions, 0);
  const clicks = ads.reduce((s, r) => s + r.clicks, 0);
  const conversions = ads.reduce((s, r) => s + r.conversions, 0);
  const leads = crm.length;
  const open = crm.filter((r) => r.status === 'Aberto').length;
  const scheduled = crm.filter((r) => r.status === 'Agendou').length;
  const won = crm.filter((r) => r.status === 'Ganhou').length;
  const lost = crm.filter((r) => r.status === 'Perdeu').length;
  const m = calcMetrics(cost, impressions, clicks, conversions, leads, open, scheduled, won, lost);
  return { cost, impressions, clicks, conversions, leads, open, scheduled, won, lost, ...m };
}

type DimKey = keyof Pick<AdsRow, 'campaign' | 'adGroup' | 'adId' | 'platform' | 'account'>;
type CrmDimKey = keyof Pick<CrmRow, 'campaign' | 'adGroup' | 'adId' | 'segment' | 'state' | 'fleetRange' | 'keyword'>;

function groupAds(ads: AdsRow[], dim: DimKey): Map<string, AdsRow[]> {
  const map = new Map<string, AdsRow[]>();
  for (const row of ads) {
    const key = row[dim] || '(sem dado)';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return map;
}

function groupCrm(crm: CrmRow[], dim: CrmDimKey): Map<string, CrmRow[]> {
  const map = new Map<string, CrmRow[]>();
  for (const row of crm) {
    const key = row[dim] || '(sem dado)';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return map;
}

export function aggregateBy(
  ads: AdsRow[],
  crm: CrmRow[],
  adsDim: DimKey,
  crmDim: CrmDimKey,
  targetCpl?: number,
): AggregatedRow[] {
  const adsGroups = groupAds(ads, adsDim);
  const crmGroups = groupCrm(crm, crmDim);

  const allKeys = new Set([...adsGroups.keys(), ...crmGroups.keys()]);
  const rows: AggregatedRow[] = [];

  for (const key of allKeys) {
    const adsRows = adsGroups.get(key) || [];
    const crmRows = crmGroups.get(key) || [];

    const cost = adsRows.reduce((s, r) => s + r.cost, 0);
    const impressions = adsRows.reduce((s, r) => s + r.impressions, 0);
    const clicks = adsRows.reduce((s, r) => s + r.clicks, 0);
    const conversions = adsRows.reduce((s, r) => s + r.conversions, 0);
    const leads = crmRows.length;
    const open = crmRows.filter((r) => r.status === 'Aberto').length;
    const scheduled = crmRows.filter((r) => r.status === 'Agendou').length;
    const won = crmRows.filter((r) => r.status === 'Ganhou').length;
    const lost = crmRows.filter((r) => r.status === 'Perdeu').length;

    const m = calcMetrics(cost, impressions, clicks, conversions, leads, open, scheduled, won, lost);

    const base = {
      name: key,
      cost, impressions, clicks, conversions,
      leads, open, scheduled, won, lost,
      ...m,
    };

    rows.push(applyDecision(base, targetCpl));
  }

  return rows.sort((a, b) => b.cost - a.cost || b.leads - a.leads);
}

export function aggregateByDay(ads: AdsRow[], crm: CrmRow[]): DailyRow[] {
  const dateSet = new Set([
    ...ads.map((r) => r.date),
    ...crm.map((r) => r.date),
  ]);

  const days: DailyRow[] = [];
  for (const date of [...dateSet].sort()) {
    const adsRows = ads.filter((r) => r.date === date);
    const crmRows = crm.filter((r) => r.date === date);

    const cost = adsRows.reduce((s, r) => s + r.cost, 0);
    const impressions = adsRows.reduce((s, r) => s + r.impressions, 0);
    const clicks = adsRows.reduce((s, r) => s + r.clicks, 0);
    const conversions = adsRows.reduce((s, r) => s + r.conversions, 0);
    const leads = crmRows.length;
    const open = crmRows.filter((r) => r.status === 'Aberto').length;
    const won = crmRows.filter((r) => r.status === 'Ganhou').length;
    const lost = crmRows.filter((r) => r.status === 'Perdeu').length;

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? cost / clicks : 0;
    const cplReal = leads > 0 ? cost / leads : 0;
    const closeRate = leads > 0 ? (won / leads) * 100 : 0;

    days.push({ date, cost, impressions, clicks, conversions, leads, open, won, lost, ctr, cpc, cplReal, closeRate });
  }

  return days;
}

export function checkDataQuality(ads: AdsRow[], crm: CrmRow[]): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];

  const noCampaign = crm.filter((r) => !r.campaign).length;
  if (noCampaign > 0) issues.push({ type: 'Leads sem campanha', count: noCampaign, description: 'Leads do CRM sem campanha identificada — UTMs ausentes', severity: 'warning' });

  const noKeyword = crm.filter((r) => !r.keyword).length;
  if (noKeyword > 0) issues.push({ type: 'Leads sem palavra-chave', count: noKeyword, description: 'Leads sem keyword rastreada', severity: 'warning' });

  const noUF = crm.filter((r) => !r.state).length;
  if (noUF > 0) issues.push({ type: 'Leads sem UF', count: noUF, description: 'Estado não identificado', severity: 'warning' });

  const noSegment = crm.filter((r) => !r.segment).length;
  if (noSegment > 0) issues.push({ type: 'Leads sem segmento', count: noSegment, description: 'Segmento não classificado', severity: 'warning' });

  const totalConversions = ads.reduce((s, r) => s + r.conversions, 0);
  const diff = Math.abs(totalConversions - crm.length);
  if (diff > 0) issues.push({ type: 'Diferença Ads vs CRM', count: diff, description: `${Math.round(totalConversions)} conversões nos Ads vs ${crm.length} leads no CRM`, severity: diff > 10 ? 'error' : 'warning' });

  const adsCampaigns = new Set(ads.map((r) => r.campaign));
  const crmCampaigns = new Set(crm.map((r) => r.campaign));
  const adsOnlySpend = [...adsCampaigns].filter((c) => !crmCampaigns.has(c));
  if (adsOnlySpend.length > 0) issues.push({ type: 'Campanhas sem lead CRM', count: adsOnlySpend.length, description: `Campanhas com gasto sem lead no CRM: ${adsOnlySpend.slice(0, 3).join(', ')}`, severity: 'error' });

  return issues;
}
