import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { metricsApi } from '../lib/api';

interface WeeklyData {
  day: string;
  spend: number;
  leads: number;
  cpa: number;
}

interface Summary {
  spend: number;
  leads: number;
  cpa: number;
  roas: number;
  campaigns: number;
}

export default function Analytics() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [weekly, setWeekly] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);

  // Dados mock para exibir enquanto backend não está conectado
  const mockWeekly: WeeklyData[] = [
    { day: 'Seg', spend: 800, leads: 45, cpa: 50 },
    { day: 'Ter', spend: 950, leads: 52, cpa: 48 },
    { day: 'Qua', spend: 1200, leads: 60, cpa: 52 },
    { day: 'Qui', spend: 1100, leads: 58, cpa: 51 },
    { day: 'Sex', spend: 1500, leads: 75, cpa: 48 },
    { day: 'Sáb', spend: 1800, leads: 85, cpa: 50 },
    { day: 'Dom', spend: 900, leads: 48, cpa: 49 },
  ];

  useEffect(() => {
    metricsApi.dashboard()
      .then((res) => {
        setSummary(res.data.summary);
        setWeekly(res.data.weekly.length > 0 ? res.data.weekly : mockWeekly);
      })
      .catch(() => {
        setSummary({ spend: 8250, leads: 423, cpa: 47, roas: 3.4, campaigns: 4 });
        setWeekly(mockWeekly);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><p className="text-slate-400">Carregando...</p></div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Analytics</h2>
        <p className="text-slate-400 mt-1">Performance dos últimos 7 dias</p>
      </div>

      {/* KPIs */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Investimento', value: `R$ ${summary.spend.toLocaleString('pt-BR')}`, color: 'text-blue-400' },
            { label: 'Leads', value: summary.leads.toLocaleString('pt-BR'), color: 'text-green-400' },
            { label: 'CPA Médio', value: `R$ ${summary.cpa.toFixed(2)}`, color: 'text-orange-400' },
            { label: 'ROAS', value: `${summary.roas.toFixed(1)}x`, color: 'text-purple-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800 rounded-lg p-5">
              <p className="text-sm text-slate-400">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Gráfico de Linha — Spend e Leads */}
      <div className="bg-slate-800 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Spend vs Leads</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={weekly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="day" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
            <Legend />
            <Line type="monotone" dataKey="spend" name="Spend (R$)" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="leads" name="Leads" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de Barras — CPA */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">CPA por Dia</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={weekly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="day" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
            <Bar dataKey="cpa" name="CPA (R$)" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
