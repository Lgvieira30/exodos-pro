import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Zap, MousePointerClick, Eye, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { metricsApi, campaignsApi } from '../lib/api';
import { Tooltip as MetricTooltip } from '../components/Tooltip';

const CYAN = '#3DB8E8';

interface Summary {
  spend: number; leads: number; cpa: number; roas: number;
  ctr: number; cpc: number; campaigns: number;
}

interface WeeklyPoint {
  day: string; spend: number; leads: number; cpa: number;
  ctr: number; cpc: number; clicks: number; impressions: number;
}

interface CampaignRow {
  id: string; name: string; platform: string; status: string;
  total_spend: number; total_leads: number; avg_cpa: number;
  avg_roas: number; avg_ctr: number; avg_cpc: number;
}

const mockWeekly: WeeklyPoint[] = [
  { day: 'Seg', spend: 800,  leads: 45, cpa: 50, ctr: 1.2, cpc: 3.5, clicks: 228,  impressions: 19000 },
  { day: 'Ter', spend: 950,  leads: 52, cpa: 48, ctr: 1.4, cpc: 3.2, clicks: 296,  impressions: 21142 },
  { day: 'Qua', spend: 1200, leads: 60, cpa: 52, ctr: 1.6, cpc: 4.0, clicks: 300,  impressions: 18750 },
  { day: 'Qui', spend: 1100, leads: 58, cpa: 51, ctr: 1.3, cpc: 3.7, clicks: 297,  impressions: 22846 },
  { day: 'Sex', spend: 1500, leads: 75, cpa: 48, ctr: 1.8, cpc: 3.1, clicks: 483,  impressions: 26833 },
  { day: 'Sáb', spend: 1800, leads: 85, cpa: 50, ctr: 2.1, cpc: 3.6, clicks: 500,  impressions: 23809 },
  { day: 'Dom', spend: 900,  leads: 48, cpa: 49, ctr: 1.1, cpc: 3.2, clicks: 281,  impressions: 25545 },
];

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Ativa',      color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  paused:    { label: 'Pausada',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  draft:     { label: 'Rascunho',   color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  completed: { label: 'Concluída',  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
};

const PLATFORM_LABEL: Record<string, string> = {
  meta: 'Meta Ads', google: 'Google Ads', linkedin: 'LinkedIn',
};

function KpiCard({ label, value, tooltip, icon: Icon, gradient, glow, sub }: any) {
  return (
    <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`, boxShadow: `0 0 14px ${glow}` }}>
          <Icon size={18} color="#fff" />
        </div>
        <MetricTooltip text={tooltip} />
      </div>
      <p style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{value}</p>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{label}</p>
      {sub && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>{sub}</p>}
    </div>
  );
}

function ChartCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px' }}>
      <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{title}</p>
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '20px' }}>{desc}</p>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px' }}>
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ fontSize: '12px', fontWeight: 600, color: p.color, marginBottom: '2px' }}>
          {p.name}: {typeof p.value === 'number' && (p.name.includes('R$') || p.name === 'Gasto' || p.name === 'CPC' || p.name === 'CPA')
            ? `R$ ${Number(p.value).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
            : p.name === 'CTR' ? `${Number(p.value).toFixed(2)}%`
            : typeof p.value === 'number' ? p.value.toLocaleString('pt-BR')
            : p.value}
        </p>
      ))}
    </div>
  );
}

