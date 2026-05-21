import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Users, DollarSign, Zap, Plus, Target, RefreshCw,
  AlertTriangle, CheckCircle, ArrowRight, PauseCircle, Brain,
  MousePointer2, Activity, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { campaignsApi, metricsApi, syncApi, analyzeApi } from '../lib/api';
import { DateRangePicker, DateRange, defaultRange } from '../components/DateRangePicker';

// ── Quiet Dark Intelligence design tokens ─────────────────────────────────────
const BG = '#090909';
const BG_SURFACE = '#0E0F12';
const BG_ELEVATED = '#13141A';
const BG_HOVER = 'rgba(255,255,255,0.03)';
const FG = '#F0F0F0';
const FG_MUTED = 'rgba(240,240,240,0.4)';
const FG_SUBTLE = 'rgba(240,240,240,0.18)';
const BORDER = 'rgba(255,255,255,0.04)';
const BORDER_MED = 'rgba(255,255,255,0.08)';
const S_BLUE = '#3DB8E8';
const S_YELLOW = '#FACC15';
const S_RED = '#F87171';
// backward-compat aliases
const NEON = S_BLUE;
const BLUE = S_BLUE;
const RED = S_RED;
const AMBER = S_YELLOW;
const GLOW = 'none';
const SHADOW = 'none';
const BG_CARD = BG_SURFACE;
const BG_SUBTLE = BG_ELEVATED;
const BORDER_ACTIVE = BORDER_MED;

// ── Types ───────────────────────────────────────────────────────────────────
interface Campaign {
  id: string; name: string; platform: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  avg_cpa: number; avg_ctr: number; avg_roas: number;
  total_spend: number; total_leads: number;
}
interface Analysis {
  score: number;
  status: 'saudavel' | 'atencao' | 'critico';
  issues: string[];
  actions: { priority: 'alta' | 'media' | 'baixa'; acao: string; motivo: string }[];
}
interface PausedCampaign {
  id: string; name: string; platform: string;
  avg_cpa: number; avg_roas: number; avg_ctr: number;
  total_spend: number; total_leads: number;
  score: number;
  verdict: 'reativar' | 'reativar_com_cautela' | 'manter_pausada';
  verdict_reason: string;
}

// ── Benchmark helpers ────────────────────────────────────────────────────────
function n(v: unknown) { return Number(v) || 0; }

function cplStatus(v: number) {
  if (v <= 0) return { label: '—', color: FG_SUBTLE };
  if (v <= 60) return { label: 'Excelente', color: NEON };
  if (v <= 150) return { label: 'Aceitável', color: AMBER };
  return { label: 'Alto', color: RED };
}
function ctrStatus(v: number) {
  if (v <= 0) return { label: '—', color: FG_SUBTLE };
  if (v >= 2.5) return { label: 'Excelente', color: NEON };
  if (v >= 1) return { label: 'Aceitável', color: AMBER };
  return { label: 'Baixo', color: RED };
}
function roasStatus(v: number) {
  if (v <= 0) return { label: '—', color: FG_SUBTLE };
  if (v >= 3) return { label: 'Excelente', color: NEON };
  if (v >= 1.5) return { label: 'Aceitável', color: AMBER };
  return { label: 'Baixo', color: RED };
}
function healthDot(cpa: number, ctr: number) {
  if (cpa <= 0 && ctr <= 0) return { dot: '⚪', label: 'Sem dados', color: FG_SUBTLE };
  if ((cpa > 0 && cpa <= 60) && ctr >= 1) return { dot: '🟢', label: 'Saudável', color: NEON };
  if (cpa > 0 && cpa <= 150) return { dot: '🟡', label: 'Atenção', color: AMBER };
  if (ctr >= 1) return { dot: '🟡', label: 'Atenção', color: AMBER };
  return { dot: '🔴', label: 'Crítico', color: RED };
}

