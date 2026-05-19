import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, Cell, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { DollarSign, Users, Target, Zap, MousePointerClick, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { metricsApi, campaignsApi, analyzeApi } from '../lib/api';
import { DateRangePicker, DateRange, defaultRange } from '../components/DateRangePicker';

const BG = '#080B14';
const BG_CARD = '#0D1117';
const BG_SUBTLE = '#111520';
const NEON = '#00FFB2';
const BLUE = '#00BFFF';
const FG = '#C9D1D9';
const FG_MUTED = 'rgba(201,209,217,0.55)';
const FG_SUBTLE = 'rgba(201,209,217,0.3)';
const BORDER = 'rgba(0,255,178,0.1)';
const BORDER_ACTIVE = 'rgba(0,255,178,0.25)';
const RED = '#FF3B5C';
const AMBER = '#FFB800';
const GLOW = '0 0 0 1px rgba(0,255,178,0.08), inset 0 1px 0 rgba(255,255,255,0.03)';

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
  active:    { label: 'Ativa',      color: NEON,  bg: 'rgba(0,255,178,0.08)' },
  paused:    { label: 'Pausada',    color: AMBER, bg: 'rgba(255,184,0,0.08)' },
  draft:     { label: 'Rascunho',   color: FG_MUTED, bg: 'rgba(201,209,217,0.06)' },
  completed: { label: 'Concluída',  color: BLUE,  bg: 'rgba(0,191,255,0.08)' },
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
      boxShadow: GLOW,
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
            background: subColor ? `${subColor}18` : BG_SUBTLE,
            border: `1px solid ${subColor ? subColor + '30' : BORDER}`,
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
      boxShadow: GLOW,
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
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER_ACTIVE}`, borderRadius: '8px', padding: '10px 14px', fontSize: '11px', color: FG }}>
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
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `3px solid ${NEON}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const totalImpressions = weekly.reduce((s, d) => s + d.impressions, 0);
  const totalClicks = weekly.reduce((s, d) => s + d.clicks, 0);
  const cpm = totalImpressions > 0 ? ((summary?.spend || 0) / totalImpressions) * 1000 : 0;
  const convRate = totalClicks > 0 ? ((summary?.leads || 0) / totalClicks) * 100 : 0;

  const kpis = [
    {
      label: 'Investimento Total',
      value: `R$ ${(summary?.spend || 0).toLocaleString('pt-BR')}`,
      icon: DollarSign,
      iconColor: BLUE,
      sub: 'Soma de todos os anúncios',
      subColor: undefined,
    },
    {
      label: 'Leads Gerados',
      value: (summary?.leads || 0).toLocaleString('pt-BR'),
      icon: Users,
      iconColor: NEON,
      sub: 'Contatos qualificados',
      subColor: NEON,
    },
    {
      label: 'Custo por Lead — CPL',
      value: summary?.cpa ? `R$ ${Number(summary.cpa).toFixed(2)}` : '—',
      icon: Target,
      iconColor: AMBER,
      sub: summary?.cpa
        ? (Number(summary.cpa) <= 60 ? '✅ Ótimo' : Number(summary.cpa) <= 150 ? '⚠️ Aceitável' : '❌ Alto')
        : 'Quanto você paga por lead',
      subColor: summary?.cpa
        ? (Number(summary.cpa) <= 60 ? NEON : Number(summary.cpa) <= 150 ? AMBER : RED)
        : undefined,
    },
    {
      label: 'Retorno sobre Gasto — ROAS',
      value: summary?.roas ? `${Number(summary.roas).toFixed(1)}x` : '—',
      icon: Zap,
      iconColor: '#A855F7',
      sub: summary?.roas
        ? (Number(summary.roas) >= 3 ? '✅ Ótimo' : Number(summary.roas) >= 2 ? '⚠️ Aceitável' : '❌ Baixo')
        : 'R$ de retorno por R$ gasto',
      subColor: summary?.roas
        ? (Number(summary.roas) >= 3 ? NEON : Number(summary.roas) >= 2 ? AMBER : RED)
        : undefined,
    },
    {
      label: 'Taxa de Cliques — CTR',
      value: summary?.ctr ? `${Number(summary.ctr).toFixed(2)}%` : '—',
      icon: MousePointerClick,
      iconColor: NEON,
      sub: summary?.ctr
        ? (Number(summary.ctr) >= 2.5 ? '✅ Excelente' : Number(summary.ctr) >= 1 ? '⚠️ Aceitável' : '❌ Baixo')
        : '% de quem viu e clicou',
      subColor: summary?.ctr
        ? (Number(summary.ctr) >= 2.5 ? NEON : Number(summary.ctr) >= 1 ? AMBER : RED)
        : undefined,
    },
    {
      label: 'Custo por Clique — CPC',
      value: summary?.cpc ? `R$ ${Number(summary.cpc).toFixed(2)}` : '—',
      icon: Eye,
      iconColor: BLUE,
      sub: summary?.cpc
        ? (Number(summary.cpc) <= 5 ? '✅ Bom' : Number(summary.cpc) <= 15 ? '⚠️ Médio' : '❌ Caro')
        : 'Preço de cada visita ao site',
      subColor: summary?.cpc
        ? (Number(summary.cpc) <= 5 ? NEON : Number(summary.cpc) <= 15 ? AMBER : RED)
        : undefined,
    },
    {
      label: 'CPM — Custo por Mil Imp.',
      value: cpm > 0 ? `R$ ${cpm.toFixed(2)}` : '—',
      icon: Eye,
      iconColor: '#BD00FF',
      sub: cpm > 0
        ? (cpm <= 15 ? '✅ Barato' : cpm <= 40 ? '⚠️ Médio' : '❌ Caro')
        : 'R$ por 1.000 exibições do anúncio',
      subColor: cpm > 0 ? (cpm <= 15 ? NEON : cpm <= 40 ? AMBER : RED) : undefined,
    },
    {
      label: 'Taxa de Conversão — CTL',
      value: convRate > 0 ? `${convRate.toFixed(1)}%` : '—',
      icon: Target,
      iconColor: NEON,
      sub: convRate > 0
        ? (convRate >= 5 ? '✅ Excelente' : convRate >= 2 ? '⚠️ Aceitável' : '❌ Baixo')
        : '% dos cliques que viraram leads',
      subColor: convRate > 0 ? (convRate >= 5 ? NEON : convRate >= 2 ? AMBER : RED) : undefined,
    },
    {
      label: 'Campanhas no Período',
      value: String(summary?.campaigns || campaigns.length || 0),
      icon: Zap,
      iconColor: BLUE,
      sub: campaigns.filter((c) => c.status === 'active').length > 0
        ? `${campaigns.filter((c) => c.status === 'active').length} ativas · ${campaigns.filter((c) => c.status === 'paused').length} pausadas`
        : 'Total de campanhas analisadas',
      subColor: undefined,
    },
  ];

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
          <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: AMBER, padding: '6px 14px', borderRadius: '8px', background: `${AMBER}0F`, border: `1px solid ${AMBER}33` }}>
            Nenhum dado para este período — sincronize o Meta Ads em Configurações para ver seus números reais.
          </div>
        )}
      </div>

      {/* KPIs — 9 cards in 3 rows of 3 */}
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
                  <stop offset="0%" stopColor={BLUE} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={NEON} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={NEON} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,178,0.04)" />
              <XAxis dataKey="day" stroke="transparent" tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: BG_CARD, border: `1px solid ${BORDER_ACTIVE}`, borderRadius: '8px', color: FG, fontSize: '11px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', color: FG_MUTED, paddingTop: '10px' }} />
              <Area type="monotone" dataKey="spend" name="Gasto (R$)" stroke={BLUE} strokeWidth={2} fill="url(#gBlue)" dot={false} />
              <Area type="monotone" dataKey="leads" name="Leads" stroke={NEON} strokeWidth={2} fill="url(#gGreen)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Taxa de Cliques (CTR) e Custo por Clique (CPC) por Dia" desc="CTR (verde) = % que clicou. CPC (roxo) = preço de cada clique. CTR alto + CPC baixo = anúncio eficiente.">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weekly}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,178,0.04)" />
              <XAxis dataKey="day" stroke="transparent" tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={{ background: BG_CARD, border: `1px solid ${BORDER_ACTIVE}`, borderRadius: '8px', color: FG, fontSize: '11px' }} />
              <Line type="monotone" dataKey="ctr" name="CTR" stroke={NEON} strokeWidth={2} dot={{ fill: NEON, r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="cpc" name="CPC" stroke="#A855F7" strokeWidth={2} dot={{ fill: '#A855F7', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts — row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }} className="grid-charts">

        <ChartCard title="Custo por Lead (CPL) por Dia" desc="Verde = ótimo (abaixo de R$60) · Amarelo = aceitável (R$60–R$150) · Vermelho = alto (acima de R$150). Linhas tracejadas mostram os limites de benchmark.">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekly} barSize={26}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,178,0.04)" />
              <XAxis dataKey="day" stroke="transparent" tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: BG_CARD, border: `1px solid ${BORDER_ACTIVE}`, borderRadius: '8px', color: FG, fontSize: '11px' }} />
              <ReferenceLine y={60} stroke={NEON} strokeDasharray="4 4" label={{ value: 'Bom R$60', fill: NEON, fontSize: 10, position: 'right' }} />
              <ReferenceLine y={150} stroke={RED} strokeDasharray="4 4" label={{ value: 'Alto R$150', fill: RED, fontSize: 10, position: 'right' }} />
              <Bar dataKey="cpa" name="Custo por Lead (R$)" radius={[6, 6, 0, 0]}>
                {weekly.map((entry, index) => (
                  <Cell key={`cpa-${index}`} fill={entry.cpa <= 60 ? NEON : entry.cpa <= 150 ? AMBER : RED} />
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
                  <stop offset="0%" stopColor={NEON} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={NEON} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPurp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A855F7" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#A855F7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,178,0.04)" />
              <XAxis dataKey="day" stroke="transparent" tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: BG_CARD, border: `1px solid ${BORDER_ACTIVE}`, borderRadius: '8px', color: FG, fontSize: '11px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', color: FG_MUTED, paddingTop: '10px' }} />
              <Area type="monotone" dataKey="clicks" name="Cliques" stroke={NEON} strokeWidth={2} fill="url(#gCyan)" dot={false} />
              <Area type="monotone" dataKey="impressions" name="Impressões" stroke="#A855F7" strokeWidth={2} fill="url(#gPurp)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Individual campaign analysis */}
      {campaigns.length > 0 && (
        <div style={{
          background: BG_CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: '16px',
          padding: '22px 24px',
          marginBottom: '16px',
          boxShadow: GLOW,
        }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: FG, marginBottom: '4px' }}>Análise Individual por Campanha</p>
          <p style={{ fontSize: '11px', color: FG_MUTED, marginBottom: '20px' }}>Cada campanha avaliada com semáforo de saúde baseado nos benchmarks B2B.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {campaigns.map((c) => {
              const cplColor = c.avg_cpa <= 0 ? FG_SUBTLE : c.avg_cpa <= 60 ? NEON : c.avg_cpa <= 150 ? AMBER : RED;
              const cplLabel = c.avg_cpa <= 0 ? 'Sem dados' : c.avg_cpa <= 60 ? '✅ Ótimo' : c.avg_cpa <= 150 ? '⚠️ Aceitável' : '❌ Alto';
              const ctrColor = c.avg_ctr <= 0 ? FG_SUBTLE : c.avg_ctr >= 2.5 ? NEON : c.avg_ctr >= 1 ? AMBER : RED;
              const ctrLabel = c.avg_ctr <= 0 ? 'Sem dados' : c.avg_ctr >= 2.5 ? '✅ Excelente' : c.avg_ctr >= 1 ? '⚠️ Aceitável' : '❌ Baixo';
              const badge = STATUS_BADGE[c.status] || STATUS_BADGE.draft;
              const healthScore = [
                c.avg_cpa > 0 && c.avg_cpa <= 60 ? 40 : c.avg_cpa > 0 && c.avg_cpa <= 150 ? 25 : c.avg_cpa > 0 ? 0 : 20,
                c.avg_ctr >= 2.5 ? 30 : c.avg_ctr >= 1 ? 20 : c.avg_ctr > 0 ? 5 : 15,
                c.avg_cpc > 0 && c.avg_cpc <= 5 ? 30 : c.avg_cpc > 0 && c.avg_cpc <= 15 ? 20 : c.avg_cpc > 0 ? 5 : 15,
              ].reduce((a, b) => a + b, 0);
              const healthColor = healthScore >= 70 ? NEON : healthScore >= 45 ? AMBER : RED;
              const healthEmoji = healthScore >= 70 ? '🟢' : healthScore >= 45 ? '🟡' : '🔴';
              return (
                <div key={c.id} style={{ background: BG_SUBTLE, border: `1px solid ${healthColor}25`, borderRadius: '14px', padding: '16px' }}>
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
                    <div style={{ padding: '8px 10px', borderRadius: '8px', background: `${cplColor}08`, border: `1px solid ${cplColor}25` }}>
                      <p style={{ fontSize: '10px', color: FG_MUTED, marginBottom: '2px' }}>Custo por Lead (CPL)</p>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: cplColor }}>{c.avg_cpa > 0 ? `R$ ${Number(c.avg_cpa).toFixed(0)}` : '—'}</p>
                      <p style={{ fontSize: '10px', color: cplColor }}>{cplLabel}</p>
                    </div>
                    <div style={{ padding: '8px 10px', borderRadius: '8px', background: `${ctrColor}08`, border: `1px solid ${ctrColor}25` }}>
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
                      <p style={{ fontSize: '12px', fontWeight: 700, color: NEON }}>{Number(c.total_leads)}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '6px', borderRadius: '6px', background: BG_CARD, border: `1px solid ${BORDER}` }}>
                      <p style={{ fontSize: '10px', color: FG_SUBTLE, marginBottom: '1px' }}>ROAS</p>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: c.avg_roas >= 3 ? NEON : c.avg_roas >= 2 ? AMBER : FG_SUBTLE }}>{c.avg_roas > 0 ? `${Number(c.avg_roas).toFixed(1)}x` : '—'}</p>
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
                      border: `1px solid ${expandedCampaignId === c.id ? BORDER_ACTIVE : BORDER}`,
                      background: expandedCampaignId === c.id ? `${NEON}0F` : BG_CARD,
                      color: expandedCampaignId === c.id ? NEON : FG_MUTED,
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
                              const asColor = as.score >= 75 ? NEON : as.score >= 50 ? AMBER : RED;
                              const statusDot = as.status === 'active' ? '🟢' : as.status === 'paused' ? '⏸' : '⭕';
                              const isActive = as.status === 'active';
                              return (
                                <div key={as.id} style={{ padding: '8px 10px', borderRadius: '8px', background: BG_CARD, border: `1px solid ${asColor}20`, marginBottom: '4px' }}>
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
                                        { lbl: 'CPL', val: Number(as.cpa) > 0 ? `R$${Number(as.cpa).toFixed(0)}` : '—', color: Number(as.cpa) <= 60 ? NEON : Number(as.cpa) <= 150 ? AMBER : RED },
                                        { lbl: 'CTR', val: Number(as.ctr) > 0 ? `${Number(as.ctr).toFixed(1)}%` : '—', color: Number(as.ctr) >= 2.5 ? NEON : Number(as.ctr) >= 1 ? AMBER : RED },
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
                              const adColor = ad.score >= 75 ? NEON : ad.score >= 50 ? AMBER : RED;
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
                                        { lbl: 'CPL', val: Number(ad.cpa) > 0 ? `R$${Number(ad.cpa).toFixed(0)}` : '—', color: Number(ad.cpa) <= 60 ? NEON : Number(ad.cpa) <= 150 ? AMBER : RED },
                                        { lbl: 'CTR', val: Number(ad.ctr) > 0 ? `${Number(ad.ctr).toFixed(1)}%` : '—', color: Number(ad.ctr) >= 2.5 ? NEON : Number(ad.ctr) >= 1 ? AMBER : RED },
                                        { lbl: 'Leads', val: String(ad.leads), color: NEON },
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .grid-kpis-analytics { grid-template-columns: repeat(2, 1fr) !important; }
          .grid-charts { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .grid-kpis-analytics { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