export default function Analytics() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [weekly, setWeekly] = useState<WeeklyPoint[]>(mockWeekly);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    Promise.all([
      metricsApi.dashboard().catch(() => null),
      campaignsApi.list().catch(() => null),
    ]).then(([metricsRes, campaignsRes]) => {
      if (metricsRes?.data?.summary) {
        setSummary(metricsRes.data.summary);
        if (metricsRes.data.weekly?.length > 0) {
          setWeekly(metricsRes.data.weekly.map((d: any) => ({
            day: d.day,
            spend: Number(d.spend) || 0,
            leads: Number(d.leads) || 0,
            cpa: Number(d.cpa) || 0,
            ctr: Number(d.ctr) || 0,
            cpc: Number(d.cpc) || 0,
            clicks: Number(d.clicks) || 0,
            impressions: Number(d.impressions) || 0,
          })));
        } else {
          setUsingMock(true);
        }
      } else {
        setSummary({ spend: 8250, leads: 423, cpa: 47, roas: 3.4, ctr: 1.6, cpc: 3.5, campaigns: 4 });
        setUsingMock(true);
      }
      if (campaignsRes?.data?.campaigns) {
        setCampaigns(campaignsRes.data.campaigns);
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${CYAN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const kpis = [
    {
      label: 'Investimento Total',
      value: `R$ ${(summary?.spend || 0).toLocaleString('pt-BR')}`,
      tooltip: 'Total gasto em anúncios no período.',
      icon: DollarSign,
      gradient: ['#1d4ed8', '#3b82f6'],
      glow: 'rgba(59,130,246,0.2)',
      sub: 'Soma de todos os anúncios',
    },
    {
      label: 'Leads Gerados',
      value: (summary?.leads || 0).toLocaleString('pt-BR'),
      tooltip: 'Contatos qualificados que deixaram seus dados.',
      icon: Users,
      gradient: ['#047857', '#10b981'],
      glow: 'rgba(16,185,129,0.2)',
      sub: 'Contatos qualificados',
    },
    {
      label: 'CPA Médio',
      value: summary?.cpa ? `R$ ${Number(summary.cpa).toFixed(2)}` : '—',
      tooltip: 'Custo Por Aquisição — quanto custa em média conquistar um lead. Abaixo de R$50 é excelente.',
      icon: Target,
      gradient: ['#c2410c', '#f97316'],
      glow: 'rgba(249,115,22,0.2)',
      sub: 'Menor = melhor',
    },
    {
      label: 'ROAS',
      value: summary?.roas ? `${Number(summary.roas).toFixed(1)}x` : '—',
      tooltip: 'Para cada R$1 investido, quanto voltou em receita. Acima de 3x é ótimo.',
      icon: Zap,
      gradient: ['#7c3aed', '#a78bfa'],
      glow: 'rgba(139,92,246,0.2)',
      sub: 'Acima de 3x = ótimo',
    },
    {
      label: 'CTR Médio',
      value: summary?.ctr ? `${Number(summary.ctr).toFixed(2)}%` : '—',
      tooltip: 'Taxa de Cliques — percentual de pessoas que clicaram no anúncio. Acima de 1.5% é bom.',
      icon: MousePointerClick,
      gradient: ['#0e7490', CYAN],
      glow: `${CYAN}30`,
      sub: 'Acima de 1.5% = bom',
    },
    {
      label: 'CPC Médio',
      value: summary?.cpc ? `R$ ${Number(summary.cpc).toFixed(2)}` : '—',
      tooltip: 'Custo Por Clique — quanto custa cada clique no anúncio.',
      icon: Eye,
      gradient: ['#1e3a5f', '#2563eb'],
      glow: 'rgba(37,99,235,0.2)',
      sub: 'Custo por clique',
    },
  ];

  const bestDay = weekly.reduce((b, d) => d.leads > b.leads ? d : b, weekly[0]);
  const worstDay = weekly.reduce((w, d) => (d.cpa || 0) > (w.cpa || 0) ? d : w, weekly[0]);
  const totalWeekSpend = weekly.reduce((s, d) => s + (d.spend || 0), 0);
  const avgWeekCTR = weekly.filter((d) => d.ctr > 0).reduce((s, d, _, a) => s + d.ctr / a.length, 0);

  return (
    <div className="page-pad" style={{ minHeight: '100vh', background: '#000', padding: '32px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Analytics</h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
          Performance detalhada — gráficos, métricas e comparativos de campanhas.
        </p>
        {usingMock && (
          <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#f59e0b', padding: '5px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            Dados de demonstração — sincronize o Meta Ads para ver seus números reais.
          </div>
        )}
      </div>

      {/* KPIs — 6 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}
        className="grid-kpis-analytics">
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Gráficos — linha 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}
        className="grid-charts">

        <ChartCard title="Investimento vs Leads" desc="Correlação entre gasto e leads gerados por dia.">
          <ResponsiveContainer width="100%" height={200}>
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
              <Legend wrapperStyle={{ fontSize: '11px', color: '#64748b', paddingTop: '10px' }} />
              <Area type="monotone" dataKey="spend" name="Gasto (R$)" stroke="#3b82f6" strokeWidth={2} fill="url(#gBlue)" dot={false} />
              <Area type="monotone" dataKey="leads" name="Leads" stroke="#10b981" strokeWidth={2} fill="url(#gGreen)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="CTR por Dia" desc="Taxa de cliques diária — identifique os dias com melhor engajamento.">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weekly}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" stroke="transparent" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="ctr" name="CTR" stroke={CYAN} strokeWidth={2} dot={{ fill: CYAN, r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="cpc" name="CPC" stroke="#a78bfa" strokeWidth={2} dot={{ fill: '#a78bfa', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Gráficos — linha 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}
        className="grid-charts">

        <ChartCard title="CPA por Dia" desc="Custo Por Aquisição diário — identifique os dias mais eficientes.">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekly} barSize={26}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#c2410c" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" stroke="transparent" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="cpa" name="CPA (R$)" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cliques e Impressões" desc="Volume de cliques e alcance dos anúncios por dia.">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weekly}>
              <defs>
                <linearGradient id="gCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CYAN} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPurp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" stroke="transparent" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#64748b', paddingTop: '10px' }} />
              <Area type="monotone" dataKey="clicks" name="Cliques" stroke={CYAN} strokeWidth={2} fill="url(#gCyan)" dot={false} />
              <Area type="monotone" dataKey="impressions" name="Impressões" stroke="#a78bfa" strokeWidth={2} fill="url(#gPurp)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Tabela de campanhas */}
      {campaigns.length > 0 && (
        <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', marginBottom: '20px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>Comparativo de Campanhas</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Métricas acumuladas por campanha</p>
            </div>
            <button
              onClick={() => navigate('/campanhas')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: `1px solid ${CYAN}40`, background: `${CYAN}15`, color: CYAN, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <Layers size={13} /> Ver conjuntos
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Campanha', 'Plataforma', 'Status', 'Gasto', 'Leads', 'CPA', 'ROAS', 'CTR', 'CPC'].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Campanha' ? 'left' : 'right', color: 'rgba(255,255,255,0.35)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const badge = STATUS_BADGE[c.status] || STATUS_BADGE.draft;
                  return (
                    <tr
                      key={c.id}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => navigate('/campanhas')}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', color: '#fff', fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'rgba(255,255,255,0.5)' }}>{PLATFORM_LABEL[c.platform] || c.platform}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', color: badge.color, background: badge.bg }}>{badge.label}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#fff', fontWeight: 600 }}>R$ {Number(c.total_spend).toLocaleString('pt-BR')}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#fff' }}>{Number(c.total_leads).toLocaleString('pt-BR')}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: c.avg_cpa > 60 ? '#ef4444' : c.avg_cpa > 0 ? '#10b981' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                        {c.avg_cpa > 0 ? `R$ ${Number(c.avg_cpa).toFixed(0)}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: c.avg_roas >= 3 ? '#10b981' : c.avg_roas >= 2 ? '#f59e0b' : c.avg_roas > 0 ? '#ef4444' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                        {c.avg_roas > 0 ? `${Number(c.avg_roas).toFixed(1)}x` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: c.avg_ctr >= 1.5 ? '#10b981' : c.avg_ctr >= 1 ? '#f59e0b' : c.avg_ctr > 0 ? '#ef4444' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                        {c.avg_ctr > 0 ? `${Number(c.avg_ctr).toFixed(2)}%` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'rgba(255,255,255,0.6)' }}>
                        {c.avg_cpc > 0 ? `R$ ${Number(c.avg_cpc).toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insights */}
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px' }}>
        <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Insights da Semana</p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '20px' }}>Análise automática dos últimos 7 dias.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }} className="grid-insights">
          {[
            { icon: TrendingDown, color: '#10b981', title: 'Melhor dia', value: bestDay?.day || '—', desc: `${bestDay?.leads || 0} leads gerados` },
            { icon: TrendingUp, color: '#f97316', title: 'CPA mais alto', value: worstDay?.day || '—', desc: worstDay?.cpa ? `R$ ${Number(worstDay.cpa).toFixed(0)}` : '—' },
            { icon: DollarSign, color: '#3b82f6', title: 'Total investido', value: `R$ ${totalWeekSpend.toLocaleString('pt-BR')}`, desc: 'Nos últimos 7 dias' },
            { icon: MousePointerClick, color: CYAN, title: 'CTR médio semanal', value: avgWeekCTR > 0 ? `${avgWeekCTR.toFixed(2)}%` : '—', desc: avgWeekCTR >= 1.5 ? 'Bom engajamento' : avgWeekCTR >= 1 ? 'Pode melhorar' : 'Revise criativos' },
          ].map(({ icon: Icon, color, title, value, desc }) => (
            <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: `${color}15` }}>
                <Icon size={16} color={color} />
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>{title}</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{value}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .grid-kpis-analytics { grid-template-columns: repeat(2, 1fr) !important; }
          .grid-charts { grid-template-columns: 1fr !important; }
          .grid-insights { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .grid-kpis-analytics { grid-template-columns: 1fr !important; }
          .grid-insights { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