const PRIORITY: Record<string, { label: string; color: string; bg: string }> = {
  alta:  { label: 'URGENTE', color: S_RED,    bg: 'transparent' },
  media: { label: 'ALTA',    color: S_YELLOW, bg: 'transparent' },
  baixa: { label: 'MÉDIA',   color: S_BLUE,  bg: 'transparent' },
};
const VERDICT: Record<string, { label: string; color: string; bg: string }> = {
  reativar:             { label: 'Reativar',           color: S_BLUE,  bg: 'transparent' },
  reativar_com_cautela: { label: 'Revisar e Reativar', color: S_YELLOW, bg: 'transparent' },
  manter_pausada:       { label: 'Manter Pausada',     color: S_RED,    bg: 'transparent' },
};
const PLATFORM: Record<string, string> = { meta: 'Meta', google: 'Google', linkedin: 'LinkedIn' };
const STATUS_CHIP: Record<string, { label: string; color: string }> = {
  active:    { label: 'Ativa',      color: S_BLUE },
  paused:    { label: 'Pausada',    color: S_YELLOW },
  draft:     { label: 'Rascunho',   color: FG_MUTED },
  completed: { label: 'Concluída',  color: S_BLUE },
};

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, abbr, value, sub, subColor, icon: Icon, iconColor,
}: {
  label: string; abbr?: string; value: string;
  sub: string; subColor: string;
  icon: React.ElementType; iconColor: string;
}) {
  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={FG_MUTED} />
        </div>
        <span style={{ fontSize: '10px', fontWeight: 600, color: subColor }}>{sub}</span>
      </div>
      <div>
        <p style={{ fontSize: '26px', fontWeight: 800, color: FG, lineHeight: 1, marginBottom: '4px' }}>{value}</p>
        <p style={{ fontSize: '12px', color: FG_MUTED, fontWeight: 500 }}>
          {label}{abbr ? <span style={{ color: FG_SUBTLE, marginLeft: '4px' }}>— {abbr}</span> : null}
        </p>
      </div>
    </div>
  );
}

