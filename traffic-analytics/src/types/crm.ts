export type CrmStatus = 'Ganhou' | 'Perdeu' | 'Aberto' | 'Agendou';

export interface CrmRow {
  date: string;
  leadName: string;
  status: CrmStatus;
  campaign: string;
  adGroup: string;
  adId: string;
  landingPage: string;
  matchType: string;
  keyword: string;
  segment: string;
  state: string;
  fleetRange: string;
  source?: string;
  medium?: string;
}
