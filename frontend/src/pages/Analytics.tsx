import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, Cell, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Zap, MousePointerClick, Eye, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { metricsApi, campaignsApi, analyzeApi } from '../lib/api';
import { DateRangePicker, DateRange, defaultRange } from '../components/DateRangePicker';

const GREEN = '#2F7D4F';
const BG = '#F6F7F9';
const BG_CARD = '#FFFFFF';
const BG_SUBTLE = '#F9FAFB';
const FG = '#111827';
const FG_MUTED = '#6B7280';
const FG_SUBTLE = '#9CA3AF';
const BORDER = '#E5E7EB';
const SHADOW = '0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.05)';

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
  active:    { label: 'Ativa',      color: '#2F7D4F', bg: 'rgba(47,125,79,0.08)' },
  paused:    { label: 'Pausada',    color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
  draft:     { label: 'Rascunho',   color: '#6B7280', bg: 'rgba(107,114,128,0.08)' },
  completed: { label: 'Concluída',  color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
};

const PLATFORM_LABEL: Record<string, string> = {
  meta: 'Meta Ads', google: 'Google Ads', linkedin: 'LinkedIn',
};

function KpiCard({ label, value, icon: Icon, iconColor, sub, subColor }: any) {
  return (
    <div style={{
      background: BG_CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: '16px',
      padding: '18px 20px',
      position: 'relative',
      boxShadow: SHADOW,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '11px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${iconColor}14`,
        }}>
          <Icon size={17} color={iconColor} />
        </div>
        {sub && (
          <span style={{
            fontSize: '10px', fontWeight: 700,
            padding: '3px 8px', borderRadius: '20px',
            color: subColor || FG_MUTED,
            background: subColor ? `${subColor}12` : BG_SUBTLE,
            border: `1px solid ${subColor ? subColor + '25' : BORDER}`,
            maxWidth: '130px', textAlign: 'right', lineHeight: 1.3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {sub}
          </span>
        )}
      </div>
      <p style={{ fontSize: '22px', fontWeight: 800, color: FG, marginBottom: '4px', letterSpacing: '-0.02em' }}>{value}</p>
      <p style={{ fontSize: '12px', color: FG_MUTED, fontWeight: 500 }}>{label}</p>
    </div>
  );
}

function ChartCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: BG_CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: '16px',
      padding: '20px 22px',
      boxShadow: SHADOW,
    }}>
      <p style={{ fontSize: '13px', fontWeight: 700, color: FG, marginBottom: '3px' }}>{title}</p>
      <p style={{ fontSize: '11px', color: FG_MUTED, marginBottom: '18px', lineHeight: 1.5 }}>{desc}</p>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '10px 14px', boxShadow: SHADOW }}>
      <p style={{ fontSize: '11px', color: FG_MUTED, marginBottom: '6px' }}>{label}</p>
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: BG }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${GREEN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const kpis = [
    {
      label: 'Investimento Total',
      value: `R$ ${(summary?.spend || 0).toLocaleString('pt-BR')}`,
      icon: DollarSign,
      iconColor: '#2563EB',
      sub: 'Soma de todos os anúncios',
      subColor: undefined,
    },
    {
      label: 'Leads Gerados',
      value: (summary?.leads || 0).toLocaleString('pt-BR'),
      icon: Users,
      iconColor: '#2F7D4F',
      sub: 'Contatos qualificados',
      subColor: '#2F7D4F',
    },
    {
      label: 'Custo por Lead — CPL',
      value: summary?.cpa ? `R$ ${Number(summary.cpa).toFixed(2)}` : '—',
      icon: Target,
      iconColor: '#D97706',
      sub: summary?.cpa
        ? (Number(summary.cpa) <= 60 ? '✅ Ótimo' : Number(summary.cpa) <= 150 ? '⚠️ Aceitável' : '❌ Alto')
        : 'Quanto você paga por lead',
      subColor: summary?.cpa
        ? (Number(summary.cpa) <= 60 ? '#2F7D4F' : Number(summary.cpa) <= 150 ? '#D97706' : '#DC2626')
        : undefined,
    },
    {
      label: 'Retorno sobre Gasto — ROAS',
      value: summary?.roas ? `${Number(summary.roas).toFixed(1)}x` : '—',
      icon: Zap,
      iconColor: '#7C3AED',
      sub: summary?.roas
        ? (Number(summary.roas) >= 3 ? '✅ Ótimo' : Number(summary.roas) >= 2 ? '⚠️ Aceitável' : '❌ Baixo')
        : 'R$ de retorno por R$ gasto',
      subColor: summary?.roas
        ? (Number(summary.roas) >= 3 ? '#2F7D4F' : Number(summary.roas) >= 2 ? '#D97706' : '#DC2626')
        : undefined,
    },
    {
      label: 'Taxa de Cliques — CTR',
      value: summary?.ctr ? `${Number(summary.ctr).toFixed(2)}%` : '—',
      icon: MousePointerClick,
      iconColor: GREEN,
      sub: summary?.ctr
        ? (Number(summary.ctr) >= 2.5 ? '✅ Excelente' : Number(summary.ctr) >= 1 ? '⚠️ Aceitável' : '❌ Baixo')
        : '% de quem viu e clicou',
      subColor: summary?.ctr
        ? (Number(summary.ctr) >= 2.5 ? '#2F7D4F' : Number(summary.ctr) >= 1 ? '#D97706' : '#DC2626')
        : undefined,
    },
    {
      label: 'Custo por Clique — CPC',
      value: summary?.cpc ? `R$ ${Number(summary.cpc).toFixed(2)}` : '—',
      icon: Eye,
      iconColor: '#2563EB',
      sub: summary?.cpc
        ? (Number(summary.cpc) <= 5 ? '✅ Bom' : Number(summary.cpc) <= 15 ? '⚠️ Médio' : '❌ Caro')
        : 'Preço de cada visita ao site',
      subColor: summary?.cpc
        ? (Number(summary.cpc) <= 5 ? '#2F7D4F' : Number(summary.cpc) <= 15 ? '#D97706' : '#DC2626')
        : undefined,
    },
  ];

  const bestDay = weekly.length > 0 ? weekly.reduce((b, d) => d.leads > b.leads ? d : b, weekly[0]) : null;
  const worstDay = weekly.length > 0 ? weekly.reduce((w, d) => (d.cpa || 0) > (w.cpa || 0) ? d : w, weekly[0]) : null;
  const totalWeekSpend = weekly.reduce((s, d) => s + (d.spend || 0), 0);
  const avgWeekCTR = weekly.filter((d) => d.ctr > 0).reduce((s, d, _, a) => s + d.ctr / a.length, 0);

  return (
    <div className="page-pad" style={{ minHeight: '100vh', background: BG, padding: '28px 32px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '5px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: FG, letterSpacing: '-0.02em', margin: 0 }}>Analytics</h1>
              {fetching && (
                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                  color: FG_MUTED, background: BG_SUBTLE,
                  border: `1px solid ${BORDER}`, letterSpacing: '0.03em',
                }}>
                  Atualizando...
                </span>
              )}
            </div>
            <p style={{ fontSize: '12px', color: FG_MUTED, margin: 0, fontWeight: 400 }}>
              Performance detalhada — gráficos, métricas e comparativos de campanhas.
            </p>
          </div>
          <DateRangePicker value={range} onChange={setRange} />
        </div>
        {noData && (
          <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#D97706', padding: '6px 14px', borderRadius: '8px', background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.2)' }}>
            Nenhum dado para este período — sincronize o Meta Ads em Configurações para ver seus números reais.
          </div>
        )}
      </div>

      {/* KPIs — 6 cards in 2 rows of 3 */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}
        className="grid-kpis-analytics"
      >
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Charts — row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }} className="grid-charts">

        <ChartCard title="Investimento vs Leads por Dia" desc="Barras azuis = quanto você gastou. Verde = quantos leads chegaram. Dias com gasto alto mas leads baixos indicam problema no funil.">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weekly}>
              <defs>
                <linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2F7D4F" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#2F7D4F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="day" stroke="transparent" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: FG_MUTED, paddingTop: '10px' }} />
              <Area type="monotone" dataKey="spend" name="Gasto (R$)" stroke="#2563EB" strokeWidth={2} fill="url(#gBlue)" dot={false} />
              <Area type="monotone" dataKey="leads" name="Leads" stroke="#2F7D4F" strokeWidth={2} fill="url(#gGreen)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Taxa de Cliques (CTR) e Custo por Clique (CPC) por Dia" desc="CTR (verde) = % que clicou. CPC (roxo) = preço de cada clique. CTR alto + CPC baixo = anúncio eficiente.">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weekly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="day" stroke="transparent" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="ctr" name="CTR" stroke={GREEN} strokeWidth={2} dot={{ fill: GREEN, r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="cpc" name="CPC" stroke="#7C3AED" strokeWidth={2} dot={{ fill: '#7C3AED', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts — row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }} className="grid-charts">

        <ChartCard title="Custo por Lead (CPL) por Dia" desc="Verde = ótimo (abaixo de R$60) · Amarelo = aceitável (R$60–R$150) · Vermelho = alto (acima de R$150). Linhas tracejadas mostram os limites de benchmark.">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekly} barSize={26}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="day" stroke="transparent" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={60} stroke="#2F7D4F" strokeDasharray="4 4" label={{ value: 'Bom R$60', fill: '#2F7D4F', fontSize: 10, position: 'right' }} />
              <ReferenceLine y={150} stroke="#DC2626" strokeDasharray="4 4" label={{ value: 'Alto R$150', fill: '#DC2626', fontSize: 10, position: 'right' }} />
              <Bar dataKey="cpa" name="Custo por Lead (R$)" radius={[6, 6, 0, 0]}>
                {weekly.map((entry, index) => (
                  <Cell key={`cpa-${index}`} fill={entry.cpa <= 60 ? '#2F7D4F' : entry.cpa <= 150 ? '#D97706' : '#DC2626'} />
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
                  <stop offset="0%" stopColor={GREEN} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPurp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="day" stroke="transparent" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: FG_MUTED, paddingTop: '10px' }} />
              <Area type="monotone" dataKey="clicks" name="Cliques" stroke={GREEN} strokeWidth={2} fill="url(#gCyan)" dot={false} />
              <Area type="monotone" dataKey="impressions" name="Impressões" stroke="#7C3AED" strokeWidth={2} fill="url(#gPurp)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Campaign comparison table */}
      {campaigns.length > 0 && (
        <div style={{
          background: BG_CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: '16px',
          marginBottom: '20px',
          overflow: 'hidden',
          boxShadow: SHADOW,
        }}>
          <div style={{
            padding: '18px 22px',
            borderBottom: `1px solid ${BORDER}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: FG, marginBottom: '2px' }}>Comparativo de Campanhas</p>
              <p style={{ fontSize: '11px', color: FG_MUTED }}>Métricas acumuladas por campanha no período</p>
            </div>
            <button
              onClick={() => navigate('/campanhas')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '8px',
                border: `1px solid rgba(47,125,79,0.2)`, background: 'rgba(47,125,79,0.06)',
                color: GREEN, fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Layers size={13} /> Ver conjuntos
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {[
                    { key: 'Campanha', label: 'Campanha', title: '' },
                    { key: 'Plataforma', label: 'Plataforma', title: '' },
                    { key: 'Status', label: 'Status', title: '' },
                    { key: 'Gasto', label: 'Total Investido', title: 'Quanto foi gasto nesta campanha no período selecionado' },
                    { key: 'Leads', label: 'Leads', title: 'Número de contatos qualificados gerados por esta campanha' },
                    { key: 'CPA', label: 'CPL', title: 'CPL — quanto custou em média cada lead gerado. Bom: abaixo de R$60. Aceitável: até R$150' },
                    { key: 'ROAS', label: 'ROAS', title: 'ROAS — para cada R$1 investido, quanto voltou em receita. Acima de 3x é ótimo' },
                    { key: 'CTR', label: 'CTR', title: 'CTR — % de pessoas que viram o anúncio e clicaram. Acima de 2,5% é ótimo; acima de 1% é aceitável' },
                    { key: 'CPC', label: 'CPC', title: 'CPC — quanto custou cada clique individual no anúncio. Bom: abaixo de R$5' },
                  ].map((h) => (
                    <th
                      key={h.key}
                      title={h.title || undefined}
                      style={{
                        padding: '11px 18px',
                        textAlign: h.key === 'Campanha' ? 'left' : 'right',
                        fontSize: '10px', fontWeight: 700,
                        color: FG_SUBTLE,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        whiteSpace: 'nowrap',
                        cursor: h.title ? 'help' : 'default',
                      }}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const badge = STATUS_BADGE[c.status] || STATUS_BADGE.draft;
                  return (
                    <tr
                      key={c.id}
                      style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer', transition: 'background 0.12s' }}
                      onClick={() => navigate('/campanhas')}
                      onMouseEnter={(e) => (e.currentTarget.style.background = BG_SUBTLE)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '13px 18px', color: FG, fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</td>
                      <td style={{ padding: '13px 18px', textAlign: 'right', color: FG_MUTED, fontSize: '12px' }}>{PLATFORM_LABEL[c.platform] || c.platform}</td>
                      <td style={{ padding: '13px 18px', textAlign: 'right' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', color: badge.color, background: badge.bg }}>{badge.label}</span>
                      </td>
                      <td style={{ padding: '13px 18px', textAlign: 'right', color: FG, fontWeight: 700 }}>R$ {Number(c.total_spend).toLocaleString('pt-BR')}</td>
                      <td style={{ padding: '13px 18px', textAlign: 'right', color: FG, fontWeight: 500 }}>{Number(c.total_leads).toLocaleString('pt-BR')}</td>
                      <td style={{ padding: '13px 18px', textAlign: 'right', color: c.avg_cpa > 60 ? '#DC2626' : c.avg_cpa > 0 ? '#2F7D4F' : FG_SUBTLE, fontWeight: 700 }}>
                        {c.avg_cpa > 0 ? `R$ ${Number(c.avg_cpa).toFixed(0)}` : '—'}
                      </td>
                      <td style={{ padding: '13px 18px', textAlign: 'right', color: c.avg_roas >= 3 ? '#2F7D4F' : c.avg_roas >= 2 ? '#D97706' : c.avg_roas > 0 ? '#DC2626' : FG_SUBTLE, fontWeight: 700 }}>
                        {c.avg_roas > 0 ? `${Number(c.avg_roas).toFixed(1)}x` : '—'}
                      </td>
                      <td style={{ padding: '13px 18px', textAlign: 'right', color: c.avg_ctr >= 1.5 ? '#2F7D4F' : c.avg_ctr >= 1 ? '#D97706' : c.avg_ctr > 0 ? '#DC2626' : FG_SUBTLE, fontWeight: 700 }}>
                        {c.avg_ctr > 0 ? `${Number(c.avg_ctr).toFixed(2)}%` : '—'}
                      </td>
                      <td style={{ padding: '13px 18px', textAlign: 'right', color: FG_MUTED, fontSize: '12px' }}>
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

      {/* Individual campaign analysis */}
      {campaigns.length > 0 && (
        <div style={{
          background: BG_CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: '16px',
          padding: '22px 24px',
          marginBottom: '16px',
          boxShadow: SHADOW,
        }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: FG, marginBottom: '4px' }}>Análise Individual por Campanha</p>
          <p style={{ fontSize: '11px', color: FG_MUTED, marginBottom: '20px' }}>Cada campanha avaliada com semáforo de saúde baseado nos benchmarks B2B.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {campaigns.map((c) => {
              const cplColor = c.avg_cpa <= 0 ? FG_SUBTLE : c.avg_cpa <= 60 ? '#2F7D4F' : c.avg_cpa <= 150 ? '#D97706' : '#DC2626';
              const cplLabel = c.avg_cpa <= 0 ? 'Sem dados' : c.avg_cpa <= 60 ? '✅ Ótimo' : c.avg_cpa <= 150 ? '⚠️ Aceitável' : '❌ Alto';
              const ctrColor = c.avg_ctr <= 0 ? FG_SUBTLE : c.avg_ctr >= 2.5 ? '#2F7D4F' : c.avg_ctr >= 1 ? '#D97706' : '#DC2626';
              const ctrLabel = c.avg_ctr <= 0 ? 'Sem dados' : c.avg_ctr >= 2.5 ? '✅ Excelente' : c.avg_ctr >= 1 ? '⚠️ Aceitável' : '❌ Baixo';
              const badge = STATUS_BADGE[c.status] || STATUS_BADGE.draft;
              const healthScore = [
                c.avg_cpa > 0 && c.avg_cpa <= 60 ? 40 : c.avg_cpa > 0 && c.avg_cpa <= 150 ? 25 : c.avg_cpa > 0 ? 0 : 20,
                c.avg_ctr >= 2.5 ? 30 : c.avg_ctr >= 1 ? 20 : c.avg_ctr > 0 ? 5 : 15,
                c.avg_cpc > 0 && c.avg_cpc <= 5 ? 30 : c.avg_cpc > 0 && c.avg_cpc <= 15 ? 20 : c.avg_cpc > 0 ? 5 : 15,
              ].reduce((a, b) => a + b, 0);
              const healthColor = healthScore >= 70 ? '#2F7D4F' : healthScore >= 45 ? '#D97706' : '#DC2626';
              const healthEmoji = healthScore >= 70 ? '🟢' : healthScore >= 45 ? '🟡' : '🔴';
              return (
                <div key={c.id} style={{ background: BG_SUBTLE, border: `1px solid ${healthColor}20`, borderRadius: '14px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: FG, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', color: badge.color, background: badge.bg }}>{badge.label}</span>
                        <span style={{ fontSize: '10px', color: FG_SUBTLE }}>{PLATFORM_LABEL[c.platform] || c.platform}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '10px' }}>
                      <p style={{ fontSize: '20px', fontWeight: 800, color: healthColor, lineHeight: 1 }}>{healthScore}</p>
                      <p style={{ fontSize: '9px', color: FG_SUBTLE }}>saúde/100</p>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ padding: '8px 10px', borderRadius: '8px', background: `${cplColor}08`, border: `1px solid ${cplColor}18` }}>
                      <p style={{ fontSize: '10px', color: FG_MUTED, marginBottom: '2px' }}>Custo por Lead (CPL)</p>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: cplColor }}>{c.avg_cpa > 0 ? `R$ ${Number(c.avg_cpa).toFixed(0)}` : '—'}</p>
                      <p style={{ fontSize: '10px', color: cplColor }}>{cplLabel}</p>
                    </div>
                    <div style={{ padding: '8px 10px', borderRadius: '8px', background: `${ctrColor}08`, border: `1px solid ${ctrColor}18` }}>
                      <p style={{ fontSize: '10px', color: FG_MUTED, marginBottom: '2px' }}>Taxa de Cliques (CTR)</p>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: ctrColor }}>{c.avg_ctr > 0 ? `${Number(c.avg_ctr).toFixed(2)}%` : '—'}</p>
                      <p style={{ fontSize: '10px', color: ctrColor }}>{ctrLabel}</p>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '10px' }}>
                    <div style={{ textAlign: 'center', padding: '6px', borderRadius: '6px', background: BG_CARD, border: `1px solid ${BORDER}` }}>
                      <p style={{ fontSize: '10px', color: FG_SUBTLE, marginBottom: '1px' }}>Investido</p>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: FG }}>R$ {Number(c.total_spend).toLocaleString('pt-BR')}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '6px', borderRadius: '6px', background: BG_CARD, border: `1px solid ${BORDER}` }}>
                      <p style={{ fontSize: '10px', color: FG_SUBTLE, marginBottom: '1px' }}>Leads</p>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#2F7D4F' }}>{Number(c.total_leads)}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '6px', borderRadius: '6px', background: BG_CARD, border: `1px solid ${BORDER}` }}>
                      <p style={{ fontSize: '10px', color: FG_SUBTLE, marginBottom: '1px' }}>ROAS</p>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: c.avg_roas >= 3 ? '#2F7D4F' : c.avg_roas >= 2 ? '#D97706' : FG_SUBTLE }}>{c.avg_roas > 0 ? `${Number(c.avg_roas).toFixed(1)}x` : '—'}</p>
                    </div>
                  </div>
                  <div style={{ marginTop: '10px', padding: '8px 10px', borderRadius: '8px', background: BG_CARD, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${healthColor}` }}>
                    <p style={{ fontSize: '11px', color: FG_MUTED, lineHeight: 1.5 }}>
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
                    style={{
                      marginTop: '10px', width: '100%', padding: '7px', borderRadius: '8px',
                      border: `1px solid ${BORDER}`,
                      background: expandedCampaignId === c.id ? 'rgba(47,125,79,0.06)' : BG_CARD,
                      color: expandedCampaignId === c.id ? GREEN : FG_MUTED,
                      fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                  >
                    {loadingDeepId === c.id ? '⟳ Carregando...' : expandedCampaignId === c.id ? '▲ Ocultar detalhes' : '▼ Conjuntos e anúncios'}
                  </button>

                  {expandedCampaignId === c.id && campaignDeepCache[c.id] && (() => {
                    const deep = campaignDeepCache[c.id];
                    return (
                      <div style={{ marginTop: '10px', borderTop: `1px solid ${BORDER}`, paddingTop: '10px' }}>
                        {deep.adSets?.length > 0 && (
                          <div style={{ marginBottom: '10px' }}>
                            <p style={{ fontSize: '10px', fontWeight: 700, color: FG_SUBTLE, marginBottom: '6px', letterSpacing: '0.05em' }}>CONJUNTOS ({deep.adSets.length})</p>
                            {deep.adSets.map((as: any) => {
                              const asColor = as.score >= 75 ? '#2F7D4F' : as.score >= 50 ? '#D97706' : '#DC2626';
                              const statusDot = as.status === 'active' ? '🟢' : as.status === 'paused' ? '⏸' : '⭕';
                              const isActive = as.status === 'active';
                              return (
                                <div key={as.id} style={{ padding: '8px 10px', borderRadius: '8px', background: BG_CARD, border: `1px solid ${asColor}18`, marginBottom: '4px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isActive ? '5px' : 0 }}>
                                    <p style={{ fontSize: '11px', fontWeight: 600, color: isActive ? FG : FG_SUBTLE, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '6px' }}>{statusDot} {as.name}</p>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                                      <span style={{ fontSize: '9px', fontWeight: 700, color: as.action?.color, background: as.action?.bg, padding: '1px 6px', borderRadius: '6px' }}>{as.action?.label}</span>
                                      <span style={{ fontSize: '12px', fontWeight: 800, color: asColor }}>{as.score}</span>
                                    </div>
                                  </div>
                                  {isActive && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px' }}>
                                      {[
                                        { lbl: 'CPL', val: Number(as.cpa) > 0 ? `R$${Number(as.cpa).toFixed(0)}` : '—', color: Number(as.cpa) <= 60 ? '#2F7D4F' : Number(as.cpa) <= 150 ? '#D97706' : '#DC2626' },
                                        { lbl: 'CTR', val: Number(as.ctr) > 0 ? `${Number(as.ctr).toFixed(1)}%` : '—', color: Number(as.ctr) >= 2.5 ? '#2F7D4F' : Number(as.ctr) >= 1 ? '#D97706' : '#DC2626' },
                                        { lbl: 'Leads', val: String(as.leads), color: FG },
                                        { lbl: 'Gasto', val: `R$${Number(as.spend).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, color: FG },
                                      ].map(({ lbl, val, color }) => (
                                        <div key={lbl} style={{ textAlign: 'center', padding: '3px', borderRadius: '5px', background: BG_SUBTLE }}>
                                          <p style={{ fontSize: '8px', color: FG_SUBTLE, marginBottom: '1px' }}>{lbl}</p>
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
                            <p style={{ fontSize: '10px', fontWeight: 700, color: FG_SUBTLE, marginBottom: '6px', letterSpacing: '0.05em' }}>ANÚNCIOS ({deep.ads.length})</p>
                            {deep.ads.map((ad: any) => {
                              const adColor = ad.score >= 75 ? '#2F7D4F' : ad.score >= 50 ? '#D97706' : '#DC2626';
                              const statusDot = ad.status === 'active' ? '🟢' : ad.status === 'paused' ? '⏸' : '⭕';
                              const isActive = ad.status === 'active';
                              return (
                                <div key={ad.id} style={{ padding: '7px 9px', borderRadius: '7px', background: BG_CARD, border: `1px solid ${BORDER}`, marginBottom: '3px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <p style={{ fontSize: '10px', fontWeight: 600, color: isActive ? FG : FG_SUBTLE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{statusDot} {ad.name}</p>
                                      <p style={{ fontSize: '9px', color: FG_SUBTLE }}>{ad.ad_set_name}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                                      <span style={{ fontSize: '9px', fontWeight: 700, color: ad.action?.color, background: ad.action?.bg, padding: '1px 5px', borderRadius: '5px' }}>{ad.action?.label}</span>
                                      <span style={{ fontSize: '11px', fontWeight: 800, color: adColor }}>{ad.score}</span>
                                    </div>
                                  </div>
                                  {isActive && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2px', marginTop: '4px' }}>
                                      {[
                                        { lbl: 'CPL', val: Number(ad.cpa) > 0 ? `R$${Number(ad.cpa).toFixed(0)}` : '—', color: Number(ad.cpa) <= 60 ? '#2F7D4F' : Number(ad.cpa) <= 150 ? '#D97706' : '#DC2626' },
                                        { lbl: 'CTR', val: Number(ad.ctr) > 0 ? `${Number(ad.ctr).toFixed(1)}%` : '—', color: Number(ad.ctr) >= 2.5 ? '#2F7D4F' : Number(ad.ctr) >= 1 ? '#D97706' : '#DC2626' },
                                        { lbl: 'Leads', val: String(ad.leads), color: '#2F7D4F' },
                                        { lbl: 'Gasto', val: `R$${Number(ad.spend).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, color: FG },
                                      ].map(({ lbl, val, color }) => (
                                        <div key={lbl} style={{ textAlign: 'center', padding: '2px', borderRadius: '4px', background: BG_SUBTLE }}>
                                          <p style={{ fontSize: '8px', color: FG_SUBTLE, marginBottom: '1px' }}>{lbl}</p>
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
                          <p style={{ fontSize: '11px', color: FG_SUBTLE, textAlign: 'center', padding: '8px' }}>Nenhum conjunto/anúncio sincronizado.</p>
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

      {/* Period highlights */}
      <div style={{
        background: BG_CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: '16px',
        padding: '22px 24px',
        boxShadow: SHADOW,
      }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: FG, marginBottom: '4px' }}>Destaques do Período</p>
        <p style={{ fontSize: '11px', color: FG_MUTED, marginBottom: '20px' }}>Análise automática dos dados do período selecionado.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }} className="grid-insights">
          {[
            { icon: TrendingDown, color: '#2F7D4F', title: 'Melhor dia (mais leads)', value: bestDay ? bestDay.day : '—', desc: bestDay ? `${bestDay.leads} leads gerados` : 'Sem dados no período' },
            { icon: TrendingUp, color: '#D97706', title: 'Dia mais caro (CPL alto)', value: worstDay ? worstDay.day : '—', desc: worstDay?.cpa ? `Custo por Lead: R$ ${Number(worstDay.cpa).toFixed(0)}` : '—' },
            { icon: DollarSign, color: '#2563EB', title: 'Total investido no período', value: `R$ ${totalWeekSpend.toLocaleString('pt-BR')}`, desc: 'Soma de todas as campanhas' },
            { icon: MousePointerClick, color: GREEN, title: 'Taxa de Cliques média (CTR)', value: avgWeekCTR > 0 ? `${avgWeekCTR.toFixed(2)}%` : '—', desc: avgWeekCTR >= 2.5 ? '✅ Excelente — acima de 2,5%' : avgWeekCTR >= 1 ? '⚠️ Aceitável — acima de 1%' : avgWeekCTR > 0 ? '❌ Baixo — revise os criativos' : 'Sincronize para ver' },
          ].map(({ icon: Icon, color, title, value, desc }) => (
            <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', borderRadius: '12px', background: BG_SUBTLE, border: `1px solid ${BORDER}` }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: `${color}12` }}>
                <Icon size={16} color={color} />
              </div>
              <div>
                <p style={{ fontSize: '11px', color: FG_MUTED, marginBottom: '2px' }}>{title}</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: FG, lineHeight: 1.2 }}>{value}</p>
                <p style={{ fontSize: '11px', color: FG_SUBTLE, marginTop: '2px' }}>{desc}</p>
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
