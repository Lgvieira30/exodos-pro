import React, { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Info, ChevronRight, Zap, Target, DollarSign, BarChart3, Activity,
  PauseCircle, ChevronDown, Layers, CalendarDays, RefreshCw,
  ArrowUpRight, ArrowDownRight, Minus, Eye, MousePointerClick,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { metricsApi, analyzeApi, campaignsApi, aiApi } from '../lib/api';
import { DateRangePicker, DateRange, defaultRange } from '../components/DateRangePicker';

const CYAN = '#3DB8E8';
const TEAL = '#00B7B7';
const PRIORITY_COLOR: Record<string, string> = { alta: '#ef4444', media: '#f59e0b', baixa: '#10b981' };
const PLATFORM_LABEL: Record<string, string> = { meta: 'Meta Ads', google: 'Google Ads', linkedin: 'LinkedIn' };

// ─── Types ───────────────────────────────────────────────────────────────────

interface Campaign { id: string; name: string; platform: string; status: string; }
interface AdSetAction { label: string; color: string; bg: string; detail: string; }
interface AdSet {
  id: string; name: string; status: string;
  spend: number; impressions: number; clicks: number; leads: number;
  ctr: number; cpc: number; cpa: number; roas: number; daily_budget: number;
  score: number; action: AdSetAction;
}
interface DeepData {
  campaign: { id: string; name: string; platform: string };
  period: { from: string; to: string; days: number };
  summary: { spend: number; leads: number; clicks: number; impressions: number; conversions: number; cpa: number; roas: number; ctr: number; cpc: number };
  funnel: { impressions: number; ctr: number; clicks: number; clickToLeadRate: number; leads: number; conversions: number; revenueEst: number };
  daily: { date: string; label: string; spend: number; leads: number; ctr: number; cpa: number }[];
  adSets: AdSet[];
  analysis: { score: number; status: string; issues: string[]; actions: { priority: string; acao: string; motivo: string }[] };
  projection: { daysRemaining: number; projectedTotalSpend: number; projectedTotalLeads: number; projectedCpa: number };
}
interface SummaryCampaign {
  id: string; name: string; platform: string; status: string; score: number;
  total_spend: number; total_leads: number; avg_cpa: number; avg_roas: number; avg_ctr: number; avg_cpc: number;
  top_action: { priority: string; acao: string; motivo: string } | null;
}
interface SummaryData {
  period: { from: string; to: string; days: number; prev_from: string; prev_to: string };
  overview: { health_score: number; total_spend: number; total_leads: number; total_clicks: number; total_impressions: number; avg_cpa: number; avg_roas: number; avg_ctr: number; avg_cpc: number; active_campaigns: number };
  comparison: { spend_change: number | null; leads_change: number | null; cpa_change: number | null; roas_change: number | null };
  campaigns: SummaryCampaign[];
  top_actions: { priority: string; acao: string; motivo: string; campaign_name: string; campaign_id: string; score: number }[];
  projection: { days_remaining: number; projected_spend: number; projected_leads: number; projected_cpa: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatus(key: string, value: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (key === 'cpa') return value <= 30 ? 'excellent' : value <= 50 ? 'good' : value <= 80 ? 'warning' : 'critical';
  if (key === 'roas') return value >= 5 ? 'excellent' : value >= 3 ? 'good' : value >= 2 ? 'warning' : 'critical';
  if (key === 'ctr') return value >= 3 ? 'excellent' : value >= 1.5 ? 'good' : value >= 0.8 ? 'warning' : 'critical';
  if (key === 'cpc') return value <= 1 ? 'excellent' : value <= 2.5 ? 'good' : value <= 5 ? 'warning' : 'critical';
  if (key === 'roi') return value >= 300 ? 'excellent' : value >= 150 ? 'good' : value >= 50 ? 'warning' : 'critical';
  return 'good';
}

const STATUS_CONFIG = {
  excellent: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', label: 'Excelente', icon: CheckCircle },
  good:      { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.2)',  label: 'Bom',       icon: TrendingUp },
  warning:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', label: 'Atenção',   icon: AlertTriangle },
  critical:  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)',  label: 'Crítico',   icon: TrendingDown },
};

const VERDICT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  reativar:             { label: 'Reativar',          color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)' },
  reativar_com_cautela: { label: 'Revisar e Reativar', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)' },
  manter_pausada:       { label: 'Manter Pausada',    color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)' },
};

function fmt(d: Date) { return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }

// ─── Sub-components ───────────────────────────────────────────────────────────

function HealthGauge({ score, size = 130 }: { score: number; size?: number }) {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const label = score >= 75 ? 'Excelente' : score >= 50 ? 'Atenção' : 'Crítico';
  const r = size * 0.4;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={c} strokeDashoffset={c - (score / 100) * c}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: size * 0.215, fontWeight: 800, color: '#fff' }}>{score}</span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '-2px' }}>/ 100</span>
        </div>
      </div>
      <span style={{ fontSize: '12px', fontWeight: 600, color }}>{label}</span>
    </div>
  );
}

function TrendBadge({ value, inverted = false }: { value: number | null | undefined; inverted?: boolean }) {
  if (value === null || value === undefined) return <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>—</span>;
  const isGood = inverted ? value <= 0 : value >= 0;
  const color = isGood ? '#10b981' : '#ef4444';
  const bg = isGood ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
  const Arrow = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '11px', fontWeight: 700, color, background: bg, padding: '2px 7px', borderRadius: '20px' }}>
      <Arrow size={11} />{Math.abs(value)}%
    </span>
  );
}

