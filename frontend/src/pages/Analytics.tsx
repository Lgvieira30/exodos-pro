import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, Cell, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Zap, MousePointerClick, Eye, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { metricsApi, campaignsApi, analyzeApi } from '../lib/api';
import { Tooltip as MetricTooltip } from '../components/Tooltip';
import { DateRangePicker, DateRange, defaultRange } from '../components/DateRangePicker';

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

function BenchmarkStrip() {
  return (
    <div style={{ marginBottom: '20px', background: 'rgba(61,184,232,0.04)', border: '1px solid rgba(61,184,232,0.2)', borderRadius: '12px', padding: '14px 20px' }}>
      <p style={{ fontSize: '10px', fontWeight: 700, color: CYAN, marginBottom: '12px', letterSpacing: '0.8px' }}>📊 REFERÊNCIA DE MERCADO — BENCHMARKS B2B META ADS</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }} className="grid-benchmark">
        {[
          { label: 'Custo por Lead', abbr: 'CPL', otimo: 'Abaixo de R$60', aceitavel: 'Até R$150', alto: 'Acima de R$150' },
          { label: 'Taxa de Cliques', abbr: 'CTR', otimo: 'Acima de 2,5%', aceitavel: 'Acima de 1%', alto: 'Abaixo de 1%' },
          { label: 'Custo por Clique', abbr: 'CPC', otimo: 'Abaixo de R$5', aceitavel: 'Até R$15', alto: 'Acima de R$15' },
          { label: 'Retorno sobre Gasto', abbr: 'ROAS', otimo: 'Acima de 3x', aceitavel: 'Acima de 2x', alto: 'Abaixo de 2x' },
        ].map(({ label, abbr, otimo, aceitavel, alto }) => (
          <div key={abbr}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>{label} <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>({abbr})</span></p>
            <p style={{ fontSize: '11px', color: '#10b981', marginBottom: '2px' }}>🟢 {otimo}</p>
            <p style={{ fontSize: '11px', color: '#f59e0b', marginBottom: '2px' }}>🟡 {aceitavel}</p>
            <p style={{ fontSize: '11px', color: '#ef4444' }}>🔴 {alto}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function GlossarySection() {
  const [open, setOpen] = useState(false);
  const items = [
    { abbr: 'CPL', full: 'Custo por Lead', emoji: '💰', desc: 'Quanto você pagou em média por cada pessoa que demonstrou interesse e deixou contato. É a métrica mais importante para B2B. Benchmark: ótimo abaixo de R$60, aceitável até R$150.' },
    { abbr: 'CTR', full: 'Taxa de Cliques', emoji: '📊', desc: 'De cada 100 pessoas que viram seu anúncio, quantas clicaram. CTR 2% = 100 viram, 2 clicaram. Indica se o criativo (imagem/vídeo) está chamando atenção. Bom: acima de 2,5%.' },
    { abbr: 'CPC', full: 'Custo por Clique', emoji: '🖱️', desc: 'Quanto custou cada clique no anúncio. Se você gastou R$100 e teve 20 cliques, o CPC é R$5. Indica a eficiência do anúncio em atrair visitas. Bom: abaixo de R$5.' },
    { abbr: 'ROAS', full: 'Retorno sobre Gasto em Anúncios', emoji: '📈', desc: 'Para cada R$1 investido em anúncios, quanto voltou em receita. ROAS 3x = para cada R$1 gasto, R$3 de retorno. Para serviços B2B com ticket alto, mesmo ROAS 2x pode ser lucrativo.' },
    { abbr: 'CPM', full: 'Custo por Mil Impressões', emoji: '👁️', desc: 'Quanto custa aparecer para 1.000 pessoas. CPM de R$20 = R$20 para mostrar o anúncio 1.000 vezes. CPM alto pode indicar audiência muito disputada ou anúncio de baixa relevância.' },
    { abbr: 'Impressões', full: 'Impressões', emoji: '🔁', desc: 'Número de vezes que o anúncio apareceu na tela de alguém. Muitas impressões + CTR baixo = o anúncio aparece mas não chama atenção suficiente para gerar cliques.' },
  ];
  return (
    <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', marginTop: '16px' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
      >
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>📚 Glossário — O que cada métrica significa</p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Clique para {open ? 'fechar' : 'ver'} as explicações em português</p>
        </div>
        <span style={{ color: CYAN, fontSize: '16px', marginLeft: '16px' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }} className="grid-glossary">
          {items.map(({ abbr, full, emoji, desc }) => (
            <div key={abbr} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px' }}>
              <p style={{ fontSize: '20px', marginBottom: '6px' }}>{emoji}</p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{full}</p>
              <p style={{ fontSize: '10px', color: CYAN, marginBottom: '8px', fontWeight: 600, letterSpacing: '0.5px' }}>{abbr}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      )}
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
  const [range, setRange] = useState<DateRange>(defaultRange());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [weekly, setWeekly] = useState<WeeklyPoint[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [noData, setNoData] = useState(false);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [campaignDeepCache, setCampaignDeepCache] = useState<Record<string, any>>({});
  const [loadingDeepId, setLoadingDeepId] = useState<string | null>(null);

  const load = useCallback((r: DateRange, initial = false) => {
    if (initial) setLoading(true); else setFetching(true);
    Promise.all([
      metricsApi.dashboard(r.from, r.to).catch(() => null),
      campaignsApi.list(r.from, r.to).catch(() => null),
    ]).then(([metricsRes, campaignsRes]) => {
      if (metricsRes?.data?.summary) {
        setSummary(metricsRes.data.summary);
        if (metricsRes.data.weekly?.length > 0) {
          setNoData(false);
          setWeekly(metricsRes.data.weekly.map((d: any) => ({
            day: d.label || d.day,
            spend: Number(d.spend) || 0,
            leads: Number(d.leads) || 0,
            cpa: Number(d.cpa) || 0,
            ctr: Number(d.ctr) || 0,
            cpc: Number(d.cpc) || 0,
            clicks: Number(d.clicks) || 0,
            impressions: Number(d.impressions) || 0,
          })));
        } else {
          setWeekly([]);
          setNoData(true);
        }
      } else {
        setSummary(null);
        setWeekly([]);
        setNoData(true);
      }
      if (campaignsRes?.data?.campaigns) setCampaigns(campaignsRes.data.campaigns);
    }).finally(() => { setLoading(false); setFetching(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCampaignDeep = useCallback(async (campaignId: string) => {
    if (campaignDeepCache[campaignId]) {
      setExpandedCampaignId(prev => prev === campaignId ? null : campaignId);
      return;
    }
    if (expandedCampaignId === campaignId) { setExpandedCampaignId(null); return; }
    setLoadingDeepId(campaignId);
    try {
      const res = await analyzeApi.deep(campaignId, range.from, range.to);
      if (res?.data) {
        setCampaignDeepCache(prev => ({ ...prev, [campaignId]: res.data }));
        setExpandedCampaignId(campaignId);
      }
    } catch { /* ignore */ } finally { setLoadingDeepId(null); }
  }, [campaignDeepCache, expandedCampaignId, range]);

  const isFirstMount = React.useRef(true);
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; load(range, true); }
    else load(range, false);
  }, [range]); // eslint-disable-line react-hooks/exhaustive-deps

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
      label: 'Custo por Lead — CPL',
      value: summary?.cpa ? `R$ ${Number(summary.cpa).toFixed(2)}` : '—',
      tooltip: 'CPL = quanto você pagou por cada pessoa que se interessou e deixou contato. Benchmark B2B Meta Ads: ótimo abaixo de R$60, aceitável até R$150.',
      icon: Target,
      gradient: ['#c2410c', '#f97316'],
      glow: 'rgba(249,115,22,0.2)',
      sub: summary?.cpa ? (Number(summary.cpa) <= 60 ? '✅ Ótimo — abaixo de R$60' : Number(summary.cpa) <= 150 ? '⚠️ Aceitável — abaixo de R$150' : '❌ Alto — acima de R$150') : 'Quanto você paga por lead',
    },
    {
      label: 'Retorno sobre Gasto — ROAS',
      value: summary?.roas ? `${Number(summary.roas).toFixed(1)}x` : '—',
      tooltip: 'ROAS = para cada R$1 investido em anúncios, quanto voltou em receita. ROAS 3x significa R$3 de retorno para cada R$1 gasto. Acima de 3x é ótimo para B2B.',
      icon: Zap,
      gradient: ['#7c3aed', '#a78bfa'],
      glow: 'rgba(139,92,246,0.2)',
      sub: summary?.roas ? (Number(summary.roas) >= 3 ? '✅ Ótimo — acima de 3x' : Number(summary.roas) >= 2 ? '⚠️ Aceitável — acima de 2x' : '❌ Baixo — abaixo de 2x') : 'R$ de retorno por R$ investido',
    },
    {
      label: 'Taxa de Cliques — CTR',
      value: summary?.ctr ? `${Number(summary.ctr).toFixed(2)}%` : '—',
      tooltip: 'CTR = de cada 100 pessoas que viram o anúncio, quantas clicaram. CTR 2% = 100 viram, 2 clicaram. Indica se o criativo (imagem/vídeo) está chamando atenção. Ótimo: acima de 2,5%.',
      icon: MousePointerClick,
      gradient: ['#0e7490', CYAN],
      glow: `${CYAN}30`,
      sub: summary?.ctr ? (Number(summary.ctr) >= 2.5 ? '✅ Excelente — acima de 2,5%' : Number(summary.ctr) >= 1 ? '⚠️ Aceitável — acima de 1%' : '❌ Baixo — abaixo de 1%') : '% de quem viu e clicou',
    },
    {
      label: 'Custo por Clique — CPC',
      value: summary?.cpc ? `R$ ${Number(summary.cpc).toFixed(2)}` : '—',
      tooltip: 'CPC = quanto custou cada clique no anúncio. Se você gastou R$100 e teve 20 cliques, o CPC é R$5. Indica eficiência do anúncio. Ótimo: abaixo de R$5.',
      icon: Eye,
      gradient: ['#1e3a5f', '#2563eb'],
      glow: 'rgba(37,99,235,0.2)',
      sub: summary?.cpc ? (Number(summary.cpc) <= 5 ? '✅ Bom — abaixo de R$5' : Number(summary.cpc) <= 15 ? '⚠️ Médio — abaixo de R$15' : '❌ Caro — acima de R$15') : 'Preço de cada visita ao site',
    },
  ];

  const bestDay = weekly.length > 0 ? weekly.reduce((b, d) => d.leads > b.leads ? d : b, weekly[0]) : null;
  const worstDay = weekly.length > 0 ? weekly.reduce((w, d) => (d.cpa || 0) > (w.cpa || 0) ? d : w, weekly[0]) : null;
  const totalWeekSpend = weekly.reduce((s, d) => s + (d.spend || 0), 0);
  const avgWeekCTR = weekly.filter((d) => d.ctr > 0).reduce((s, d, _, a) => s + d.ctr / a.length, 0);

  return (
    <div className="page-pad" style={{ minHeight: '100vh', background: '#000', padding: '32px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Analytics</h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
              Performance detalhada — gráficos, métricas e comparativos de campanhas.
            </p>
          </div>
          <DateRangePicker value={range} onChange={setRange} />
        </div>
        {noData && (
          <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#f59e0b', padding: '5px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            Nenhum dado para este período — sincronize o Meta Ads em Configurações para ver seus números reais.
          </div>
        )}
        {fetching && (
          <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', padding: '5px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)' }}>
            Atualizando...
          </div>
        )}
      </div>

      <BenchmarkStrip />

      {/* KPIs — 6 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}
        className="grid-kpis-analytics">
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Gráficos — linha 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}
        className="grid-charts">

        <ChartCard title="Investimento vs Leads por Dia" desc="Barras azuis = quanto você gastou. Verde = quantos leads chegaram. Dias com gasto alto mas leads baixos indicam problema no funil.">
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

        <ChartCard title="Taxa de Cliques (CTR) e Custo por Clique (CPC) por Dia" desc="CTR (azul) = % que clicou. CPC (roxo) = preço de cada clique. CTR alto + CPC baixo = anúncio eficiente.">
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

        <ChartCard title="Custo por Lead (CPL) por Dia" desc="Verde = ótimo (abaixo de R$60) · Amarelo = aceitável (R$60–R$150) · Vermelho = alto (acima de R$150). Linhas tracejadas mostram os limites de benchmark.">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekly} barSize={26}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" stroke="transparent" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={60} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Bom R$60', fill: '#10b981', fontSize: 10, position: 'right' }} />
              <ReferenceLine y={150} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Alto R$150', fill: '#ef4444', fontSize: 10, position: 'right' }} />
              <Bar dataKey="cpa" name="Custo por Lead (R$)" radius={[6, 6, 0, 0]}>
                {weekly.map((entry, index) => (
                  <Cell key={`cpa-${index}`} fill={entry.cpa <= 60 ? '#10b981' : entry.cpa <= 150 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cliques vs Impressões por Dia" desc="Azul = cliques (pessoas que clicaram). Roxo = impressões (pessoas que viram). Se impressões sobem mas cliques não: o criativo não está chamando atenção.">
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
                  {[
                    { key: 'Campanha', label: 'Campanha', title: '' },
                    { key: 'Plataforma', label: 'Plataforma', title: '' },
                    { key: 'Status', label: 'Status', title: '' },
                    { key: 'Gasto', label: 'Total Investido', title: 'Quanto foi gasto nesta campanha no período selecionado' },
                    { key: 'Leads', label: 'Leads', title: 'Número de contatos qualificados gerados por esta campanha' },
                    { key: 'CPA', label: 'Custo por Lead (CPL)', title: 'CPL — quanto custou em média cada lead gerado. Bom: abaixo de R$60. Aceitável: até R$150' },
                    { key: 'ROAS', label: 'Retorno sobre Gasto (ROAS)', title: 'ROAS — para cada R$1 investido, quanto voltou em receita. Acima de 3x é ótimo' },
                    { key: 'CTR', label: 'Taxa de Cliques (CTR)', title: 'CTR — % de pessoas que viram o anúncio e clicaram. Acima de 2,5% é ótimo; acima de 1% é aceitável' },
                    { key: 'CPC', label: 'Custo por Clique (CPC)', title: 'CPC — quanto custou cada clique individual no anúncio. Bom: abaixo de R$5' },
                  ].map((h) => (
                    <th key={h.key} title={h.title || undefined} style={{ padding: '10px 16px', textAlign: h.key === 'Campanha' ? 'left' : 'right', color: 'rgba(255,255,255,0.35)', fontWeight: 600, whiteSpace: 'nowrap', cursor: h.title ? 'help' : 'default' }}>{h.label}</th>
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

      {/* Análise por campanha */}
      {campaigns.length > 0 && (
        <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Análise Individual por Campanha</p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '20px' }}>Cada campanha avaliada com semáforo de saúde baseado nos benchmarks B2B.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {campaigns.map((c) => {
              const cplColor = c.avg_cpa <= 0 ? '#64748b' : c.avg_cpa <= 60 ? '#10b981' : c.avg_cpa <= 150 ? '#f59e0b' : '#ef4444';
              const cplLabel = c.avg_cpa <= 0 ? 'Sem dados' : c.avg_cpa <= 60 ? '✅ Ótimo' : c.avg_cpa <= 150 ? '⚠️ Aceitável' : '❌ Alto';
              const ctrColor = c.avg_ctr <= 0 ? '#64748b' : c.avg_ctr >= 2.5 ? '#10b981' : c.avg_ctr >= 1 ? '#f59e0b' : '#ef4444';
              const ctrLabel = c.avg_ctr <= 0 ? 'Sem dados' : c.avg_ctr >= 2.5 ? '✅ Excelente' : c.avg_ctr >= 1 ? '⚠️ Aceitável' : '❌ Baixo';
              const badge = STATUS_BADGE[c.status] || STATUS_BADGE.draft;
              const healthScore = [
                c.avg_cpa > 0 && c.avg_cpa <= 60 ? 40 : c.avg_cpa > 0 && c.avg_cpa <= 150 ? 25 : c.avg_cpa > 0 ? 0 : 20,
                c.avg_ctr >= 2.5 ? 30 : c.avg_ctr >= 1 ? 20 : c.avg_ctr > 0 ? 5 : 15,
                c.avg_cpc > 0 && c.avg_cpc <= 5 ? 30 : c.avg_cpc > 0 && c.avg_cpc <= 15 ? 20 : c.avg_cpc > 0 ? 5 : 15,
              ].reduce((a, b) => a + b, 0);
              const healthColor = healthScore >= 70 ? '#10b981' : healthScore >= 45 ? '#f59e0b' : '#ef4444';
              const healthEmoji = healthScore >= 70 ? '🟢' : healthScore >= 45 ? '🟡' : '🔴';
              return (
                <div key={c.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${healthColor}25`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', color: badge.color, background: badge.bg }}>{badge.label}</span>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{PLATFORM_LABEL[c.platform] || c.platform}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '10px' }}>
                      <p style={{ fontSize: '20px', fontWeight: 800, color: healthColor, lineHeight: 1 }}>{healthScore}</p>
                      <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>saúde/100</p>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ padding: '8px 10px', borderRadius: '8px', background: `${cplColor}10`, border: `1px solid ${cplColor}20` }}>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Custo por Lead (CPL)</p>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: cplColor }}>{c.avg_cpa > 0 ? `R$ ${Number(c.avg_cpa).toFixed(0)}` : '—'}</p>
                      <p style={{ fontSize: '10px', color: cplColor }}>{cplLabel}</p>
                    </div>
                    <div style={{ padding: '8px 10px', borderRadius: '8px', background: `${ctrColor}10`, border: `1px solid ${ctrColor}20` }}>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Taxa de Cliques (CTR)</p>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: ctrColor }}>{c.avg_ctr > 0 ? `${Number(c.avg_ctr).toFixed(2)}%` : '—'}</p>
                      <p style={{ fontSize: '10px', color: ctrColor }}>{ctrLabel}</p>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    <div style={{ textAlign: 'center', padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)' }}>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '1px' }}>Investido</p>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>R$ {Number(c.total_spend).toLocaleString('pt-BR')}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)' }}>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '1px' }}>Leads</p>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>{Number(c.total_leads)}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)' }}>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '1px' }}>ROAS</p>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: c.avg_roas >= 3 ? '#10b981' : c.avg_roas >= 2 ? '#f59e0b' : '#64748b' }}>{c.avg_roas > 0 ? `${Number(c.avg_roas).toFixed(1)}x` : '—'}</p>
                    </div>
                  </div>
                  <div style={{ marginTop: '10px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', borderLeft: `3px solid ${healthColor}` }}>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                      {healthEmoji} {
                        c.total_leads === 0 && c.total_spend > 0 ? 'Investimento sem leads — verifique o pixel de rastreamento e a landing page.' :
                        c.avg_cpa <= 60 && c.avg_ctr >= 1 ? 'Campanha eficiente — boa candidata para aumentar o orçamento gradualmente.' :
                        c.avg_cpa > 150 ? 'CPL alto — revise a landing page e o criativo antes de continuar investindo.' :
                        c.avg_ctr < 1 && c.avg_ctr > 0 ? 'CTR baixo — o criativo não está chamando atenção. Teste uma nova imagem ou vídeo.' :
                        c.total_leads < 3 ? 'Volume pequeno — aguarde mais dados antes de tomar decisões.' :
                        'Métricas aceitáveis — monitore diariamente e teste variações de criativo.'
                      }
                    </p>
                  </div>

                  <button
                    onClick={() => loadCampaignDeep(c.id)}
                    style={{ marginTop: '10px', width: '100%', padding: '7px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.08)', background: expandedCampaignId === c.id ? 'rgba(61,184,232,0.08)' : 'rgba(255,255,255,0.03)', color: expandedCampaignId === c.id ? CYAN : 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {loadingDeepId === c.id ? '⟳ Carregando...' : expandedCampaignId === c.id ? '▲ Ocultar detalhes' : '▼ Conjuntos e anúncios'}
                  </button>

                  {expandedCampaignId === c.id && campaignDeepCache[c.id] && (() => {
                    const deep = campaignDeepCache[c.id];
                    return (
                      <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                        {deep.adSets?.length > 0 && (
                          <div style={{ marginBottom: '10px' }}>
                            <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>CONJUNTOS ({deep.adSets.length})</p>
                            {deep.adSets.map((as: any) => {
                              const asColor = as.score >= 75 ? '#10b981' : as.score >= 50 ? '#f59e0b' : '#ef4444';
                              const statusDot = as.status === 'active' ? '🟢' : as.status === 'paused' ? '⏸' : '⭕';
                              const isActive = as.status === 'active';
                              return (
                                <div key={as.id} style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${asColor}18`, marginBottom: '4px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isActive ? '5px' : 0 }}>
                                    <p style={{ fontSize: '11px', fontWeight: 600, color: isActive ? '#fff' : 'rgba(255,255,255,0.35)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '6px' }}>{statusDot} {as.name}</p>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                                      <span style={{ fontSize: '9px', fontWeight: 700, color: as.action?.color, background: as.action?.bg, padding: '1px 6px', borderRadius: '6px' }}>{as.action?.label}</span>
                                      <span style={{ fontSize: '12px', fontWeight: 800, color: asColor }}>{as.score}</span>
                                    </div>
                                  </div>
                                  {isActive && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px' }}>
                                      {[
                                        { lbl: 'CPL', val: Number(as.cpa) > 0 ? `R$${Number(as.cpa).toFixed(0)}` : '—', color: Number(as.cpa) <= 60 ? '#10b981' : Number(as.cpa) <= 150 ? '#f59e0b' : '#ef4444' },
                                        { lbl: 'CTR', val: Number(as.ctr) > 0 ? `${Number(as.ctr).toFixed(1)}%` : '—', color: Number(as.ctr) >= 2.5 ? '#10b981' : Number(as.ctr) >= 1 ? '#f59e0b' : '#ef4444' },
                                        { lbl: 'Leads', val: String(as.leads), color: '#fff' },
                                        { lbl: 'Gasto', val: `R$${Number(as.spend).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, color: '#fff' },
                                      ].map(({ lbl, val, color }) => (
                                        <div key={lbl} style={{ textAlign: 'center', padding: '3px', borderRadius: '5px', background: 'rgba(255,255,255,0.03)' }}>
                                          <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', marginBottom: '1px' }}>{lbl}</p>
                                          <p style={{ fontSize: '10px', fontWeight: 700, color }}>{val}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {deep.ads?.length > 0 && (
                          <div>
                            <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>ANÚNCIOS ({deep.ads.length})</p>
                            {deep.ads.map((ad: any) => {
                              const adColor = ad.score >= 75 ? '#10b981' : ad.score >= 50 ? '#f59e0b' : '#ef4444';
                              const statusDot = ad.status === 'active' ? '🟢' : ad.status === 'paused' ? '⏸' : '⭕';
                              const isActive = ad.status === 'active';
                              return (
                                <div key={ad.id} style={{ padding: '7px 9px', borderRadius: '7px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '3px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <p style={{ fontSize: '10px', fontWeight: 600, color: isActive ? '#fff' : 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{statusDot} {ad.name}</p>
                                      <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>{ad.ad_set_name}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                                      <span style={{ fontSize: '9px', fontWeight: 700, color: ad.action?.color, background: ad.action?.bg, padding: '1px 5px', borderRadius: '5px' }}>{ad.action?.label}</span>
                                      <span style={{ fontSize: '11px', fontWeight: 800, color: adColor }}>{ad.score}</span>
                                    </div>
                                  </div>
                                  {isActive && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2px', marginTop: '4px' }}>
                                      {[
                                        { lbl: 'CPL', val: Number(ad.cpa) > 0 ? `R$${Number(ad.cpa).toFixed(0)}` : '—', color: Number(ad.cpa) <= 60 ? '#10b981' : Number(ad.cpa) <= 150 ? '#f59e0b' : '#ef4444' },
                                        { lbl: 'CTR', val: Number(ad.ctr) > 0 ? `${Number(ad.ctr).toFixed(1)}%` : '—', color: Number(ad.ctr) >= 2.5 ? '#10b981' : Number(ad.ctr) >= 1 ? '#f59e0b' : '#ef4444' },
                                        { lbl: 'Leads', val: String(ad.leads), color: '#10b981' },
                                        { lbl: 'Gasto', val: `R$${Number(ad.spend).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, color: '#fff' },
                                      ].map(({ lbl, val, color }) => (
                                        <div key={lbl} style={{ textAlign: 'center', padding: '2px', borderRadius: '4px', background: 'rgba(255,255,255,0.025)' }}>
                                          <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)', marginBottom: '1px' }}>{lbl}</p>
                                          <p style={{ fontSize: '10px', fontWeight: 700, color }}>{val}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {(!deep.adSets?.length && !deep.ads?.length) && (
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '8px' }}>Nenhum conjunto/anúncio sincronizado.</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Insights */}
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px' }}>
        <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Destaques do Período</p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '20px' }}>Análise automática dos dados do período selecionado.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }} className="grid-insights">
          {[
            { icon: TrendingDown, color: '#10b981', title: 'Melhor dia (mais leads)', value: bestDay ? bestDay.day : '—', desc: bestDay ? `${bestDay.leads} leads gerados` : 'Sem dados no período' },
            { icon: TrendingUp, color: '#f97316', title: 'Dia mais caro (CPL alto)', value: worstDay ? worstDay.day : '—', desc: worstDay?.cpa ? `Custo por Lead: R$ ${Number(worstDay.cpa).toFixed(0)}` : '—' },
            { icon: DollarSign, color: '#3b82f6', title: 'Total investido no período', value: `R$ ${totalWeekSpend.toLocaleString('pt-BR')}`, desc: 'Soma de todas as campanhas' },
            { icon: MousePointerClick, color: CYAN, title: 'Taxa de Cliques média (CTR)', value: avgWeekCTR > 0 ? `${avgWeekCTR.toFixed(2)}%` : '—', desc: avgWeekCTR >= 2.5 ? '✅ Excelente — acima de 2,5%' : avgWeekCTR >= 1 ? '⚠️ Aceitável — acima de 1%' : avgWeekCTR > 0 ? '❌ Baixo — revise os criativos' : 'Sincronize para ver' },
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

      <GlossarySection />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .grid-kpis-analytics { grid-template-columns: repeat(2, 1fr) !important; }
          .grid-charts { grid-template-columns: 1fr !important; }
          .grid-insights { grid-template-columns: repeat(2, 1fr) !important; }
          .grid-benchmark { grid-template-columns: repeat(2, 1fr) !important; }
          .grid-glossary { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .grid-kpis-analytics { grid-template-columns: 1fr !important; }
          .grid-insights { grid-template-columns: 1fr !important; }
          .grid-benchmark { grid-template-columns: 1fr !important; }
          .grid-glossary { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
