export type Decision = 'Escalar' | 'Observar' | 'Revisar' | 'Cortar' | 'Pouco dado';
export type Confidence = 'Alta' | 'Média' | 'Baixa';

export interface AggregatedRow {
  name: string;
  secondaryName?: string;
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
  leads: number;
  open: number;
  scheduled: number;
  won: number;
  lost: number;
  ctr: number;
  cpc: number;
  cplAds: number;
  cplReal: number;
  scheduleRate: number;
  closeRate: number;
  confidence: Confidence;
  decision: Decision;
  decisionColor: string;
  decisionReason: string;
}

export interface DashboardSummary {
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
  leads: number;
  open: number;
  scheduled: number;
  won: number;
  lost: number;
  ctr: number;
  cpc: number;
  cplAds: number;
  cplReal: number;
  scheduleRate: number;
  closeRate: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DailyRow {
  date: string;
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
  leads: number;
  open: number;
  won: number;
  lost: number;
  ctr: number;
  cpc: number;
  cplReal: number;
  closeRate: number;
}

export interface GlobalFilters {
  platform?: string;
  account?: string;
  campaign?: string;
  adGroup?: string;
  status?: string;
  segment?: string;
  state?: string;
  keyword?: string;
  landingPage?: string;
}

export interface DataQualityIssue {
  type: string;
  count: number;
  description: string;
  severity: 'warning' | 'error';
}
