'use client';
import { fmtBRL, fmtNum, fmtPct } from '@/lib/formatters';
import type { DashboardSummary } from '@/types/dashboard';
import { formatDate } from '@/lib/dateUtils';
import type { DateRange } from '@/types/dashboard';

interface PeriodComparisonProps {
  current: DashboardSummary;
  previous: DashboardSummary;
  currentRange: DateRange;
  previousRange: DateRange;
}

interface Metric {
  label: string;
  curr: number;
  prev: number;
  fmt: (v: number) => string;
  lowerIsBetter?: boolean;
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export function PeriodComparison({ current, previous, currentRange, previousRange }: PeriodComparisonProps) {
  const metrics: Metric[] = [
    { label: 'Investimento', curr: current.cost, prev: previous.cost, fmt: fmtBRL },
    { label: 'Leads CRM', curr: current.leads, prev: previous.leads, fmt: fmtNum },
    { label: 'CPL Real', curr: current.cplReal, prev: previous.cplReal, fmt: fmtBRL, lowerIsBetter: true },
    { label: 'Conversões Ads', curr: current.conversions, prev: previous.conversions, fmt: fmtNum },
    { label: 'Taxa de Ganho', curr: current.closeRate, prev: previous.closeRate, fmt: fmtPct },
    { label: 'CTR', curr: current.ctr, prev: previous.ctr, fmt: fmtPct },
    { label: 'CPC Médio', curr: current.cpc, prev: previous.cpc, fmt: fmtBRL, lowerIsBetter: true },
    { label: 'Ganhou', curr: current.won, prev: previous.won, fmt: fmtNum },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Comparativo de Período</h2>
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-gray-400 mb-3">
        <div className="font-medium text-gray-600">
          {formatDate(currentRange.from)} – {formatDate(currentRange.to)}
        </div>
        <div className="text-right font-medium text-gray-400">
          {formatDate(previousRange.from)} – {formatDate(previousRange.to)}
        </div>
      </div>

      <div className="space-y-4">
        {metrics.map((m) => {
          const max = Math.max(m.curr, m.prev, 1);
          const currBetter = m.lowerIsBetter ? m.curr <= m.prev : m.curr >= m.prev;
          const currColor = currBetter ? '#16a34a' : '#dc2626';
          const prevColor = '#94a3b8';
          const delta = m.prev > 0 ? ((m.curr - m.prev) / m.prev) * 100 : 0;

          return (
            <div key={m.label}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500">{m.label}</span>
                <span className={`text-xs font-semibold ${currBetter ? 'text-green-600' : 'text-red-500'}`}>
                  {delta > 0 ? '+' : ''}{delta.toFixed(0)}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-sm font-bold text-gray-900 mb-1">{m.fmt(m.curr)}</div>
                  <Bar value={m.curr} max={max} color={currColor} />
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400 mb-1">{m.fmt(m.prev)}</div>
                  <Bar value={m.prev} max={max} color={prevColor} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
