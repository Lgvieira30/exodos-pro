'use client';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { formatDateShort } from '@/lib/dateUtils';
import { fmtBRL, fmtNum } from '@/lib/formatters';
import type { DailyRow } from '@/types/dashboard';

interface DailyChartProps {
  data: DailyRow[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-medium">{typeof p.value === 'number' && p.name.includes('R$') ? fmtBRL(p.value) : fmtNum(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function DailyChart({ data }: DailyChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    dateLabel: formatDateShort(d.date),
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Leads por Dia</h2>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={formatted} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="left" dataKey="won" name="Ganhou" stackId="leads" fill="#16a34a" radius={[0, 0, 0, 0]} />
          <Bar yAxisId="left" dataKey="open" name="Aberto" stackId="leads" fill="#f59e0b" radius={[0, 0, 0, 0]} />
          <Bar yAxisId="left" dataKey="lost" name="Perdeu" stackId="leads" fill="#ef4444" radius={[2, 2, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="cost" name="Investimento (R$)" stroke="#3b82f6" dot={false} strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
