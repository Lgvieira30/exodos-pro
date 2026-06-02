'use client';
import { useState, useMemo } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { Header } from '@/components/layout/Header';
import { KpiCards } from '@/components/cards/KpiCards';
import { PeriodComparison } from '@/components/cards/PeriodComparison';
import { DailyChart } from '@/components/charts/DailyChart';
import { FunnelChart } from '@/components/charts/FunnelChart';
import { DataTable } from '@/components/tables/DataTable';
import { DateRangePicker } from '@/components/filters/DateRangePicker';
import { CSVUpload } from '@/components/upload/CSVUpload';
import { DataQualityAlerts } from '@/components/alerts/DataQualityAlerts';
import { computeSummary, aggregateBy, aggregateByDay, checkDataQuality } from '@/lib/calculations';
import { getPreviousPeriod, isInRange } from '@/lib/dateUtils';
import { fmtBRL } from '@/lib/formatters';

const DIMENSIONS = [
  { label: 'Campanha', adsDim: 'campaign', crmDim: 'campaign' },
  { label: 'Grupo de Anúncio', adsDim: 'adGroup', crmDim: 'adGroup' },
  { label: 'Anúncio', adsDim: 'adId', crmDim: 'adId' },
  { label: 'Palavra-chave', adsDim: 'campaign', crmDim: 'keyword' },
  { label: 'Segmento', adsDim: 'campaign', crmDim: 'segment' },
  { label: 'UF', adsDim: 'campaign', crmDim: 'state' },
  { label: 'Faixa de Frota', adsDim: 'campaign', crmDim: 'fleetRange' },
] as const;

export default function DashboardPage() {
  const { adsData, crmData, dateRange, setDateRange, targetCpl } = useDashboardStore();
  const [showUpload, setShowUpload] = useState(false);
  const [showCompare, setShowCompare] = useState(true);
  const [activeDim, setActiveDim] = useState(0);

  const prevRange = useMemo(() => getPreviousPeriod(dateRange), [dateRange]);

  const filteredAds = useMemo(() => adsData.filter((r) => isInRange(r.date, dateRange)), [adsData, dateRange]);
  const filteredCrm = useMemo(() => crmData.filter((r) => isInRange(r.date, dateRange)), [crmData, dateRange]);
  const prevAds = useMemo(() => adsData.filter((r) => isInRange(r.date, prevRange)), [adsData, prevRange]);
  const prevCrm = useMemo(() => crmData.filter((r) => isInRange(r.date, prevRange)), [crmData, prevRange]);

  const summary = useMemo(() => computeSummary(filteredAds, filteredCrm), [filteredAds, filteredCrm]);
  const prevSummary = useMemo(() => computeSummary(prevAds, prevCrm), [prevAds, prevCrm]);
  const daily = useMemo(() => aggregateByDay(filteredAds, filteredCrm), [filteredAds, filteredCrm]);
  const quality = useMemo(() => checkDataQuality(filteredAds, filteredCrm), [filteredAds, filteredCrm]);

  const dim = DIMENSIONS[activeDim];
  const tableData = useMemo(
    () => aggregateBy(filteredAds, filteredCrm, dim.adsDim as any, dim.crmDim as any, targetCpl),
    [filteredAds, filteredCrm, dim, targetCpl],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onUploadClick={() => setShowUpload(true)} />

      {showUpload && <CSVUpload onClose={() => setShowUpload(false)} />}

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <button
              onClick={() => setShowCompare(!showCompare)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showCompare ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              Comparar período
            </button>
          </div>
          <div className="text-xs text-gray-400">
            {filteredAds.length} linhas Ads · {filteredCrm.length} leads CRM
          </div>
        </div>

        {/* Quality alerts */}
        {quality.length > 0 && <DataQualityAlerts issues={quality} />}

        {/* KPI Cards */}
        <KpiCards current={summary} previous={showCompare ? prevSummary : undefined} />

        {/* Period Comparison + Funnel */}
        {showCompare && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PeriodComparison
              current={summary}
              previous={prevSummary}
              currentRange={dateRange}
              previousRange={prevRange}
            />
            <FunnelChart summary={summary} />
          </div>
        )}

        {!showCompare && <FunnelChart summary={summary} />}

        {/* Daily Chart */}
        <DailyChart data={daily} />

        {/* Dimension tabs + table */}
        <div>
          <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
            {DIMENSIONS.map((d, i) => (
              <button
                key={d.label}
                onClick={() => setActiveDim(i)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  activeDim === i
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <DataTable data={tableData} title={`Performance por ${dim.label}`} />
        </div>

        {/* Summary footer */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Resumo executivo</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { label: 'Total investido', value: fmtBRL(summary.cost), color: 'text-blue-700' },
              { label: 'Leads CRM', value: String(summary.leads), color: 'text-gray-900' },
              { label: 'Negócios fechados', value: String(summary.won), color: 'text-green-700' },
              { label: 'CPL médio', value: fmtBRL(summary.cplReal), color: 'text-gray-900' },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-3">
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
