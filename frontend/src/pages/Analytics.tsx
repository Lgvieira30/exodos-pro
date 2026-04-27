import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Zap } from 'lucide-react';
import { metricsApi } from '../lib/api';
import { Tooltip as MetricTooltip } from '../components/Tooltip';

interface Summary {
  spend: number;
  leads: number;
  cpa: number;
  roas: number;
  campaigns: number;
}

const mockWeekly = [
  { day: 'Seg', spend: 800, leads: 45, cpa: 50 },
  { day: 'Ter', spend: 950, leads: 52, cpa: 48 },
  { day: 'Qua', spend: 1200, leads: 60, cpa: 52 },
  { day: 'Qui', spend: 1100, leads: 58, cpa: 51 },
  { day: 'Sex', spend: 1500, leads: 75, cpa: 48 },
  { day: 'Sáb', spend: 1800, leads: 85, cpa: 50 },
  { day: 'Dom', spend: 900, leads: 48, cpa: 49 },
];

function KpiCard({ label, value, tooltip, icon: Icon, gradient, glow, sub }: any) {
  return (
    <div className="rounded-2xl p-5 transition-all duration-300" style={{
      background: 'rgba(15,23,42,0.8)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
          background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
          boxShadow: `0 0 15px ${glow}`,
        }}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <MetricTooltip text={tooltip} />
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Analytics() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [weekly, setWeekly] = useState(mockWeekly);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    metricsApi.dashboard()
      .then((res) => {
        setSummary(res.data.summary);
        if (res.data.weekly?.length > 0) {
          setWeekly(res.data.weekly);
        } else {
          setUsingMock(true);
        }
      })
      .catch(() => {
        setSummary({ spend: 8250, leads: 423, cpa: 47, roas: 3.4, campaigns: 4 });
        setUsingMock(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: '#080c14' }}>
      <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent spinner mx-auto" />
    </div>
  );

  const kpis = [
    { label: 'Investimento Total', value: `R$ ${(summary?.spend || 0).toLocaleString('pt-BR')}`, tooltip: 'Total gasto em anúncios no período selecionado.', icon: DollarSign, gradient: ['#1d4ed8', '#3b82f6'], glow: 'rgba(59,130,246,0.2)', sub: 'Soma de todos os anúncios' },
    { label: 'Leads Gerados', value: (summary?.leads || 0).toLocaleString(), tooltip: 'Pessoas que demonstraram interesse e deixaram seus dados de contato.', icon: Users, gradient: ['#047857', '#10b981'], glow: 'rgba(16,185,129,0.2)', sub: 'Contatos qualificados' },
    { label: 'CPA Médio', value: summary?.cpa ? `R$ ${summary.cpa.toFixed(2)}` : '—', tooltip: 'Custo Por Aquisição — quanto custa em média conquistar um lead. Abaixo de R$50 é excelente para a maioria dos nichos.', icon: Target, gradient: ['#c2410c', '#f97316'], glow: 'rgba(249,115,22,0.2)', sub: 'Menor = melhor' },
    { label: 'ROAS', value: summary?.roas ? `${summary.roas.toFixed(1)}x` : '—', tooltip: 'Para cada R$1 investido, quanto voltou em receita. Acima de 3x é considerado ótimo.', icon: Zap, gradient: ['#7c3aed', '#a78bfa'], glow: 'rgba(139,92,246,0.2)', sub: 'Acima de 3x = ótimo' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl p-3" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="text-xs text-slate-400 mb-2">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-xs font-medium" style={{ color: p.color }}>
            {p.name}: {p.name === 'Spend' ? `R$ ${p.value}` : p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen p-8" style={{ background: '#080c14' }}>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">
          Acompanhe a performance das suas campanhas com gráficos detalhados.
        </p>
        {usingMock && (
          <div className="mt-3 inline-flex items-center gap-2 text-xs text-amber-400 px-3 py-1.5 rounded-lg" style={{
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
          }}>
            Exibindo dados de demonstração — adicione métricas reais às campanhas para ver seus números aqui.
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Spend x Leads */}
        <div className="rounded-2xl p-6" style={{
          background: 'rgba(15,23,42,0.8)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div className="mb-1">
            <h3 className="text-base font-semibold text-white">Investimento vs Leads</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Correlação entre quanto você investe e quantos leads gera por dia.
            </p>
          </div>
          <div className="mt-5">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={weekly}>
                <defs>
                  <linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" stroke="transparent" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="transparent" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#64748b', paddingTop: '12px' }} />
                <Area type="monotone" dataKey="spend" name="Spend" stroke="#3b82f6" strokeWidth={2} fill="url(#gBlue)" dot={false} />
                <Area type="monotone" dataKey="leads" name="Leads" stroke="#10b981" strokeWidth={2} fill="url(#gGreen)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CPA por dia */}
        <div className="rounded-2xl p-6" style={{
          background: 'rgba(15,23,42,0.8)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div className="mb-1">
            <h3 className="text-base font-semibold text-white">CPA por Dia</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Custo Por Aquisição diário — identifique os melhores e piores dias da semana.
            </p>
          </div>
          <div className="mt-5">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weekly} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" stroke="transparent" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="transparent" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cpa" name="CPA (R$)" fill="url(#barGrad)" radius={[6, 6, 0, 0]}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#c2410c" />
                    </linearGradient>
                  </defs>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Insights automáticos */}
      <div className="rounded-2xl p-6" style={{
        background: 'rgba(15,23,42,0.8)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <h3 className="text-base font-semibold text-white mb-1">Insights da Semana</h3>
        <p className="text-xs text-slate-500 mb-5">Análise automática baseada nos seus dados de performance.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: TrendingDown,
              color: '#10b981',
              title: 'Melhor dia da semana',
              value: weekly.reduce((best, d) => d.leads > best.leads ? d : best, weekly[0])?.day || '—',
              desc: 'Dia com mais leads gerados',
            },
            {
              icon: TrendingUp,
              color: '#f97316',
              title: 'Dia mais caro',
              value: weekly.reduce((worst, d) => d.cpa > worst.cpa ? d : worst, weekly[0])?.day || '—',
              desc: 'Maior CPA registrado na semana',
            },
            {
              icon: Zap,
              color: '#3b82f6',
              title: 'Total investido',
              value: `R$ ${weekly.reduce((sum, d) => sum + (d.spend || 0), 0).toLocaleString('pt-BR')}`,
              desc: 'Nos últimos 7 dias',
            },
          ].map(({ icon: Icon, color, title, value, desc }) => (
            <div key={title} className="flex items-start gap-3 p-4 rounded-xl" style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">{title}</p>
                <p className="text-lg font-bold text-white">{value}</p>
                <p className="text-xs text-slate-600">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