// ── Custom chart tooltip ──────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0E0F12', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 14px', fontSize: '11px', color: FG }}>
      <p style={{ color: FG_MUTED, marginBottom: '6px' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, fontWeight: 700 }}>
          {p.name === 'leads' ? 'Leads: ' : 'Gasto: R$ '}{p.value}
        </p>
      ))}
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [range, setRange] = useState<DateRange>(defaultRange());
  const [summary, setSummary] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [weekly, setWeekly] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [pausedCampaigns, setPausedCampaigns] = useState<PausedCampaign[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [lastSync, setLastSync] = useState<{ at: string | null; status: string | null }>({ at: null, status: null });
  const [showPaused, setShowPaused] = useState(false);
  const [chartMetric, setChartMetric] = useState<'leads' | 'spend'>('leads');

  const load = useCallback(async (r: DateRange) => {
    try {
      const [metricsRes, campaignsRes, syncStatusRes] = await Promise.all([
        metricsApi.dashboard(r.from, r.to).catch(() => null),
        campaignsApi.list(r.from, r.to).catch(() => ({ campaigns: [] })),
        syncApi.status().catch(() => null),
      ]);
      setSummary(metricsRes?.data?.summary || {});
      setWeekly(metricsRes?.data?.weekly || []);
      setCampaigns(campaignsRes?.data?.campaigns || []);

      const metaInt = (syncStatusRes?.data?.integrations || []).find((i: any) => i.platform === 'meta');
      if (metaInt) setLastSync({ at: metaInt.last_sync_at, status: metaInt.last_sync_status });

      const [analysisRes, pausedRes] = await Promise.all([
        analyzeApi.dashboard().catch(() => null),
        analyzeApi.paused().catch(() => null),
      ]);
      if (analysisRes?.data) setAnalysis(analysisRes.data);
      if (pausedRes?.data?.paused) setPausedCampaigns(pausedRes.data.paused);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(range); }, [range]); // eslint-disable-line

  async function handleSync() {
    setSyncing(true); setSyncMsg('');
    try {
      const res = await syncApi.meta();
      setSyncMsg(res.data?.message || 'Sincronizado!');
      await load(range);
    } catch (err: any) {
      setSyncMsg(err.response?.data?.error?.message || 'Erro ao sincronizar.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 5000);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: BG }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.08)', borderTop: '2px solid rgba(240,240,240,0.5)', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const sp  = n(summary?.spend);
  const lds = n(summary?.leads);
  const cpl = n(summary?.cpa);
  const roas = n(summary?.roas);
  const avgCtr = campaigns.filter(c => c.avg_ctr > 0).reduce((a, c, _, arr) => a + n(c.avg_ctr) / arr.length, 0);

  const scoreColor = !analysis ? FG_SUBTLE : analysis.score >= 75 ? NEON : analysis.score >= 50 ? AMBER : RED;
  const scoreLabel = !analysis ? '—' : analysis.score >= 75 ? 'Saudável' : analysis.score >= 50 ? 'Atenção' : 'Crítico';
  const radius = 38; const circ = 2 * Math.PI * radius;
  const arc = analysis ? (analysis.score / 100) * circ : 0;

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '28px 32px' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .row-hover:hover{background:rgba(255,255,255,0.03)!important}
        @media (max-width: 768px) {
          .dash-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-main-grid { grid-template-columns: 1fr !important; }
          .dash-score-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .dash-kpi-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: FG, letterSpacing: '-0.02em' }}>Dashboard</h1>
          <p style={{ fontSize: '12px', color: FG_MUTED, marginTop: '2px' }}>
            {activeCampaigns.length} campanha{activeCampaigns.length !== 1 ? 's' : ''} ativa{activeCampaigns.length !== 1 ? 's' : ''}
            {pausedCampaigns.length > 0 && <span style={{ color: AMBER }}> · {pausedCampaigns.length} pausada{pausedCampaigns.length !== 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <DateRangePicker value={range} onChange={setRange} />
          {syncMsg && (
            <span style={{ fontSize: '11px', color: syncMsg.includes('Erro') ? S_RED : FG, padding: '5px 10px', borderRadius: '8px', background: 'transparent', fontWeight: 600 }}>
              {syncMsg}
            </span>
          )}
          <button onClick={handleSync} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '10px', border: `1px solid ${BORDER_MED}`, background: 'rgba(255,255,255,0.08)', color: FG, fontSize: '12px', fontWeight: 600, cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.6 : 1, fontFamily: 'inherit' }}>
            <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Sincronizando…' : 'Sincronizar'}
          </button>
          <button onClick={() => navigate('/wizard')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '10px', border: `1px solid ${BORDER_MED}`, background: 'rgba(255,255,255,0.08)', color: FG, fontSize: '12px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={13} /> Nova Campanha
          </button>
        </div>
      </div>

      {/* ── Sync status ────────────────────────────────────────────────────── */}
      {lastSync.status === 'error' && (
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: BG_SURFACE, border: `1px solid ${BORDER_MED}` }}>
          <AlertTriangle size={14} color={S_RED} />
          <span style={{ fontSize: '12px', color: S_RED, fontWeight: 600 }}>Última sincronização falhou</span>
          <span style={{ fontSize: '11px', color: FG_MUTED }}>— Token Meta expirado. Renove em{' '}<span onClick={() => navigate('/settings')} style={{ color: FG, cursor: 'pointer', textDecoration: 'underline' }}>Configurações</span>.</span>
          {lastSync.at && <span style={{ marginLeft: 'auto', fontSize: '10px', color: FG_SUBTLE }}>{new Date(lastSync.at).toLocaleString('pt-BR')}</span>}
        </div>
      )}
      {lastSync.status === 'success' && lastSync.at && (
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', background: BG_SURFACE, border: `1px solid ${BORDER}` }}>
          <CheckCircle size={12} color={S_BLUE} />
          <span style={{ fontSize: '11px', color: FG_MUTED }}>
            Sincronizado em <strong style={{ color: FG }}>{new Date(lastSync.at).toLocaleString('pt-BR')}</strong>
          </span>
        </div>
      )}
      {!lastSync.status && (
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', background: BG_SURFACE, border: `1px solid ${BORDER}` }}>
          <AlertTriangle size={12} color={S_YELLOW} />
          <span style={{ fontSize: '11px', color: FG_MUTED }}>
            Meta Ads não sincronizado. Configure em{' '}<span onClick={() => navigate('/settings')} style={{ color: FG, cursor: 'pointer', textDecoration: 'underline' }}>Configurações</span>.
          </span>
        </div>
      )}

      {/* ── KPI Row ────────────────────────────────────────────────────────── */}
      <div className="dash-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <KpiCard label="Total Investido" value={sp > 0 ? `R$ ${sp.toLocaleString('pt-BR')}` : '--'} sub="no período" subColor={FG_SUBTLE} icon={DollarSign} iconColor={BLUE} />
        <KpiCard label="Leads Gerados" value={lds > 0 ? lds.toLocaleString('pt-BR') : '--'} sub={lds > 0 ? 'contatos' : 'sem dados'} subColor={lds > 0 ? NEON : FG_SUBTLE} icon={Users} iconColor={NEON} />
        <KpiCard label="Custo por Lead" abbr="CPL" value={cpl > 0 ? `R$ ${cpl.toFixed(0)}` : '--'} sub={cplStatus(cpl).label} subColor={cplStatus(cpl).color} icon={Target} iconColor={AMBER} />
        <KpiCard label="Taxa de Cliques" abbr="CTR" value={avgCtr > 0 ? `${avgCtr.toFixed(2)}%` : '--'} sub={ctrStatus(avgCtr).label} subColor={ctrStatus(avgCtr).color} icon={MousePointer2} iconColor={BLUE} />
        <KpiCard label="Retorno s/ Gasto" abbr="ROAS" value={roas > 0 ? `${roas.toFixed(1)}x` : '--'} sub={roasStatus(roas).label} subColor={roasStatus(roas).color} icon={Zap} iconColor={NEON} />
      </div>

      {/* ── Main Grid ──────────────────────────────────────────────────────── */}
      <div className="dash-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', alignItems: 'start' }}>

        {/* ── Left column ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Chart card */}
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px 24px', boxShadow: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: FG }}>Evolução no Período</p>
                <p style={{ fontSize: '11px', color: FG_SUBTLE, marginTop: '2px' }}>
                  {range.from.split('-').reverse().join('/')} → {range.to.split('-').reverse().join('/')}
                </p>
              </div>
              {/* Toggle leads/spend */}
              <div style={{ display: 'flex', gap: '4px', background: BG_SUBTLE, borderRadius: '8px', padding: '3px' }}>
                {(['leads', 'spend'] as const).map(m => (
                  <button key={m} onClick={() => setChartMetric(m)} style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: chartMetric === m ? 'rgba(255,255,255,0.08)' : 'transparent', color: chartMetric === m ? FG : FG_MUTED, transition: 'all 0.15s' }}>
                    {m === 'leads' ? 'Leads' : 'Investimento'}
                  </button>
                ))}
              </div>
            </div>
            {weekly.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={weekly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.08)" stopOpacity={1} />
                      <stop offset="100%" stopColor="rgba(255,255,255,0)" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day" stroke="transparent" tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<ChartTip />} />
                  <Area
                    type="monotone"
                    dataKey={chartMetric}
                    stroke={chartMetric === 'leads' ? S_BLUE : S_BLUE}
                    strokeWidth={2}
                    fill="url(#grad)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
                <Activity size={24} color={BORDER} />
                <p style={{ fontSize: '12px', color: FG_SUBTLE }}>Gráfico aparece após sincronizar o Meta Ads</p>
              </div>
            )}
          </div>

          {/* Campaign table */}
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', overflow: 'hidden', boxShadow: 'none' }}>
            <div style={{ overflowX: 'auto' }}>
            {/* Table header */}
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, display: 'grid', gridTemplateColumns: '24px 1fr 70px 80px 70px 70px 70px', gap: '0 12px', alignItems: 'center', minWidth: '560px' }}>
              <span />
              <span style={{ fontSize: '10px', fontWeight: 700, color: FG_SUBTLE, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Campanha</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: FG_SUBTLE, textAlign: 'right', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Gasto</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: FG_SUBTLE, textAlign: 'right', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Leads</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: FG_SUBTLE, textAlign: 'right', letterSpacing: '0.06em', textTransform: 'uppercase' }}>CPL</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: FG_SUBTLE, textAlign: 'right', letterSpacing: '0.06em', textTransform: 'uppercase' }}>CTR</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: FG_SUBTLE, textAlign: 'right', letterSpacing: '0.06em', textTransform: 'uppercase' }}>ROAS</span>
            </div>

            {campaigns.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <p style={{ color: FG_MUTED, fontSize: '13px', marginBottom: '12px' }}>Nenhuma campanha ainda.</p>
                <button onClick={() => navigate('/wizard')} style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${BORDER_MED}`, color: FG, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Criar campanha</button>
              </div>
            ) : (
              campaigns.map((c) => {
                const h = healthDot(n(c.avg_cpa), n(c.avg_ctr));
                const sc = STATUS_CHIP[c.status] || STATUS_CHIP.draft;
                const cpaV = n(c.avg_cpa); const ctrV = n(c.avg_ctr); const roasV = n(c.avg_roas);
                return (
                  <div key={c.id} className="row-hover" onClick={() => navigate('/campanhas')} style={{ padding: '13px 20px', borderBottom: `1px solid ${BORDER}`, display: 'grid', gridTemplateColumns: '24px 1fr 70px 80px 70px 70px 70px', gap: '0 12px', alignItems: 'center', cursor: 'pointer', transition: 'background 0.12s', background: BG_CARD }}>
                    <span title={h.label} style={{ fontSize: '14px' }}>{h.dot}</span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>{c.name}</p>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: sc.color }}>{sc.label}</span>
                        <span style={{ fontSize: '10px', color: FG_SUBTLE }}>{PLATFORM[c.platform] || c.platform}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: FG, textAlign: 'right' }}>
                      {n(c.total_spend) > 0 ? `R$${n(c.total_spend).toLocaleString('pt-BR')}` : '—'}
                    </p>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: n(c.total_leads) > 0 ? FG : FG_SUBTLE, textAlign: 'right' }}>
                      {n(c.total_leads) > 0 ? n(c.total_leads) : '—'}
                    </p>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: cplStatus(cpaV).color, textAlign: 'right' }}>
                      {cpaV > 0 ? `R$${cpaV.toFixed(0)}` : '—'}
                    </p>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: ctrStatus(ctrV).color, textAlign: 'right' }}>
                      {ctrV > 0 ? `${ctrV.toFixed(1)}%` : '—'}
                    </p>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: roasStatus(roasV).color, textAlign: 'right' }}>
                      {roasV > 0 ? `${roasV.toFixed(1)}x` : '—'}
                    </p>
                  </div>
                );
              })
            )}

            </div>{/* end overflowX wrapper */}

            {/* Paused campaigns toggle */}
            {pausedCampaigns.length > 0 && (
              <div>
                <button onClick={() => setShowPaused(p => !p)} style={{ width: '100%', padding: '12px 20px', background: BG_SURFACE, border: 'none', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: '8px', color: FG_MUTED, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <PauseCircle size={14} />
                  {pausedCampaigns.length} campanha{pausedCampaigns.length !== 1 ? 's' : ''} pausada{pausedCampaigns.length !== 1 ? 's' : ''}
                  {showPaused ? <ChevronUp size={13} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={13} style={{ marginLeft: 'auto' }} />}
                </button>
                {showPaused && pausedCampaigns.map((c) => {
                  const vc = VERDICT[c.verdict]; const h = healthDot(n(c.avg_cpa), n(c.avg_ctr));
                  return (
                    <div key={c.id} style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, background: BG_SURFACE }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px' }}>{h.dot}</span>
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: FG, marginBottom: '2px' }}>{c.name}</p>
                            <p style={{ fontSize: '10px', color: FG_SUBTLE }}>{PLATFORM[c.platform] || c.platform}</p>
                          </div>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', color: vc.color, background: vc.bg, flexShrink: 0 }}>{vc.label}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        {n(c.avg_cpa) > 0 && <span style={{ fontSize: '11px', color: FG_MUTED }}>CPL <strong style={{ color: cplStatus(n(c.avg_cpa)).color }}>R${n(c.avg_cpa).toFixed(0)}</strong></span>}
                        {n(c.avg_roas) > 0 && <span style={{ fontSize: '11px', color: FG_MUTED }}>ROAS <strong style={{ color: roasStatus(n(c.avg_roas)).color }}>{n(c.avg_roas).toFixed(1)}x</strong></span>}
                        {n(c.total_leads) > 0 && <span style={{ fontSize: '11px', color: FG_MUTED }}>Leads <strong style={{ color: FG }}>{c.total_leads}</strong></span>}
                      </div>
                      <p style={{ fontSize: '11px', color: FG_MUTED, lineHeight: '1.5', borderLeft: `2px solid ${vc.color}40`, paddingLeft: '8px' }}>{c.verdict_reason}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* ── Period highlights ──────────────────────────────────────────── */}
          {campaigns.length > 0 && (() => {
            const actives = campaigns.filter(c => c.status === 'active' && n(c.avg_cpa) > 0);
            const bestCPL = actives.length > 0 ? [...actives].sort((a, b) => n(a.avg_cpa) - n(b.avg_cpa))[0] : null;
            const bestLeads = campaigns.length > 0 ? [...campaigns].sort((a, b) => n(b.total_leads) - n(a.total_leads))[0] : null;
            const dateFrom = new Date(range.from); const dateTo = new Date(range.to);
            const days = Math.max(1, Math.round((dateTo.getTime() - dateFrom.getTime()) / 86400000) + 1);
            const avgDailySpend = sp / days;
            return (
              <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '18px 20px', boxShadow: 'none' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: FG_SUBTLE, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '14px' }}>Destaques do Período</p>
                <div className="dash-score-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div style={{ padding: '12px 14px', borderRadius: '12px', background: BG_SUBTLE, border: `1px solid ${BORDER}` }}>
                    <p style={{ fontSize: '10px', color: FG_MUTED, marginBottom: '6px', fontWeight: 600 }}>Gasto médio/dia</p>
                    <p style={{ fontSize: '18px', fontWeight: 800, color: FG }}>{avgDailySpend > 0 ? `R$${avgDailySpend.toFixed(0)}` : '—'}</p>
                    <p style={{ fontSize: '10px', color: FG_SUBTLE, marginTop: '3px' }}>{days} dias no período</p>
                  </div>
                  <div style={{ padding: '12px 14px', borderRadius: '12px', background: BG_SUBTLE, border: `1px solid ${BORDER}` }}>
                    <p style={{ fontSize: '10px', color: FG_MUTED, marginBottom: '6px', fontWeight: 600 }}>Melhor CPL</p>
                    <p style={{ fontSize: '18px', fontWeight: 800, color: bestCPL ? cplStatus(n(bestCPL.avg_cpa)).color : FG_SUBTLE }}>
                      {bestCPL ? `R$${n(bestCPL.avg_cpa).toFixed(0)}` : '—'}
                    </p>
                    <p style={{ fontSize: '10px', color: FG_SUBTLE, marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bestCPL?.name ?? 'sem dados'}</p>
                  </div>
                  <div style={{ padding: '12px 14px', borderRadius: '12px', background: BG_SUBTLE, border: `1px solid ${BORDER}` }}>
                    <p style={{ fontSize: '10px', color: FG_MUTED, marginBottom: '6px', fontWeight: 600 }}>Mais leads</p>
                    <p style={{ fontSize: '18px', fontWeight: 800, color: FG }}>
                      {n(bestLeads?.total_leads) > 0 ? n(bestLeads!.total_leads) : '—'}
                    </p>
                    <p style={{ fontSize: '10px', color: FG_SUBTLE, marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bestLeads?.name ?? 'sem dados'}</p>
                  </div>
                </div>
                {analysis && analysis.actions.length > 0 && (
                  <div style={{ marginTop: '14px', padding: '10px 12px', borderRadius: '10px', background: BG_SUBTLE, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <Brain size={13} color={FG_MUTED} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <p style={{ fontSize: '12px', color: FG_MUTED, lineHeight: '1.55' }}>
                      <strong style={{ color: FG }}>IA: </strong>{analysis.actions[0].acao} — {analysis.actions[0].motivo}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* ── Right column ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Score card */}
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px', boxShadow: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Brain size={15} color={scoreColor} />
              <p style={{ fontSize: '13px', fontWeight: 700, color: FG }}>Saúde da Conta</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
              <div style={{ position: 'relative', width: '88px', height: '88px', flexShrink: 0 }}>
                <svg width="88" height="88" viewBox="0 0 88 88">
                  <circle cx="44" cy="44" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                  <circle cx="44" cy="44" r={radius} fill="none" stroke={scoreColor} strokeWidth="6"
                    strokeDasharray={`${arc} ${circ}`} strokeLinecap="round"
                    transform="rotate(-90 44 44)"
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '22px', fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{analysis?.score ?? '—'}</span>
                  <span style={{ fontSize: '9px', color: FG_SUBTLE }}>/ 100</span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, display: 'inline-block', marginBottom: '8px', color: scoreColor }}>
                  {scoreLabel.toUpperCase()}
                </span>
                <p style={{ fontSize: '12px', color: FG_MUTED, lineHeight: '1.55' }}>
                  {!analysis ? 'Sincronize o Meta Ads para obter o diagnóstico.' :
                    analysis.score >= 75 ? 'Campanhas dentro dos benchmarks B2B. Continue monitorando o CPL.' :
                    n(summary?.spend) > 0 && lds === 0 ? 'Gasto sem leads — verifique o formulário ou página de destino.' :
                    cpl > 150 ? 'CPL alto. Revise público-alvo, criativo e landing page.' :
                    cpl > 60 ? 'CPL pode melhorar — teste criativos e refine o público.' :
                    'Revise as ações abaixo para melhorar os resultados.'}
                </p>
              </div>
            </div>

            {analysis && analysis.actions.length > 0 && (
              <>
                <p style={{ fontSize: '10px', fontWeight: 700, color: FG_SUBTLE, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>Ações recomendadas</p>
                {analysis.actions.slice(0, 3).map((a, i) => {
                  const pc = PRIORITY[a.priority];
                  return (
                    <div key={i} style={{ padding: '10px 12px', borderRadius: '10px', marginBottom: '6px', background: `${pc.color}06`, border: `1px solid ${pc.color}18`, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '10px', color: pc.color, background: pc.bg, flexShrink: 0, marginTop: '1px', letterSpacing: '0.04em' }}>{pc.label}</span>
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: FG, marginBottom: '2px' }}>{a.acao}</p>
                        <p style={{ fontSize: '11px', color: FG_MUTED, lineHeight: '1.45' }}>{a.motivo}</p>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            <button onClick={() => navigate('/professor')} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px', background: 'none', border: 'none', color: FG_MUTED, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              Análise completa no Professor <ArrowRight size={12} />
            </button>
          </div>

          {/* Benchmark reference card */}
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '18px 20px', boxShadow: 'none' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: FG_MUTED, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>Referência B2B — Meta Ads</p>
            {[
              { abbr: 'CPL', label: 'Custo por Lead', zones: ['≤ R$60 Excelente', 'R$60–150 Aceitável', '> R$150 Alto'], colors: [NEON, AMBER, RED] },
              { abbr: 'CTR', label: 'Taxa de Cliques', zones: ['< 1% Baixo', '1–2.5% Aceitável', '> 2.5% Excelente'], colors: [RED, AMBER, NEON] },
              { abbr: 'CPC', label: 'Custo por Clique', zones: ['≤ R$5 Excelente', 'R$5–15 Aceitável', '> R$15 Alto'], colors: [NEON, AMBER, RED] },
              { abbr: 'ROAS', label: 'Retorno s/ Gasto', zones: ['< 1.5x Baixo', '1.5–3x Aceitável', '> 3x Excelente'], colors: [RED, AMBER, NEON] },
            ].map(({ abbr, label, zones, colors }) => (
              <div key={abbr} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '5px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: FG_MUTED }}>{abbr}</span>
                  <span style={{ fontSize: '10px', color: FG_MUTED }}>{label}</span>
                </div>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {zones.map((z, i) => (
                    <div key={i} style={{ flex: 1, background: `${colors[i]}10`, border: `1px solid ${colors[i]}25`, borderRadius: '4px', padding: '3px 5px', textAlign: 'center' }}>
                      <span style={{ fontSize: '9px', color: colors[i], fontWeight: 600, lineHeight: 1.3, display: 'block' }}>{z}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Problems / OK */}
          {analysis && analysis.issues.length > 0 && (
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '16px 18px', boxShadow: 'none' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: FG, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={13} color={AMBER} /> Pontos de atenção
              </p>
              {analysis.issues.map((issue, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '7px' }}>
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: AMBER, flexShrink: 0, marginTop: '5px' }} />
                  <p style={{ fontSize: '11px', color: FG_MUTED, lineHeight: '1.5' }}>{issue}</p>
                </div>
              ))}
            </div>
          )}
          {analysis && analysis.issues.length === 0 && (
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
              <CheckCircle size={22} color={S_BLUE} style={{ margin: '0 auto 6px' }} />
              <p style={{ fontSize: '12px', fontWeight: 600, color: FG, marginBottom: '3px' }}>Tudo saudável</p>
              <p style={{ fontSize: '11px', color: FG_MUTED }}>Métricas dentro do esperado para B2B.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
