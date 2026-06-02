'use client';
import { fmtNum, fmtPct } from '@/lib/formatters';
import type { DashboardSummary } from '@/types/dashboard';

interface FunnelChartProps {
  summary: DashboardSummary;
}

interface FunnelStep {
  label: string;
  value: number;
  color: string;
  bg: string;
}

export function FunnelChart({ summary }: FunnelChartProps) {
  const steps: FunnelStep[] = [
    { label: 'Cliques Ads', value: summary.clicks, color: '#3b82f6', bg: '#eff6ff' },
    { label: 'Leads CRM', value: summary.leads, color: '#8b5cf6', bg: '#f5f3ff' },
    { label: 'Ganhou', value: summary.won, color: '#16a34a', bg: '#f0fdf4' },
  ];

  const max = Math.max(...steps.map((s) => s.value), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-6">Funil de Conversão</h2>

      <div className="space-y-3">
        {steps.map((step, idx) => {
          const pct = (step.value / max) * 100;
          const convRate = idx > 0 ? (step.value / steps[idx - 1].value) * 100 : 100;
          return (
            <div key={step.label}>
              {idx > 0 && (
                <div className="flex justify-center my-1">
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                    {fmtPct(convRate)} de conversão
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-28 text-right text-xs text-gray-500 shrink-0">{step.label}</div>
                <div className="flex-1 flex items-center gap-2">
                  <div
                    className="h-10 rounded-lg flex items-center justify-center transition-all duration-500"
                    style={{ width: `${pct}%`, minWidth: 80, backgroundColor: step.bg, border: `1.5px solid ${step.color}20` }}
                  >
                    <span className="text-sm font-bold" style={{ color: step.color }}>{fmtNum(step.value)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-0.5">Leads abertos</div>
          <div className="text-base font-bold text-amber-600">{fmtNum(summary.open)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-0.5">Agendamentos</div>
          <div className="text-base font-bold text-purple-600">{fmtNum(summary.scheduled)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-0.5">Perdidos</div>
          <div className="text-base font-bold text-red-500">{fmtNum(summary.lost)}</div>
        </div>
      </div>
    </div>
  );
}
