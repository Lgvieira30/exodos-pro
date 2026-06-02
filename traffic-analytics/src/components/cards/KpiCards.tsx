'use client';
import { DollarSign, Users, Target, TrendingUp, Clock, Zap } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { fmtBRL, fmtNum, fmtPct } from '@/lib/formatters';
import type { DashboardSummary } from '@/types/dashboard';

interface KpiCardsProps {
  current: DashboardSummary;
  previous?: DashboardSummary;
}

function pct(curr: number, prev: number): number | undefined {
  if (!prev) return undefined;
  return ((curr - prev) / prev) * 100;
}

export function KpiCards({ current, previous }: KpiCardsProps) {
  const p = previous;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <KpiCard
        label="Investimento"
        value={fmtBRL(current.cost)}
        prev={p ? fmtBRL(p.cost) : undefined}
        delta={p ? pct(current.cost, p.cost) : undefined}
        lowerIsBetter={false}
        icon={<DollarSign className="w-4 h-4" />}
        highlight="blue"
      />
      <KpiCard
        label="Leads CRM"
        value={fmtNum(current.leads)}
        prev={p ? fmtNum(p.leads) : undefined}
        delta={p ? pct(current.leads, p.leads) : undefined}
        icon={<Users className="w-4 h-4" />}
        highlight="blue"
      />
      <KpiCard
        label="CPL Real"
        value={fmtBRL(current.cplReal)}
        prev={p ? fmtBRL(p.cplReal) : undefined}
        delta={p ? pct(current.cplReal, p.cplReal) : undefined}
        lowerIsBetter
        icon={<Target className="w-4 h-4" />}
        highlight={current.cplReal > 0 && p && current.cplReal < p.cplReal ? 'green' : 'none'}
      />
      <KpiCard
        label="Taxa de Ganho"
        value={fmtPct(current.closeRate)}
        prev={p ? fmtPct(p.closeRate) : undefined}
        delta={p ? pct(current.closeRate, p.closeRate) : undefined}
        icon={<TrendingUp className="w-4 h-4" />}
        highlight={current.closeRate >= 25 ? 'green' : current.closeRate < 10 ? 'red' : 'yellow'}
      />
      <KpiCard
        label="Abertos"
        value={fmtNum(current.open)}
        prev={p ? fmtNum(p.open) : undefined}
        delta={p ? pct(current.open, p.open) : undefined}
        icon={<Clock className="w-4 h-4" />}
        highlight="yellow"
      />
      <KpiCard
        label="Conv. Ads"
        value={fmtNum(current.conversions)}
        prev={p ? fmtNum(p.conversions) : undefined}
        delta={p ? pct(current.conversions, p.conversions) : undefined}
        icon={<Zap className="w-4 h-4" />}
        highlight="none"
      />
    </div>
  );
}
