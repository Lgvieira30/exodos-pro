import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, Cell, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { DollarSign, Users, Target, Zap, MousePointerClick, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { metricsApi, campaignsApi } from '../lib/api';
import { DateRangePicker, DateRange, defaultRange } from '../components/DateRangePicker';

const BG = '#090909';
const BG_CARD = '#0E0F12';
const BG_SUBTLE = '#13141A';
const S_GREEN = '#4ADE80';
const S_YELLOW = '#FACC15';
const S_RED = '#F87171';
const S_BLUE = '#60A5FA';
const NEON = S_GREEN;
const BLUE = S_BLUE;
const RED = S_RED;
const AMBER = S_YELLOW;
const FG = '#F0F0F0';
const FG_MUTED = 'rgba(240,240,240,0.4)';
const FG_SUBTLE = 'rgba(240,240,240,0.18)';
const BORDER = 'rgba(255,255,255,0.04)';
const BORDER_MED = 'rgba(255,255,255,0.08)';
const BORDER_ACTIVE = BORDER_MED;

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

const STATUS_DOT: Record<string, { label: string; color: string }> = {
  active:    { label: 'Ativa',     color: S_GREEN  },
  paused:    { label: 'Pausada',   color: S_YELLOW },
  draft:     { label: 'Rascunho',  color: FG_MUTED },
  completed: { label: 'Concluída', color: S_BLUE   },
};

const PLATFORM_LABEL: Record<string, string> = {
  meta: 'Meta Ads', google: 'Google Ads', linkedin: 'LinkedIn',
};

function KpiCard({ label, value, icon: Icon, iconColor, sub, subColor }: any) {
  return (
    <div style={{
      background: BG_CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: '12px',
      padding: '18px 20px',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '9px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.05)',
        }}>
          <Icon size={15} color={FG_SUBTLE} />
        </div>
        {sub && (
          <span style={{
            fontSize: '10px', fontWeight: 500,
            color: subColor || FG_SUBTLE,
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
      borderRadius: '12px',
      padding: '20px 22px',
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
    <div style={{ background: '#0E0F12', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 14px', fontSize: '11px', color: FG }}>
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

  const isFirstMount = React.useRef(true);
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; load(range, true); }
    else load(range, false);
  }, [range]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: BG }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.08)', borderTop: '2px solid rgba(240,240,240,0.5)', animation: 'spin 0.8s linear infinite' }} />
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
      iconColor: S_GREEN,
      sub: 'Contatos qualificados',
      subColor: undefined,
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
      iconColor: S_BLUE,
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
      iconColor: S_BLUE,
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
          <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: FG_MUTED, padding: '6px 14px', borderRadius: '8px', background: BG_SUBTLE, border: `1px solid ${BORDER_MED}` }}>
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
                  <stop offset="0%" stopColor="rgba(255,255,255,0.06)" stopOpacity={1} />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" stopOpacity={1} />
                </linearGradient>
                <linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.06)" stopOpacity={1} />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" stroke="transparent" tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0E0F12', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#F0F0F0', fontSize: '11px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', color: FG_MUTED, paddingTop: '10px' }} />
              <Area type="monotone" dataKey="spend" name="Gasto (R$)" stroke={BLUE} strokeWidth={2} fill="url(#gBlue)" dot={false} />
              <Area type="monotone" dataKey="leads" name="Leads" stroke={NEON} strokeWidth={2} fill="url(#gGreen)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Taxa de Cliques (CTR) e Custo por Clique (CPC) por Dia" desc="CTR (verde) = % que clicou. CPC (roxo) = preço de cada clique. CTR alto + CPC baixo = anúncio eficiente.">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weekly}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" stroke="transparent" tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={{ background: '#0E0F12', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#F0F0F0', fontSize: '11px' }} />
              <Line type="monotone" dataKey="ctr" name="CTR" stroke={NEON} strokeWidth={2} dot={{ fill: NEON, r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="cpc" name="CPC" stroke={S_BLUE} strokeWidth={2} dot={{ fill: S_BLUE, r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts — row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }} className="grid-charts">

        <ChartCard title="Custo por Lead (CPL) por Dia" desc="Verde = ótimo (abaixo de R$60) · Amarelo = aceitável (R$60–R$150) · Vermelho = alto (acima de R$150). Linhas tracejadas mostram os limites de benchmark.">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekly} barSize={26}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" stroke="transparent" tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0E0F12', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#F0F0F0', fontSize: '11px' }} />
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
                  <stop offset="0%" stopColor="rgba(255,255,255,0.06)" stopOpacity={1} />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" stopOpacity={1} />
                </linearGradient>
                <linearGradient id="gPurp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.06)" stopOpacity={1} />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" stroke="transparent" tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0E0F12', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#F0F0F0', fontSize: '11px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', color: FG_MUTED, paddingTop: '10px' }} />
              <Area type="monotone" dataKey="clicks" name="Cliques" stroke={NEON} strokeWidth={2} fill="url(#gCyan)" dot={false} />
              <Area type="monotone" dataKey="impressions" name="Impressões" stroke={S_BLUE} strokeWidth={2} fill="url(#gPurp)" dot={false} />
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
          padding: '0',
          marginBottom: '16px',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: FG, margin: 0 }}>Comparativo de Campanhas</p>
            <p style={{ fontSize: '11px', color: FG_MUTED, marginTop: '3px' }}>Performance por campanha no período selecionado</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Campanha', 'Status', 'Plataforma', 'Investimento', 'Leads', 'CPL', 'ROAS', 'CTR', 'CPC'].map((h) => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: h === 'Campanha' ? 'left' : 'right',
                      fontSize: '10px', fontWeight: 700, color: FG_SUBTLE,
                      letterSpacing: '0.05em', whiteSpace: 'nowrap',
                      textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => {
                  const badge = STATUS_DOT[c.status] || STATUS_DOT.draft;
                  const cpaVal = Number(c.avg_cpa);
                  const ctrVal = Number(c.avg_ctr);
                  const roasVal = Number(c.avg_roas);
                  const cpcVal = Number(c.avg_cpc);
                  const cpaColor = cpaVal <= 0 ? FG_SUBTLE : cpaVal <= 60 ? NEON : cpaVal <= 150 ? AMBER : RED;
                  const ctrColor = ctrVal <= 0 ? FG_SUBTLE : ctrVal >= 2.5 ? NEON : ctrVal >= 1 ? AMBER : RED;
                  const roasColor = roasVal <= 0 ? FG_SUBTLE : roasVal >= 3 ? NEON : roasVal >= 2 ? AMBER : RED;
                  return (
                    <tr key={c.id} style={{ borderBottom: i < campaigns.length - 1 ? `1px solid ${BORDER}` : 'none', transition: 'background 0.1s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = BG_SUBTLE)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', maxWidth: '200px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: FG_MUTED }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: badge.color, flexShrink: 0 }} />
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: FG_MUTED, whiteSpace: 'nowrap' }}>{PLATFORM_LABEL[c.platform] || c.platform}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: FG, fontWeight: 600 }}>
                        {c.total_spend > 0 ? `R$ ${Number(c.total_spend).toLocaleString('pt-BR')}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: FG, fontWeight: 700 }}>
                        {Number(c.total_leads) > 0 ? Number(c.total_leads) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: cpaColor, fontWeight: 600 }}>
                        {cpaVal > 0 ? `R$ ${cpaVal.toFixed(0)}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: roasColor, fontWeight: 600 }}>
                        {roasVal > 0 ? `${roasVal.toFixed(1)}x` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: ctrColor, fontWeight: 600 }}>
                        {ctrVal > 0 ? `${ctrVal.toFixed(2)}%` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: FG_MUTED }}>
                        {cpcVal > 0 ? `R$ ${cpcVal.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
