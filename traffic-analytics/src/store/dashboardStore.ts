import { create } from 'zustand';
import type { AdsRow } from '@/types/ads';
import type { CrmRow } from '@/types/crm';
import type { DateRange, GlobalFilters } from '@/types/dashboard';
import { mockAdsData } from '@/data/mockAdsData';
import { mockCrmData } from '@/data/mockCrmData';
import { subDays, startOfDay } from 'date-fns';

const today = new Date();
const DEFAULT_RANGE: DateRange = {
  from: subDays(startOfDay(today), 29),
  to: today,
};

interface DashboardState {
  adsData: AdsRow[];
  crmData: CrmRow[];
  dateRange: DateRange;
  filters: GlobalFilters;
  targetCpl: number | undefined;
  usingMock: boolean;

  setAdsData: (rows: AdsRow[]) => void;
  setCrmData: (rows: CrmRow[]) => void;
  appendAdsData: (rows: AdsRow[]) => void;
  appendCrmData: (rows: CrmRow[]) => void;
  resetToMock: () => void;
  setDateRange: (range: DateRange) => void;
  setFilters: (f: Partial<GlobalFilters>) => void;
  setTargetCpl: (v: number | undefined) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  adsData: mockAdsData,
  crmData: mockCrmData,
  dateRange: DEFAULT_RANGE,
  filters: {},
  targetCpl: undefined,
  usingMock: true,

  setAdsData: (rows) => set({ adsData: rows, usingMock: false }),
  setCrmData: (rows) => set({ crmData: rows, usingMock: false }),
  appendAdsData: (rows) =>
    set((s) => ({ adsData: [...s.adsData.filter((r) => s.usingMock ? false : true), ...rows], usingMock: false })),
  appendCrmData: (rows) =>
    set((s) => ({ crmData: [...s.crmData.filter((r) => s.usingMock ? false : true), ...rows], usingMock: false })),
  resetToMock: () => set({ adsData: mockAdsData, crmData: mockCrmData, usingMock: true }),
  setDateRange: (range) => set({ dateRange: range }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  setTargetCpl: (v) => set({ targetCpl: v }),
}));