function MetricCard({ metric, expanded, onToggle }: { metric: any; expanded: boolean; onToggle: () => void }) {
  const cfg = STATUS_CONFIG[metric.status as keyof typeof STATUS_CONFIG];
  const Icon = metric.icon;
  return (
    <div onClick={onToggle} style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${expanded ? TEAL + '40' : 'rgba(255,255,255,0.06)'}`, borderRadius: '16px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: expanded ? '16px' : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={18} color={cfg.color} />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>{metric.label}</p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>{metric.value}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
          <ChevronRight size={16} color="rgba(255,255,255,0.3)" style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
      </div>
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><Info size={12} /> O QUE SIGNIFICA</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>{metric.explanation}</p>
          </div>
          <div style={{ padding: '12px', borderRadius: '10px', background: cfg.bg, border: `1px solid ${cfg.border}` }}>
            <p style={{ fontSize: '11px', color: cfg.color, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><Zap size={12} /> RECOMENDAÇÃO</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>{metric.recommendation}</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Benchmark</p><p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{metric.benchmark}</p></div>
            <div style={{ textAlign: 'right' }}><p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Impacto estimado</p><p style={{ fontSize: '12px', color: cfg.color, fontWeight: 600 }}>{metric.impact}</p></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Funnel({ data }: { data: DeepData['funnel'] }) {
  const steps = [
    { label: 'Impressões', value: data.impressions.toLocaleString('pt-BR'), color: '#3b82f6', width: 100 },
    { label: `CTR ${data.ctr.toFixed(2)}%`, value: null, color: 'rgba(255,255,255,0.2)', width: 0, arrow: true },
    { label: 'Cliques', value: data.clicks.toLocaleString('pt-BR'), color: CYAN, width: data.impressions > 0 ? Math.max(12, (data.clicks / data.impressions) * 100 * 10) : 50 },
    { label: `Conv. ${data.clickToLeadRate.toFixed(1)}%`, value: null, color: 'rgba(255,255,255,0.2)', width: 0, arrow: true },
    { label: 'Leads', value: data.leads.toLocaleString('pt-BR'), color: '#10b981', width: data.clicks > 0 ? Math.max(8, (data.leads / data.clicks) * 100 * 10) : 30 },
    { label: 'Receita Est.', value: data.revenueEst > 0 ? `R$ ${data.revenueEst.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : '—', color: '#a78bfa', width: data.leads > 0 ? Math.max(6, (data.leads / data.clicks) * 80) : 20 },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {steps.map((step, i) => {
        if (step.arrow) return (
          <div key={i} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            <ChevronDown size={14} color="rgba(255,255,255,0.3)" />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>{step.label}</span>
            <ChevronDown size={14} color="rgba(255,255,255,0.3)" />
          </div>
        );
        const w = Math.min(100, Math.max(25, step.width));
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{step.label}</p>
            <div style={{ width: `${w}%`, background: `${step.color}25`, border: `1px solid ${step.color}50`, borderRadius: '8px', padding: '8px 16px', textAlign: 'center', transition: 'width 0.8s ease' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: step.color }}>{step.value}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Resumo: sub-components ───────────────────────────────────────────────────

function SummaryKpi({ label, value, sub, change, inverted }: { label: string; value: string; sub?: string; change: number | null | undefined; inverted?: boolean }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px 20px' }}>
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>{value}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <TrendBadge value={change} inverted={inverted} />
        {sub && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{sub}</span>}
      </div>
    </div>
  );
}

function ActionCard({ action, rank }: { action: any; rank: number }) {
  const color = PRIORITY_COLOR[action.priority] || '#64748b';
  const rankColors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#a78bfa'];
  return (
    <div style={{ display: 'flex', gap: '14px', padding: '14px 16px', borderRadius: '12px', background: `${color}08`, border: `1px solid ${color}25`, alignItems: 'flex-start' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${rankColors[rank] || color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px', fontWeight: 800, color: rankColors[rank] || color }}>
        {rank + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{action.acao}</span>
          <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '10px', color, background: `${color}20`, flexShrink: 0 }}>{action.priority.toUpperCase()}</span>
        </div>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{action.motivo}</p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Layers size={10} /> {action.campaign_name}
        </p>
      </div>
    </div>
  );
}

function CampaignScoreRow({ c, maxSpend }: { c: SummaryCampaign; maxSpend: number }) {
  const scoreColor = c.score >= 75 ? '#10b981' : c.score >= 50 ? '#f59e0b' : '#ef4444';
  const barWidth = maxSpend > 0 ? Math.max(4, (c.score / 100) * 100) : 4;
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ flex: '0 0 auto' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${scoreColor}15`, border: `1px solid ${scoreColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: scoreColor }}>{c.score}</span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
        <div style={{ display: 'flex', gap: '2px', height: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <div style={{ width: `${barWidth}%`, background: scoreColor, borderRadius: '4px', transition: 'width 1s ease' }} />
        </div>
      </div>
      <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
        <p style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>R$ {c.total_spend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{c.total_leads} leads</p>
      </div>
      <div style={{ flex: '0 0 auto', textAlign: 'right', minWidth: '60px' }}>
        <p style={{ fontSize: '11px', color: c.avg_cpa > 60 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{c.avg_cpa > 0 ? `R$${c.avg_cpa.toFixed(0)} CPA` : '—'}</p>
        <p style={{ fontSize: '11px', color: c.avg_roas >= 3 ? '#10b981' : c.avg_roas > 0 ? '#f59e0b' : 'rgba(255,255,255,0.3)' }}>{c.avg_roas > 0 ? `${c.avg_roas.toFixed(1)}x` : '—'}</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Professor() {
  const [tab, setTab] = useState<'resumo' | 'geral' | 'campanha' | 'pausadas' | 'ia' | 'apresentacao'>('ia');
  const [range, setRange] = useState<DateRange>(defaultRange());

  // Geral
  const [metrics, setMetrics] = useState<any[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [healthScore, setHealthScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);

  // Resumo
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Por campanha
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [deepData, setDeepData] = useState<DeepData | null>(null);
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepError, setDeepError] = useState<string | null>(null);

  // IA
  const [aiData, setAiData] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Pausadas
  const [pausedCampaigns, setPausedCampaigns] = useState<any[]>([]);

  // Load campaigns list once
  useEffect(() => {
    campaignsApi.list().then((res) => {
      const list = res?.data?.campaigns || [];
      setCampaigns(list);
      if (list.length > 0 && !selectedCampaignId) setSelectedCampaignId(list[0].id);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load general metrics
  const loadGeneral = useCallback(async (r: DateRange) => {
    setLoading(true);
    setNoData(false);
    try {
      const [metricsRes, pausedRes] = await Promise.all([
        metricsApi.dashboard(r.from, r.to).catch(() => null),
        analyzeApi.paused().catch(() => null),
      ]);
      const s = metricsRes?.data?.summary;
      if (s && (Number(s.spend) > 0 || Number(s.leads) > 0)) {
        const roi = Number(s.roas) > 0 ? (Number(s.roas) - 1) * 100 : 0;
        buildMetrics(Number(s.cpa) || 0, Number(s.roas) || 0, Number(s.ctr) || 0, Number(s.cpc) || 0, roi);
      } else {
        setNoData(true);
        setMetrics([]);
        setHealthScore(0);
      }
      if (pausedRes?.data?.paused) setPausedCampaigns(pausedRes.data.paused);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load summary
  const loadSummary = useCallback(async (r: DateRange) => {
    setSummaryLoading(true);
    try {
      const res = await analyzeApi.summary(r.from, r.to);
      setSummaryData(res?.data || null);
    } catch {
      setSummaryData(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Deep campaign analysis
  const doLoadDeep = useCallback(async (campaignId: string, r: DateRange) => {
    if (!campaignId) return;
    setDeepLoading(true);
    setDeepData(null);
    setDeepError(null);
    try {
      const res = await analyzeApi.deep(campaignId, r.from, r.to);
      if (res?.data) {
        setDeepData(res.data);
      } else {
        setDeepError('API retornou resposta vazia. Verifique o backend.');
      }
    } catch (err: any) {
      setDeepError(err?.response?.data?.error?.message || err?.message || 'Erro ao conectar com o backend');
      setDeepData(null);
    } finally {
      setDeepLoading(false);
    }
  }, []);

  // Effects
  useEffect(() => { loadGeneral(range); }, [range, loadGeneral]);
  useEffect(() => { loadSummary(range); }, [range, loadSummary]);
  useEffect(() => {
    if (tab === 'campanha' && selectedCampaignId) {
      setDeepError(null);
      doLoadDeep(selectedCampaignId, range);
    }
    if (tab !== 'campanha') { setDeepData(null); setDeepError(null); }
  }, [tab, selectedCampaignId, range]); // eslint-disable-line react-hooks/exhaustive-deps

  function buildMetrics(cpa: number, roas: number, ctr: number, cpc: number, roi: number) {
    const raw = [
      {
        key: 'roas', label: 'ROAS', value: roas > 0 ? `${roas.toFixed(1)}x` : '—', raw: roas,
        status: getStatus('roas', roas), icon: TrendingUp,
        explanation: roas > 0 ? `Para cada R$1 investido você recupera R$${roas.toFixed(2)}. ${roas >= 3 ? 'Campanha gerando retorno real acima do custo.' : 'O retorno ainda não cobre bem os custos operacionais.'}` : 'Sem dados de ROAS.',
        recommendation: roas >= 5 ? 'ROAS excepcional — escale 30-50% sem mexer na segmentação.' : roas >= 3 ? 'Bom ROAS. Aumente o orçamento 20% a cada 3-4 dias.' : roas >= 2 ? 'Revise a oferta e a landing page antes de escalar.' : roas > 0 ? 'Pause conjuntos ruins e revise público, criativo e oferta.' : 'Configure o pixel de conversão.',
        impact: roas >= 3 ? 'Escalar 20% → +20% proporcional' : 'Dobrar o ROAS é possível revisando criativo e funil',
        benchmark: 'Bom: 3x+ | Excelente: 5x+ | Escalar com segurança: 4x+',
      },
      {
        key: 'cpa', label: 'CPA (Custo por Lead)', value: cpa > 0 ? `R$ ${cpa.toFixed(2)}` : '—', raw: cpa,
        status: getStatus('cpa', cpa), icon: Target,
        explanation: cpa > 0 ? `Você paga R$${cpa.toFixed(2)} por lead. Com R$1.000 de orçamento: ~${Math.round(1000 / cpa)} leads.` : 'Sem conversões ainda.',
        recommendation: cpa <= 30 ? 'CPA excelente — escale com confiança.' : cpa <= 50 ? `Pause anúncios acima de R$${(cpa * 1.5).toFixed(0)}.` : 'Revise headline, prova social, CTA e velocidade da LP.',
        impact: cpa <= 50 ? '−10% no CPA = +10% mais leads' : `Chegar a R$50: +${cpa > 0 ? Math.round((cpa / 50 - 1) * 100) : 0}% mais leads`,
        benchmark: 'Excelente: < R$30 | Bom: R$30-50 | Atenção: R$50-80 | Crítico: > R$80',
      },
      {
        key: 'ctr', label: 'CTR (Taxa de Cliques)', value: ctr > 0 ? `${ctr.toFixed(2)}%` : '—', raw: ctr,
        status: getStatus('ctr', ctr), icon: Activity,
        explanation: ctr > 0 ? `${Math.round(ctr * 10)} em cada 1.000 pessoas clicam no seu anúncio.` : 'Sem dados de CTR ainda.',
        recommendation: ctr >= 3 ? 'CTR excelente — salve esse criativo e teste variações.' : ctr >= 1.5 ? 'Saudável. Teste 2-3 variações.' : 'Teste vídeo vs imagem, headline com pergunta e público mais específico.',
        impact: ctr < 1.5 ? 'Dobrar o CTR pode reduzir o CPC em até 40%' : 'CTR alto = algoritmo favorece no leilão',
        benchmark: 'Bom: 1.5%+ | Excelente: 3%+ | Crítico: < 0.8%',
      },
      {
        key: 'cpc', label: 'CPC (Custo por Clique)', value: cpc > 0 ? `R$ ${cpc.toFixed(2)}` : '—', raw: cpc,
        status: getStatus('cpc', cpc), icon: DollarSign,
        explanation: cpc > 0 ? `Cada clique custa R$${cpc.toFixed(2)}.` : 'Sem dados de CPC ainda.',
        recommendation: cpc <= 1 ? 'CPC excelente — escale.' : cpc <= 2.5 ? 'Competitivo. Melhore CTR.' : 'Revise sobreposição de audiências e relevância.',
        impact: cpc > 2.5 ? `Chegar a R$2: +${cpc > 0 ? Math.round((cpc / 2 - 1) * 100) : 0}% mais cliques` : 'CPC baixo = mais cliques pelo mesmo investimento',
        benchmark: 'Excelente: < R$1 | Bom: R$1-2.50 | Atenção: R$2.50-5 | Crítico: > R$5',
      },
      {
        key: 'roi', label: 'ROI (Retorno sobre Investimento)', value: roi > 0 ? `${roi.toFixed(0)}%` : '—', raw: roi,
        status: getStatus('roi', roi), icon: BarChart3,
        explanation: roi > 0 ? `Para cada R$100 investidos você obtém R$${(100 + roi).toFixed(0)} de retorno.` : 'ROI aparece após os primeiros dados de receita.',
        recommendation: roi >= 300 ? 'ROI excepcional — escale.' : roi >= 150 ? 'ROI saudável. Aumente 20%/semana.' : 'Analise onde o funil perde leads.',
        impact: roi >= 150 ? 'Replique em novos mercados' : 'Cada +10% na conversão aumenta o ROI proporcionalmente',
        benchmark: 'Positivo: > 0% | Bom: 150%+ | Excelente: 300%+',
      },
    ];
    setMetrics(raw);
    const w: Record<string, number> = { roas: 30, cpa: 25, ctr: 20, cpc: 15, roi: 10 };
    const s: Record<string, number> = { excellent: 100, good: 75, warning: 40, critical: 10 };
    let total = 0, wSum = 0;
    raw.forEach((m) => { const ww = w[m.key] || 10; total += (s[m.status] || 50) * ww; wSum += ww; });
    setHealthScore(Math.round(total / wSum));
    setExpandedKey(raw[0].key);
  }

  if (loading && tab === 'geral') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${CYAN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const criticalCount = metrics.filter((m) => m.status === 'critical').length;
  const warningCount = metrics.filter((m) => m.status === 'warning').length;
  const hasData = summaryData && summaryData.overview.total_spend > 0;

  return (
    <div className="page-pad" style={{ minHeight: '100vh', background: '#000', padding: '32px' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${TEAL}20`, border: `1px solid ${TEAL}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={20} color={TEAL} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>Professor IA</h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Análise cirúrgica — por campanha, por período, com recomendações específicas</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginTop: '16px' }}>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '10px', flexWrap: 'wrap' }}>
            {([
              ['ia',            '✦ Análise IA'],
              ['apresentacao',  '📊 Apresentação'],
              ['resumo',        'Resumo'],
              ['geral',         'Geral'],
              ['campanha',      'Por Campanha'],
              ['pausadas',      pausedCampaigns.length > 0 ? `Pausadas (${pausedCampaigns.length})` : 'Pausadas'],
            ] as const).map(([t, lbl]) => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', background: tab === t ? (t === 'ia' ? `${CYAN}25` : t === 'apresentacao' ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.08)') : 'transparent', color: tab === t ? (t === 'ia' ? CYAN : t === 'apresentacao' ? '#a78bfa' : '#fff') : 'rgba(255,255,255,0.4)' }}>
                {lbl}
              </button>
            ))}
          </div>
          <DateRangePicker value={range} onChange={setRange} />
        </div>
      </div>

      {/* ─── TAB: ANÁLISE IA ─── */}
      {tab === 'ia' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Análise por Inteligência Artificial</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Claude analisa suas campanhas, conjuntos e tendências como um especialista em tráfego pago</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {aiData && (
                <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ↓ Exportar PDF
                </button>
              )}
              <button
                onClick={async () => { setAiLoading(true); setAiError(null); try { const r = await aiApi.professor(range.from, range.to); setAiData(r.data); } catch (e: any) { setAiError(e?.response?.data?.error?.message || 'Erro ao gerar análise'); } finally { setAiLoading(false); } }}
                disabled={aiLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', borderRadius: '10px', border: 'none', background: aiLoading ? 'rgba(61,184,232,0.2)' : `linear-gradient(135deg, ${CYAN}, #1a8ab8)`, color: aiLoading ? CYAN : '#000', fontSize: '13px', fontWeight: 700, cursor: aiLoading ? 'wait' : 'pointer', fontFamily: 'inherit' }}
              >
                {aiLoading ? '⟳ Analisando...' : aiData ? '↺ Nova Análise' : '✦ Analisar Agora'}
              </button>
            </div>
          </div>

          {aiError && (
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#ef4444', fontWeight: 600 }}>{aiError}</p>
              {aiError.includes('ANTHROPIC_API_KEY') && (
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>
                  Acesse <strong style={{ color: CYAN }}>console.anthropic.com</strong> → API Keys → crie uma chave → adicione como <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: '4px' }}>ANTHROPIC_API_KEY</code> no Easypanel.
                </p>
              )}
            </div>
          )}

          {aiLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: `3px solid ${CYAN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Analisando suas campanhas...</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Calculando benchmarks e recomendações</p>
            </div>
          )}

          {!aiData && !aiLoading && !aiError && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '16px', background: 'rgba(15,23,42,0.5)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: `${CYAN}15`, border: `1px solid ${CYAN}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCap size={28} color={CYAN} />
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Professor IA pronto para analisar</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', maxWidth: '460px', lineHeight: '1.6' }}>
                Clique em "Analisar Agora" para receber diagnóstico completo baseado nos benchmarks reais de tráfego B2B: nota de 0-100, ações prioritárias com passos numerados, análise por campanha e plano para a semana.
              </p>
            </div>
          )}

          {aiData?.analysis && (
            <div id="ai-report">
              {/* Diagnóstico geral */}
              <div style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${CYAN}25`, borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '11px', color: CYAN, fontWeight: 700, letterSpacing: '0.5px', marginBottom: '8px' }}>DIAGNÓSTICO GERAL</p>
                    <p style={{ fontSize: '14px', color: '#fff', lineHeight: '1.7', fontWeight: 400, whiteSpace: 'pre-line' }}>{aiData.analysis.diagnostico_geral}</p>
                  </div>
                  {aiData.analysis.nota_geral != null && (
                    <HealthGauge score={aiData.analysis.nota_geral} size={110} />
                  )}
                </div>
                {aiData.analysis.insight_oculto && (
                  <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '10px', background: `${CYAN}08`, border: `1px solid ${CYAN}20` }}>
                    <p style={{ fontSize: '11px', color: CYAN, fontWeight: 700, marginBottom: '4px' }}>💡 INSIGHT OCULTO</p>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.7', whiteSpace: 'pre-line' }}>{aiData.analysis.insight_oculto}</p>
                  </div>
                )}
              </div>

              {/* Alerta crítico */}
              {aiData.analysis.alerta_critico && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '14px', padding: '16px 20px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444', marginBottom: '4px' }}>ALERTA CRÍTICO</p>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{aiData.analysis.alerta_critico}</p>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }} className="grid-ai-2col">
                {/* O que está funcionando */}
                {aiData.analysis.o_que_esta_funcionando?.length > 0 && (
                  <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '14px', padding: '20px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', marginBottom: '12px' }}>✓ O QUE ESTÁ FUNCIONANDO</p>
                    {aiData.analysis.o_que_esta_funcionando.map((item: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981', flexShrink: 0, marginTop: '7px' }} />
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5' }}>{item}</p>
                      </div>
                    ))}
                  </div>
                )}
                {/* O que precisa melhorar */}
                {aiData.analysis.o_que_nao_esta_funcionando?.length > 0 && (
                  <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '14px', padding: '20px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444', marginBottom: '12px' }}>✗ O QUE PRECISA MELHORAR</p>
                    {aiData.analysis.o_que_nao_esta_funcionando.map((item: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ef4444', flexShrink: 0, marginTop: '7px' }} />
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5' }}>{item}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ações prioritárias */}
              {aiData.analysis.acoes_prioritarias?.length > 0 && (
                <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>Ações Prioritárias</p>
                  {aiData.analysis.acoes_prioritarias.map((a: any, i: number) => {
                    const pc = a.prioridade === 'URGENTE' ? '#ef4444' : a.prioridade === 'ALTA' ? '#f97316' : '#f59e0b';
                    return (
                      <div key={i} style={{ display: 'flex', gap: '14px', padding: '14px 16px', borderRadius: '12px', background: `${pc}06`, border: `1px solid ${pc}20`, marginBottom: '10px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: pc, background: `${pc}18`, padding: '3px 9px', borderRadius: '20px', flexShrink: 0, marginTop: '2px' }}>{a.prioridade}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{a.titulo}</p>
                          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.8', marginBottom: '6px', whiteSpace: 'pre-line' }}>{a.descricao}</p>
                          {a.impacto_esperado && (
                            <p style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>↑ {a.impacto_esperado}</p>
                          )}
                          {a.campanha_ou_conjunto && a.campanha_ou_conjunto !== 'Geral' && (
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', display: 'block' }}>Campanha/Conjunto: {a.campanha_ou_conjunto}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }} className="grid-ai-2col">
                {/* Análise por campanha */}
                {aiData.analysis.analise_por_campanha?.length > 0 && (
                  <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '20px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '14px' }}>Por Campanha</p>
                    {aiData.analysis.analise_por_campanha.map((c: any, i: number) => {
                      const rc = c.recomendacao === 'ESCALAR' ? '#10b981' : c.recomendacao === 'PAUSAR' ? '#ef4444' : c.recomendacao === 'OTIMIZAR' ? '#f59e0b' : '#3b82f6';
                      return (
                        <div key={i} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', flex: 1, marginRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</p>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: rc, background: `${rc}18`, padding: '2px 8px', borderRadius: '12px', flexShrink: 0 }}>{c.recomendacao}</span>
                          </div>
                          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', marginBottom: '4px' }}>{c.diagnostico}</p>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{c.motivo}</p>
                          {c.proximos_passos?.length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                              {c.proximos_passos.map((p: string, j: number) => (
                                <p key={j} style={{ fontSize: '11px', color: CYAN, marginBottom: '2px' }}>→ {p}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Análise conjuntos */}
                {aiData.analysis.analise_conjuntos?.length > 0 && (
                  <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '20px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '14px' }}>Por Conjunto de Anúncios</p>
                    {aiData.analysis.analise_conjuntos.map((a: any, i: number) => {
                      const ac = a.acao === 'ESCALAR' ? '#10b981' : a.acao === 'PAUSAR' ? '#ef4444' : '#f59e0b';
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '6px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '12px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{a.nome}</p>
                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '3px' }}>{a.campanha}</p>
                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)' }}>{a.motivo_rapido}</p>
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: ac, background: `${ac}18`, padding: '3px 8px', borderRadius: '10px', flexShrink: 0 }}>{a.acao}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Meta próximo período */}
              {aiData.analysis.meta_proximo_periodo && (
                <div style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}25`, borderRadius: '14px', padding: '20px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: CYAN, marginBottom: '8px' }}>🎯 FOCO PARA OS PRÓXIMOS 7 DIAS</p>
                  <p style={{ fontSize: '13px', color: '#fff', lineHeight: '1.8', whiteSpace: 'pre-line' }}>{aiData.analysis.meta_proximo_periodo}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: RESUMO EXECUTIVO ─── */}
      {tab === 'resumo' && (
        <div>
          {summaryLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${CYAN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}

          {!summaryLoading && !hasData && (
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '60px', textAlign: 'center' }}>
              <GraduationCap size={48} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 20px' }} />
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>Nenhum dado encontrado no período</p>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: '480px', margin: '0 auto 20px' }}>
                Para ver o Resumo Executivo, sincronize o Meta Ads com um token válido.<br />
                Vá em <strong style={{ color: CYAN }}>Configurações → Meta Ads → Sincronizar</strong>.
              </p>
            </div>
          )}

          {!summaryLoading && hasData && summaryData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Row 1: Score + KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '16px', alignItems: 'stretch' }} className="grid-resumo-top">
                <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>SAÚDE DA CONTA</p>
                  <HealthGauge score={summaryData.overview.health_score} size={110} />
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                    {summaryData.overview.active_campaigns} camp. • {summaryData.period.days} dias
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }} className="grid-resumo-kpis">
                  <SummaryKpi label="Investido" value={`R$ ${summaryData.overview.total_spend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} change={summaryData.comparison.spend_change} sub="vs período anterior" />
                  <SummaryKpi label="Leads" value={summaryData.overview.total_leads.toLocaleString('pt-BR')} change={summaryData.comparison.leads_change} sub="vs período anterior" />
                  <SummaryKpi label="CPA Médio" value={summaryData.overview.avg_cpa > 0 ? `R$ ${summaryData.overview.avg_cpa.toFixed(0)}` : '—'} change={summaryData.comparison.cpa_change} inverted sub="menor = melhor" />
                  <SummaryKpi label="ROAS" value={summaryData.overview.avg_roas > 0 ? `${summaryData.overview.avg_roas.toFixed(1)}x` : '—'} change={summaryData.comparison.roas_change} sub="retorno sobre gasto" />
                </div>
              </div>

              {/* Row 2: Metrics row 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }} className="grid-resumo-kpis">
                {[
                  { label: 'CTR Médio', value: summaryData.overview.avg_ctr > 0 ? `${summaryData.overview.avg_ctr.toFixed(2)}%` : '—', sub: 'taxa de cliques', color: summaryData.overview.avg_ctr >= 1.5 ? '#10b981' : summaryData.overview.avg_ctr >= 0.8 ? '#f59e0b' : '#ef4444' },
                  { label: 'CPC Médio', value: summaryData.overview.avg_cpc > 0 ? `R$ ${summaryData.overview.avg_cpc.toFixed(2)}` : '—', sub: 'custo por clique', color: summaryData.overview.avg_cpc <= 2.5 ? '#10b981' : summaryData.overview.avg_cpc <= 5 ? '#f59e0b' : '#ef4444' },
                  { label: 'Cliques', value: summaryData.overview.total_clicks > 0 ? summaryData.overview.total_clicks.toLocaleString('pt-BR') : '—', sub: 'no período', color: CYAN },
                  { label: 'Impressões', value: summaryData.overview.total_impressions > 1000 ? `${(summaryData.overview.total_impressions / 1000).toFixed(1)}k` : summaryData.overview.total_impressions.toLocaleString('pt-BR'), sub: 'alcance total', color: '#a78bfa' },
                ].map((item) => (
                  <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '14px 16px' }}>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
                    <p style={{ fontSize: '20px', fontWeight: 800, color: item.color, marginBottom: '4px' }}>{item.value}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{item.sub}</p>
                  </div>
                ))}
              </div>

              {/* Row 3: O que fazer HOJE */}
              {summaryData.top_actions.length > 0 && (
                <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${CYAN}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={15} color={CYAN} />
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>O Que Fazer HOJE</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Ações prioritárias baseadas nos dados do período</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {summaryData.top_actions.map((a, i) => <ActionCard key={i} action={a} rank={i} />)}
                  </div>
                </div>
              )}

              {/* Row 4: Ranking + Projeção */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', alignItems: 'start' }} className="grid-resumo-bottom">

                {/* Ranking */}
                <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Ranking de Campanhas</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '16px' }}>
                    Ordenado por score de saúde · período {summaryData.period.from.split('-').reverse().join('/')} → {summaryData.period.to.split('-').reverse().join('/')}
                  </p>
                  {summaryData.campaigns.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', padding: '20px 0', textAlign: 'center' }}>Nenhuma campanha com gasto no período.</p>
                  ) : (
                    [...summaryData.campaigns].sort((a, b) => b.score - a.score).map((c) => (
                      <CampaignScoreRow key={c.id} c={c} maxSpend={summaryData.campaigns[0]?.total_spend || 1} />
                    ))
                  )}
                </div>

                {/* Projeção */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {summaryData.projection.days_remaining > 0 && (
                    <div style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${CYAN}30`, borderRadius: '16px', padding: '20px' }}>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CalendarDays size={15} color={CYAN} /> Projeção do Mês
                      </p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '16px' }}>
                        {summaryData.projection.days_remaining} dias restantes no mês
                      </p>
                      {[
                        { label: 'Gasto Projetado', value: `R$ ${summaryData.projection.projected_spend.toLocaleString('pt-BR')}`, color: '#3b82f6' },
                        { label: 'Leads Projetados', value: summaryData.projection.projected_leads.toLocaleString('pt-BR'), color: '#10b981' },
                        { label: 'CPA Projetado', value: summaryData.projection.projected_cpa > 0 ? `R$ ${summaryData.projection.projected_cpa}` : '—', color: summaryData.projection.projected_cpa > 60 ? '#ef4444' : '#10b981' },
                      ].map((item) => (
                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{item.label}</span>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: item.color }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Período comparativo info */}
                  <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '16px' }}>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '10px' }}>COMPARATIVO DE PERÍODO</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                      Atual: <strong style={{ color: '#fff' }}>{summaryData.period.from.split('-').reverse().join('/')} → {summaryData.period.to.split('-').reverse().join('/')}</strong>
                    </p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                      Anterior: {summaryData.period.prev_from.split('-').reverse().join('/')} → {summaryData.period.prev_to.split('-').reverse().join('/')}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ─── TAB: GERAL ─── */}
      {tab === 'geral' && (
        <div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${CYAN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : noData ? (
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '60px', textAlign: 'center' }}>
              <GraduationCap size={48} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 20px' }} />
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Sem dados no período selecionado</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                Sincronize o Meta Ads em <strong style={{ color: CYAN }}>Configurações</strong> para ver a análise real.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'start' }} className="grid-professor">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {metrics.map((m) => (
                  <MetricCard key={m.key} metric={m} expanded={expandedKey === m.key} onToggle={() => setExpandedKey(expandedKey === m.key ? null : m.key)} />
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Score de Saúde</p>
                  <HealthGauge score={healthScore} />
                  <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Críticas</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: criticalCount > 0 ? '#ef4444' : '#10b981' }}>{criticalCount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Atenção</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: warningCount > 0 ? '#f59e0b' : '#10b981' }}>{warningCount}</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>Diagnóstico Rápido</p>
                  {metrics.map((m) => {
                    const cfg = STATUS_CONFIG[m.status as keyof typeof STATUS_CONFIG];
                    return (
                      <div key={m.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{m.label.split(' ')[0]}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.color }} />
                          <span style={{ fontSize: '11px', color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ background: `${TEAL}10`, border: `1px solid ${TEAL}30`, borderRadius: '16px', padding: '20px' }}>
                  <p style={{ fontSize: '12px', color: TEAL, fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={13} /> PRÓXIMO PASSO</p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>
                    {criticalCount > 0 ? `Foque nas ${criticalCount} métrica(s) crítica(s). Clique em cada cartão.` : warningCount > 0 ? `Otimize as ${warningCount} métrica(s) em atenção.` : 'Excelente! Escale — aumente o orçamento 20% nos melhores conjuntos.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: POR CAMPANHA ─── */}
      {tab === 'campanha' && (
        <div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>CAMPANHA</p>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', padding: '8px 14px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', minWidth: '220px', cursor: 'pointer' }}
              >
                {campaigns.length === 0 && <option value="">Nenhuma campanha — sincronize o Meta Ads</option>}
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button
              onClick={() => selectedCampaignId && doLoadDeep(selectedCampaignId, range)}
              disabled={deepLoading || !selectedCampaignId}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-end', padding: '8px 16px', borderRadius: '10px', border: `1px solid ${CYAN}40`, background: `${CYAN}15`, color: CYAN, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: (deepLoading || !selectedCampaignId) ? 0.5 : 1 }}
            >
              <RefreshCw size={13} style={{ animation: deepLoading ? 'spin 1s linear infinite' : 'none' }} />
              {deepLoading ? 'Analisando...' : 'Analisar'}
            </button>
          </div>

          {deepLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${CYAN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}

          {!deepLoading && deepError && (
            <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} /> Erro ao carregar análise
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '10px' }}>{deepError}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                Possíveis causas: token Meta expirado, backend não atualizado, ou campanha sem dados no período.
                <br />Atualize o token em <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Configurações → Meta Ads</strong> e execute uma sincronização.
              </p>
            </div>
          )}

          {!deepLoading && !deepData && !deepError && (
            <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)' }}>
              <GraduationCap size={40} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
              {campaigns.length === 0
                ? <><p style={{ fontSize: '14px', marginBottom: '8px' }}>Nenhuma campanha encontrada.</p><p style={{ fontSize: '12px' }}>Sincronize o Meta Ads em Configurações para importar suas campanhas.</p></>
                : <><p style={{ fontSize: '14px', marginBottom: '8px' }}>Selecione uma campanha para analisar.</p><p style={{ fontSize: '12px' }}>Você verá funil, ranking de conjuntos e projeção mensal.</p></>
              }
            </div>
          )}

          {!deepLoading && deepData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Score + Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '16px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRight: '1px solid rgba(255,255,255,0.06)', paddingRight: '20px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Score da Campanha</p>
                  <HealthGauge score={deepData.analysis.score} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {[
                    { label: 'Gasto', value: `R$ ${deepData.summary.spend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, color: '#3b82f6' },
                    { label: 'Leads', value: deepData.summary.leads.toLocaleString('pt-BR'), color: '#10b981' },
                    { label: 'CPA Médio', value: deepData.summary.cpa > 0 ? `R$ ${deepData.summary.cpa.toFixed(0)}` : '—', color: deepData.summary.cpa > 60 ? '#ef4444' : '#10b981' },
                    { label: 'ROAS', value: deepData.summary.roas > 0 ? `${deepData.summary.roas.toFixed(1)}x` : '—', color: deepData.summary.roas >= 3 ? '#10b981' : deepData.summary.roas >= 2 ? '#f59e0b' : '#ef4444' },
                    { label: 'CTR Médio', value: deepData.summary.ctr > 0 ? `${deepData.summary.ctr.toFixed(2)}%` : '—', color: deepData.summary.ctr >= 1.5 ? '#10b981' : '#f59e0b' },
                    { label: 'CPC Médio', value: deepData.summary.cpc > 0 ? `R$ ${deepData.summary.cpc.toFixed(2)}` : '—', color: '#fff' },
                    { label: 'Cliques', value: deepData.summary.clicks.toLocaleString('pt-BR'), color: CYAN },
                    { label: 'Impressões', value: deepData.summary.impressions > 1000 ? `${(deepData.summary.impressions / 1000).toFixed(1)}k` : deepData.summary.impressions.toLocaleString('pt-BR'), color: '#a78bfa' },
                  ].map((item) => (
                    <div key={item.label} style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>{item.label}</p>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: item.color }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px' }}>
                <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Funil de Conversão</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '16px' }}>Onde você perde volume</p>
                  <Funnel data={deepData.funnel} />
                </div>

                <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Evolução Diária</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '16px' }}>Gasto e leads por dia no período</p>
                  {deepData.daily.length === 0 ? (
                    <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Sem dados diários para o período.<br />Sincronize o Meta Ads para ver a evolução.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={deepData.daily}>
                        <defs>
                          <linearGradient id="dBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                          <linearGradient id="dGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="label" stroke="transparent" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px' }} />
                        <Area type="monotone" dataKey="spend" name="Gasto (R$)" stroke="#3b82f6" strokeWidth={2} fill="url(#dBlue)" dot={false} />
                        <Area type="monotone" dataKey="leads" name="Leads" stroke="#10b981" strokeWidth={2} fill="url(#dGreen)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Ad Set Ranking */}
              <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={15} color={CYAN} />
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Ranking dos Conjuntos</p>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginLeft: '4px' }}>{deepData.adSets.length} conjuntos</span>
                </div>
                {deepData.adSets.length === 0 ? (
                  <p style={{ padding: '24px', fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Nenhum conjunto encontrado. Sincronize o Meta Ads primeiro.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          {['Conjunto', 'Status', 'Score', 'CTR', 'CPC', 'CPA', 'ROAS', 'Leads', 'Gasto', 'Ação'].map((h) => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Conjunto' ? 'left' : 'center', color: 'rgba(255,255,255,0.35)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {deepData.adSets.map((as) => {
                          const scoreColor = as.score >= 75 ? '#10b981' : as.score >= 55 ? '#3b82f6' : as.score >= 35 ? '#f59e0b' : '#ef4444';
                          return (
                            <tr key={as.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{as.name}</td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: as.status === 'active' ? '#10b981' : '#f59e0b', margin: '0 auto' }} />
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: scoreColor }}>{as.score}</td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', color: Number(as.ctr) >= 1.5 ? '#10b981' : Number(as.ctr) >= 1 ? '#f59e0b' : Number(as.ctr) > 0 ? '#ef4444' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                                {Number(as.ctr) > 0 ? `${Number(as.ctr).toFixed(1)}%` : '—'}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>{Number(as.cpc) > 0 ? `R$${Number(as.cpc).toFixed(2)}` : '—'}</td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', color: Number(as.cpa) > 60 ? '#ef4444' : Number(as.cpa) > 0 ? '#10b981' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                                {Number(as.cpa) > 0 ? `R$${Number(as.cpa).toFixed(0)}` : '—'}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', color: Number(as.roas) >= 3 ? '#10b981' : Number(as.roas) >= 2 ? '#f59e0b' : Number(as.roas) > 0 ? '#ef4444' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                                {Number(as.roas) > 0 ? `${Number(as.roas).toFixed(1)}x` : '—'}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', color: '#fff' }}>{as.leads}</td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', color: '#fff', fontWeight: 600 }}>
                                {Number(as.spend) > 0 ? `R$${Number(as.spend).toFixed(0)}` : '—'}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <div>
                                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '8px', color: as.action.color, background: as.action.bg, whiteSpace: 'nowrap' }}>
                                    {as.action.label}
                                  </span>
                                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '3px', maxWidth: '160px', lineHeight: '1.4' }}>{as.action.detail}</p>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* AI Recommendations + Projection */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${TEAL}30`, borderRadius: '16px', padding: '20px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}><GraduationCap size={15} color={TEAL} /> Recomendações do Professor</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '14px' }}>Baseado nas métricas do período selecionado</p>
                  {deepData.analysis.actions.slice(0, 4).map((action, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', borderRadius: '10px', marginBottom: '8px', background: `${PRIORITY_COLOR[action.priority]}08`, border: `1px solid ${PRIORITY_COLOR[action.priority]}20` }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: PRIORITY_COLOR[action.priority], flexShrink: 0, marginTop: '5px' }} />
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{action.acao}</p>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{action.motivo}</p>
                      </div>
                      <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, flexShrink: 0, padding: '2px 8px', borderRadius: '12px', color: PRIORITY_COLOR[action.priority], background: `${PRIORITY_COLOR[action.priority]}15` }}>{action.priority.toUpperCase()}</span>
                    </div>
                  ))}
                  {deepData.analysis.issues.length === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                      <CheckCircle size={16} />
                      <span style={{ fontSize: '13px' }}>Campanha sem problemas críticos detectados.</span>
                    </div>
                  )}
                </div>

                {deepData.projection.daysRemaining > 0 && (
                  <div style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${CYAN}30`, borderRadius: '16px', padding: '20px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}><CalendarDays size={15} color={CYAN} /> Projeção de Fim de Mês</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '16px' }}>{deepData.projection.daysRemaining} dias restantes</p>
                    {[
                      { label: 'Total Gasto Est.', value: `R$ ${deepData.projection.projectedTotalSpend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, color: '#3b82f6' },
                      { label: 'Total Leads Est.', value: deepData.projection.projectedTotalLeads.toLocaleString('pt-BR'), color: '#10b981' },
                      { label: 'CPA Projetado', value: deepData.projection.projectedCpa > 0 ? `R$ ${deepData.projection.projectedCpa.toFixed(0)}` : '—', color: deepData.projection.projectedCpa > 60 ? '#ef4444' : '#10b981' },
                    ].map((item) => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{item.label}</span>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: item.color }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: PAUSADAS ─── */}
      {tab === 'pausadas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pausedCampaigns.length === 0 ? (
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
              <PauseCircle size={32} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>Nenhuma campanha pausada.</p>
            </div>
          ) : pausedCampaigns.map((c: any) => {
            const vc = VERDICT_CONFIG[c.verdict] || VERDICT_CONFIG.reativar_com_cautela;
            return (
              <div key={c.id} style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${vc.border}`, borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{c.name}</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{PLATFORM_LABEL[c.platform] || c.platform}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '12px', color: vc.color, background: vc.bg }}>{vc.label}</span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Score: {c.score}/100</span>
                  </div>
                </div>
                {c.total_spend > 0 && (
                  <div style={{ display: 'flex', gap: '20px', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', marginBottom: '12px' }}>
                    {[
                      { l: 'CPA', v: `R$ ${c.avg_cpa.toFixed(0)}`, color: c.avg_cpa > 60 ? '#ef4444' : '#10b981' },
                      { l: 'ROAS', v: `${c.avg_roas.toFixed(1)}x`, color: c.avg_roas >= 3 ? '#10b981' : c.avg_roas >= 2 ? '#f59e0b' : '#ef4444' },
                      { l: 'CTR', v: `${c.avg_ctr.toFixed(1)}%`, color: c.avg_ctr >= 1.5 ? '#10b981' : '#f59e0b' },
                      { l: 'Leads', v: String(c.total_leads), color: '#fff' },
                    ].map((item) => (
                      <div key={item.l}>
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>{item.l}</p>
                        <p style={{ fontSize: '16px', fontWeight: 700, color: item.color }}>{item.v}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ padding: '12px', borderRadius: '10px', background: vc.bg, border: `1px solid ${vc.border}` }}>
                  <p style={{ fontSize: '11px', color: vc.color, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><Zap size={12} /> RECOMENDAÇÃO DA IA</p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>{c.verdict_reason}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── TAB: APRESENTAÇÃO ─── */}
      {tab === 'apresentacao' && (
        <div id="apresentacao-report">
          {!aiData?.analysis ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '20px', background: 'rgba(15,23,42,0.5)', borderRadius: '20px', border: '1px dashed rgba(167,139,250,0.2)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                📊
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Gere a análise primeiro</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', maxWidth: '380px', lineHeight: '1.6' }}>
                Vá para a aba "✦ Análise IA", clique em "Analisar Agora" e depois volte aqui para ver o relatório pronto para apresentar ao cliente.
              </p>
              <button
                onClick={() => setTab('ia')}
                style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'rgba(167,139,250,0.2)', color: '#a78bfa', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Ir para Análise IA →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {/* Botão imprimir */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', gap: '8px' }} className="no-print">
                <button
                  onClick={() => window.print()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '10px', border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.1)', color: '#a78bfa', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  🖨️ Imprimir / Salvar PDF
                </button>
              </div>

              {/* CABEÇALHO DO RELATÓRIO */}
              <div style={{ background: 'linear-gradient(135deg, rgba(61,184,232,0.12), rgba(167,139,250,0.08))', border: '1px solid rgba(61,184,232,0.2)', borderRadius: '20px', padding: '32px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>Relatório de Performance</p>
                    <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>Meta Ads</h2>
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                      Período: {aiData.period?.from ? `${String(aiData.period.from).split('-').reverse().join('/')} até ${String(aiData.period.to).split('-').reverse().join('/')}` : range.from.split('-').reverse().join('/') + ' até ' + range.to.split('-').reverse().join('/')}
                    </p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    {aiData.analysis.nota_geral != null && (
                      <HealthGauge score={aiData.analysis.nota_geral} size={100} />
                    )}
                  </div>
                </div>
              </div>

              {/* RESUMO DE NÚMEROS */}
              {aiData.input_summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }} className="grid-apres-kpis">
                  {[
                    { label: 'Total Investido', value: `R$ ${Number(aiData.input_summary.total_spend).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: '💰', color: '#3b82f6', desc: 'Quanto foi gasto no período' },
                    { label: 'Leads Gerados', value: String(aiData.input_summary.total_leads), icon: '🎯', color: '#10b981', desc: 'Pessoas que demonstraram interesse' },
                    { label: 'Campanhas Ativas', value: String(aiData.input_summary.campaigns), icon: '📣', color: '#a78bfa', desc: 'Campanhas com investimento' },
                    { label: 'Conjuntos', value: String(aiData.input_summary.ad_sets), icon: '🗂️', color: '#f59e0b', desc: 'Grupos de anúncios analisados' },
                  ].map((item) => (
                    <div key={item.label} style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${item.color}20`, borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
                      <p style={{ fontSize: '22px', fontWeight: 800, color: item.color, marginBottom: '4px' }}>{item.value}</p>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{item.label}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* ALERTA CRÍTICO */}
              {aiData.analysis.alerta_critico && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '2px solid rgba(239,68,68,0.3)', borderRadius: '14px', padding: '18px 22px', marginBottom: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '22px', flexShrink: 0 }}>🚨</span>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 800, color: '#ef4444', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Atenção Imediata Necessária</p>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>{aiData.analysis.alerta_critico}</p>
                  </div>
                </div>
              )}

              {/* O QUE ESTÁ FUNCIONANDO / MELHORAR */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }} className="grid-ai-2col">
                {aiData.analysis.o_que_esta_funcionando?.length > 0 && (
                  <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '16px', padding: '22px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      ✅ O QUE ESTÁ FUNCIONANDO
                    </p>
                    {aiData.analysis.o_que_esta_funcionando.map((item: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                        <span style={{ color: '#10b981', flexShrink: 0, fontWeight: 700 }}>✓</span>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.6' }}>{item}</p>
                      </div>
                    ))}
                  </div>
                )}
                {aiData.analysis.o_que_nao_esta_funcionando?.length > 0 && (
                  <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '16px', padding: '22px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🔧 O QUE PRECISA MELHORAR
                    </p>
                    {aiData.analysis.o_que_nao_esta_funcionando.map((item: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                        <span style={{ color: '#ef4444', flexShrink: 0, fontWeight: 700 }}>!</span>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.6' }}>{item}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AÇÕES PRIORITÁRIAS */}
              {aiData.analysis.acoes_prioritarias?.length > 0 && (
                <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⚡ Próximas Ações — O Que Fazer Agora
                  </p>
                  {aiData.analysis.acoes_prioritarias.map((a: any, i: number) => {
                    const pc = a.prioridade === 'URGENTE' ? '#ef4444' : a.prioridade === 'ALTA' ? '#f97316' : '#f59e0b';
                    const num = ['①', '②', '③', '④', '⑤', '⑥'][i] || `${i+1}.`;
                    return (
                      <div key={i} style={{ display: 'flex', gap: '16px', padding: '18px', borderRadius: '12px', background: `${pc}06`, border: `1px solid ${pc}25`, marginBottom: '12px', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <span style={{ fontSize: '18px', fontWeight: 800, color: pc }}>{num}</span>
                          <span style={{ fontSize: '9px', fontWeight: 700, color: pc, background: `${pc}18`, padding: '2px 6px', borderRadius: '10px', textAlign: 'center', whiteSpace: 'nowrap' }}>{a.prioridade}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>{a.titulo}</p>
                          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: '1.8', marginBottom: '10px', whiteSpace: 'pre-line' }}>{a.descricao}</p>
                          {a.impacto_esperado && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                              <span style={{ fontSize: '14px' }}>📈</span>
                              <p style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>{a.impacto_esperado}</p>
                            </div>
                          )}
                          {a.campanha_ou_conjunto && a.campanha_ou_conjunto !== 'Geral' && (
                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>📌 {a.campanha_ou_conjunto}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ANÁLISE POR CAMPANHA */}
              {aiData.analysis.analise_por_campanha?.length > 0 && (
                <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '18px' }}>📣 Análise por Campanha</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {aiData.analysis.analise_por_campanha.map((c: any, i: number) => {
                      const rc = c.recomendacao === 'ESCALAR' ? '#10b981' : c.recomendacao === 'PAUSAR' ? '#ef4444' : c.recomendacao === 'OTIMIZAR' ? '#f59e0b' : '#3b82f6';
                      const rcEmoji = c.recomendacao === 'ESCALAR' ? '🚀' : c.recomendacao === 'PAUSAR' ? '⏸️' : c.recomendacao === 'OTIMIZAR' ? '⚙️' : '👀';
                      return (
                        <div key={i} style={{ border: `1px solid ${rc}30`, borderRadius: '14px', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: `${rc}08`, borderBottom: `1px solid ${rc}20` }}>
                            <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{c.nome}</p>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: rc, background: `${rc}18`, padding: '4px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {rcEmoji} {c.recomendacao}
                            </span>
                          </div>
                          <div style={{ padding: '14px 18px' }}>
                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.6', marginBottom: '8px' }}>{c.diagnostico}</p>
                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6', marginBottom: c.proximos_passos?.length ? '10px' : '0' }}>{c.motivo}</p>
                            {c.proximos_passos?.length > 0 && (
                              <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Próximos passos</p>
                                {c.proximos_passos.map((p: string, j: number) => (
                                  <p key={j} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px', display: 'flex', alignItems: 'flex-start', gap: '6px', lineHeight: '1.5' }}>
                                    <span style={{ color: rc, flexShrink: 0, fontWeight: 700 }}>→</span> {p}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* FOCO DA SEMANA */}
              {aiData.analysis.meta_proximo_periodo && (
                <div style={{ background: 'linear-gradient(135deg, rgba(61,184,232,0.1), rgba(167,139,250,0.08))', border: '1px solid rgba(61,184,232,0.25)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#3DB8E8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🎯 PLANO DA PRÓXIMA SEMANA
                  </p>
                  <p style={{ fontSize: '13px', color: '#fff', lineHeight: '1.9', whiteSpace: 'pre-line' }}>{aiData.analysis.meta_proximo_periodo}</p>
                </div>
              )}

              {/* RODAPÉ */}
              <div style={{ textAlign: 'center', padding: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '8px' }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
                  Relatório gerado por Beemon • {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .grid-ai-2col { grid-template-columns: 1fr 1fr; }
        @media (max-width: 1100px) {
          .grid-resumo-top { grid-template-columns: 1fr !important; }
          .grid-resumo-bottom { grid-template-columns: 1fr !important; }
          .grid-ai-2col { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 900px) {
          .grid-professor { grid-template-columns: 1fr !important; }
          .grid-resumo-kpis { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .grid-resumo-kpis { grid-template-columns: 1fr !important; }
        }
        .no-print { display: flex; }
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .app-sidebar, .mobile-menu-btn, .app-main > *:not(#apresentacao-report):not(#ai-report) { display: none !important; }
          .app-main { margin-left: 0 !important; padding: 0 !important; }
          #ai-report, #apresentacao-report { display: block !important; }
          #ai-report *, #apresentacao-report * { color: #111 !important; background: #fff !important; border-color: #ddd !important; }
          #apresentacao-report p, #apresentacao-report span { color: #111 !important; }
        }
        .grid-apres-kpis { grid-template-columns: repeat(4, 1fr); }
        @media (max-width: 900px) {
          .grid-apres-kpis { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
