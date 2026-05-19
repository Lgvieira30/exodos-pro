import React, { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Info, ChevronRight, Zap, Target, DollarSign, BarChart3, Activity,
  PauseCircle, ChevronDown, Layers, CalendarDays, RefreshCw,
  ArrowUpRight, ArrowDownRight, Minus, Users,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { metricsApi, analyzeApi, campaignsApi, aiApi } from '../lib/api';
import { DateRangePicker, DateRange, defaultRange } from '../components/DateRangePicker';

const GREEN = '#00FFB2';
const BG = '#080B14';
const BG_CARD = '#0D1117';
const BG_SUBTLE = '#111520';
const BLUE = '#00BFFF';
const FG = '#C9D1D9';
const FG_MUTED = 'rgba(201,209,217,0.55)';
const FG_SUBTLE = 'rgba(201,209,217,0.3)';
const BORDER = 'rgba(0,255,178,0.1)';
const BORDER_ACTIVE = 'rgba(0,255,178,0.25)';
const RED = '#FF3B5C';
const AMBER = '#FFB800';
const GLOW = '0 0 0 1px rgba(0,255,178,0.08), inset 0 1px 0 rgba(255,255,255,0.03)';
const SHADOW = GLOW;
const PRIORITY_COLOR: Record<string, string> = { alta: RED, media: AMBER, baixa: GREEN };
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
interface Ad {
  id: string; meta_id: string; name: string; status: string; ad_set_name: string;
  spend: number; impressions: number; clicks: number; leads: number;
  ctr: number; cpc: number; cpa: number; roas: number;
  score: number; action: AdSetAction;
}
interface DeepData {
  campaign: { id: string; name: string; platform: string };
  period: { from: string; to: string; days: number };
  summary: { spend: number; leads: number; clicks: number; impressions: number; conversions: number; cpa: number; roas: number; ctr: number; cpc: number };
  funnel: { impressions: number; ctr: number; clicks: number; clickToLeadRate: number; leads: number; conversions: number; revenueEst: number };
  daily: { date: string; label: string; spend: number; leads: number; ctr: number; cpa: number }[];
  adSets: AdSet[];
  ads: Ad[];
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
  excellent: { color: '#00FFB2', bg: 'rgba(0,255,178,0.08)',  border: 'rgba(0,255,178,0.2)',  label: 'Excelente', icon: CheckCircle },
  good:      { color: '#00BFFF', bg: 'rgba(0,191,255,0.08)',  border: 'rgba(0,191,255,0.2)',  label: 'Bom',       icon: TrendingUp },
  warning:   { color: '#FFB800', bg: 'rgba(255,184,0,0.08)',  border: 'rgba(255,184,0,0.2)',  label: 'Atenção',   icon: AlertTriangle },
  critical:  { color: '#FF3B5C', bg: 'rgba(255,59,92,0.08)',  border: 'rgba(255,59,92,0.2)',  label: 'Crítico',   icon: TrendingDown },
};

const VERDICT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  reativar:             { label: 'Reativar',          color: '#00FFB2', bg: 'rgba(0,255,178,0.08)',  border: 'rgba(0,255,178,0.2)' },
  reativar_com_cautela: { label: 'Revisar e Reativar', color: '#FFB800', bg: 'rgba(255,184,0,0.08)',  border: 'rgba(255,184,0,0.2)' },
  manter_pausada:       { label: 'Manter Pausada',    color: '#FF3B5C', bg: 'rgba(255,59,92,0.08)',  border: 'rgba(255,59,92,0.2)' },
};


// ─── Sub-components ───────────────────────────────────────────────────────────

function HealthGauge({ score, size = 130 }: { score: number; size?: number }) {
  const color = score >= 75 ? '#00FFB2' : score >= 50 ? '#FFB800' : '#FF3B5C';
  const label = score >= 75 ? 'Excelente' : score >= 50 ? 'Atenção' : 'Crítico';
  const r = size * 0.4;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,255,178,0.08)" strokeWidth="10" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={c} strokeDashoffset={c - (score / 100) * c}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: size * 0.215, fontWeight: 800, color: FG }}>{score}</span>
          <span style={{ fontSize: '10px', color: FG_MUTED, marginTop: '-2px' }}>/ 100</span>
        </div>
      </div>
      <span style={{ fontSize: '12px', fontWeight: 600, color }}>{label}</span>
    </div>
  );
}

function TrendBadge({ value, inverted = false }: { value: number | null | undefined; inverted?: boolean }) {
  if (value === null || value === undefined) return <span style={{ fontSize: '10px', color: FG_SUBTLE }}>—</span>;
  const isGood = inverted ? value <= 0 : value >= 0;
  const color = isGood ? '#00FFB2' : '#FF3B5C';
  const bg = isGood ? 'rgba(0,255,178,0.1)' : 'rgba(255,59,92,0.1)';
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
    <div onClick={onToggle} style={{ background: BG_CARD, border: `1px solid ${expanded ? GREEN + '50' : BORDER}`, borderRadius: '16px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: SHADOW }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: expanded ? '16px' : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={18} color={cfg.color} />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: FG_MUTED, marginBottom: '2px' }}>{metric.label}</p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: FG }}>{metric.value}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
          <ChevronRight size={16} color={FG_SUBTLE} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
      </div>
      {expanded && (
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: BG_SUBTLE, border: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: '11px', color: FG_MUTED, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><Info size={12} /> O QUE SIGNIFICA</p>
            <p style={{ fontSize: '13px', color: FG_MUTED, lineHeight: '1.6' }}>{metric.explanation}</p>
          </div>
          <div style={{ padding: '12px', borderRadius: '10px', background: cfg.bg, border: `1px solid ${cfg.border}` }}>
            <p style={{ fontSize: '11px', color: cfg.color, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><Zap size={12} /> RECOMENDAÇÃO</p>
            <p style={{ fontSize: '13px', color: FG_MUTED, lineHeight: '1.6' }}>{metric.recommendation}</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><p style={{ fontSize: '11px', color: FG_SUBTLE }}>Benchmark</p><p style={{ fontSize: '12px', color: FG_MUTED, fontWeight: 600 }}>{metric.benchmark}</p></div>
            <div style={{ textAlign: 'right' }}><p style={{ fontSize: '11px', color: FG_SUBTLE }}>Impacto estimado</p><p style={{ fontSize: '12px', color: cfg.color, fontWeight: 600 }}>{metric.impact}</p></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Funnel({ data }: { data: DeepData['funnel'] }) {
  const steps = [
    { label: 'Impressões', value: data.impressions.toLocaleString('pt-BR'), color: '#00BFFF', width: 100 },
    { label: `CTR ${data.ctr.toFixed(2)}%`, value: null, color: BORDER, width: 0, arrow: true },
    { label: 'Cliques', value: data.clicks.toLocaleString('pt-BR'), color: GREEN, width: data.impressions > 0 ? Math.max(12, (data.clicks / data.impressions) * 100 * 10) : 50 },
    { label: `Conv. ${data.clickToLeadRate.toFixed(1)}%`, value: null, color: BORDER, width: 0, arrow: true },
    { label: 'Leads', value: data.leads.toLocaleString('pt-BR'), color: '#00FFB2', width: data.clicks > 0 ? Math.max(8, (data.leads / data.clicks) * 100 * 10) : 30 },
    { label: 'Receita Est.', value: data.revenueEst > 0 ? `R$ ${data.revenueEst.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : '—', color: '#BD00FF', width: data.leads > 0 ? Math.max(6, (data.leads / data.clicks) * 80) : 20 },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {steps.map((step, i) => {
        if (step.arrow) return (
          <div key={i} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            <ChevronDown size={14} color={FG_SUBTLE} />
            <span style={{ fontSize: '11px', color: FG_MUTED, fontWeight: 600 }}>{step.label}</span>
            <ChevronDown size={14} color={FG_SUBTLE} />
          </div>
        );
        const w = Math.min(100, Math.max(25, step.width));
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <p style={{ fontSize: '11px', color: FG_MUTED }}>{step.label}</p>
            <div style={{ width: `${w}%`, background: `${step.color}12`, border: `1px solid ${step.color}35`, borderRadius: '8px', padding: '8px 16px', textAlign: 'center', transition: 'width 0.8s ease' }}>
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
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '16px 20px', boxShadow: SHADOW }}>
      <p style={{ fontSize: '11px', color: FG_MUTED, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ fontSize: '24px', fontWeight: 800, color: FG, marginBottom: '6px' }}>{value}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <TrendBadge value={change} inverted={inverted} />
        {sub && <span style={{ fontSize: '11px', color: FG_SUBTLE }}>{sub}</span>}
      </div>
    </div>
  );
}

function ActionCard({ action, rank }: { action: any; rank: number }) {
  const color = PRIORITY_COLOR[action.priority] || FG_SUBTLE;
  const rankColors = ['#FF3B5C', '#FFB800', '#00BFFF', '#00FFB2', '#BD00FF'];
  return (
    <div style={{ display: 'flex', gap: '14px', padding: '14px 16px', borderRadius: '12px', background: `${color}08`, border: `1px solid ${color}25`, alignItems: 'flex-start' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${rankColors[rank] || color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px', fontWeight: 800, color: rankColors[rank] || color }}>
        {rank + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: FG }}>{action.acao}</span>
          <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '10px', color, background: `${color}15`, flexShrink: 0 }}>{action.priority.toUpperCase()}</span>
        </div>
        <p style={{ fontSize: '11px', color: FG_MUTED, marginBottom: '4px' }}>{action.motivo}</p>
        <p style={{ fontSize: '11px', color: FG_SUBTLE, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Layers size={10} /> {action.campaign_name}
        </p>
      </div>
    </div>
  );
}

function CampaignScoreRow({ c, maxSpend }: { c: SummaryCampaign; maxSpend: number }) {
  const scoreColor = c.score >= 75 ? '#00FFB2' : c.score >= 50 ? '#FFB800' : '#FF3B5C';
  const barWidth = maxSpend > 0 ? Math.max(4, (c.score / 100) * 100) : 4;
  return (
    <div style={{ padding: '12px 0', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ flex: '0 0 auto' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${scoreColor}12`, border: `1px solid ${scoreColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: scoreColor }}>{c.score}</span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: FG, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
        <div style={{ display: 'flex', gap: '2px', height: '4px', borderRadius: '4px', background: `${BORDER}`, overflow: 'hidden' }}>
          <div style={{ width: `${barWidth}%`, background: scoreColor, borderRadius: '4px', transition: 'width 1s ease' }} />
        </div>
      </div>
      <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
        <p style={{ fontSize: '12px', fontWeight: 700, color: FG }}>R$ {c.total_spend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
        <p style={{ fontSize: '11px', color: FG_MUTED }}>{c.total_leads} leads</p>
      </div>
      <div style={{ flex: '0 0 auto', textAlign: 'right', minWidth: '70px' }}>
        <p style={{ fontSize: '10px', color: FG_SUBTLE, marginBottom: '1px' }}>CPL</p>
        <p style={{ fontSize: '12px', fontWeight: 700, color: c.avg_cpa > 150 ? '#FF3B5C' : c.avg_cpa > 60 ? '#FFB800' : c.avg_cpa > 0 ? '#00FFB2' : FG_SUBTLE }}>{c.avg_cpa > 0 ? `R$ ${c.avg_cpa.toFixed(0)}` : '—'}</p>
        <p style={{ fontSize: '10px', color: FG_SUBTLE, marginTop: '4px', marginBottom: '1px' }}>ROAS</p>
        <p style={{ fontSize: '12px', fontWeight: 700, color: c.avg_roas >= 3 ? '#00FFB2' : c.avg_roas > 0 ? '#FFB800' : FG_SUBTLE }}>{c.avg_roas > 0 ? `${c.avg_roas.toFixed(1)}x` : '—'}</p>
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

  // Expanded campaign detail (ad sets + ads) in Resumo tab
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [campaignDeepCache, setCampaignDeepCache] = useState<Record<string, DeepData>>({});
  const [loadingDeepId, setLoadingDeepId] = useState<string | null>(null);

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
        buildMetrics(Number(s.cpa) || 0, Number(s.roas) || 0, Number(s.ctr) || 0, Number(s.cpc) || 0, roi, Number(s.spend) || 0, Number(s.leads) || 0);
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

  // Load deep data for a campaign card in Resumo tab (with cache)
  const loadCampaignDeepForCard = useCallback(async (campaignId: string) => {
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
    } catch { /* silently ignore */ } finally {
      setLoadingDeepId(null);
    }
  }, [campaignDeepCache, expandedCampaignId, range]);

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

  function buildMetrics(cpa: number, roas: number, ctr: number, cpc: number, roi: number, spend = 0, leads = 0) {
    const cplFromLeads = leads > 0 && spend > 0 ? spend / leads : cpa;
    const leadsPerDay = leads > 0 ? (leads / 7).toFixed(1) : '0';
    const raw = [
      {
        key: 'roas', label: 'ROAS — Retorno sobre Gasto', value: roas > 0 ? `${roas.toFixed(1)}x` : '—', raw: roas,
        status: getStatus('roas', roas), icon: TrendingUp,
        explanation: roas > 0
          ? `Para cada R$1 investido você recupera R$${roas.toFixed(2)} em valor gerado. Pense assim: se você gastou R$1.000 e gerou R$${(roas * 1000).toFixed(0)} em negócios, seu ROAS é ${roas.toFixed(1)}x. ${roas >= 3 ? 'Isso significa que a campanha está lucrativa.' : roas >= 2 ? 'A campanha cobre seus custos, mas a margem é apertada.' : 'A campanha está custando mais do que gerando — precisa de ajuste urgente.'}`
          : 'ROAS ainda não calculado. Configure o pixel de conversão no Meta Ads para rastrear o valor dos leads.',
        recommendation: roas >= 5 ? 'ROAS excepcional. Escale 30-50%: aumente o orçamento diário sem mexer em mais nada. O algoritmo já encontrou o padrão certo.' : roas >= 3 ? 'Bom ROAS. Aumente o orçamento 20% a cada 3-4 dias. Não mexa na segmentação enquanto a escala é gradual.' : roas >= 2 ? 'Revise a oferta e a landing page — a página de destino provavelmente perde visitantes. Instale Hotjar para ver onde as pessoas saem.' : roas > 0 ? 'Pause os conjuntos com ROAS < 1. Revise público (lookalike funciona melhor que interesse frio) e mude o criativo.' : 'Configure o pixel do Meta Ads via Events Manager. Sem rastreamento, não há ROAS.',
        impact: roas >= 3 ? 'Escalar +20% no orçamento → +20% de retorno proporcional' : 'Dobrar o ROAS é possível revisando criativo e funil de conversão',
        benchmark: 'Crítico: < 1x | Atenção: 1-2x | Bom: 2-3x | Excelente: 3-5x | Escala: 4x+',
      },
      {
        key: 'cpa', label: 'CPL — Custo por Lead', value: cpa > 0 ? `R$ ${cpa.toFixed(2)}` : '—', raw: cpa,
        status: getStatus('cpa', cpa), icon: Target,
        explanation: cpa > 0
          ? `Você paga R$${cpa.toFixed(2)} para conseguir cada lead (contato interessado). Com R$1.000 de orçamento você obtém aproximadamente ${Math.round(1000 / cpa)} leads. ${cpa <= 50 ? 'Esse CPL permite escalar com margem.' : cpa <= 100 ? 'Aceitável para mercados de alto ticket. Verifique a qualidade dos leads.' : 'CPL alto — cada lead está custando caro. Prioridade: revisar o funil.'}`
          : 'Nenhuma conversão registrada ainda. Verifique se o pixel do Meta está configurado corretamente.',
        recommendation: cpa <= 30 ? 'CPL excelente! Escale com confiança — aumente o orçamento 25% hoje.' : cpa <= 50 ? `Muito bom. Identifique os anúncios com CPL abaixo de R$${(cpa * 0.8).toFixed(0)} e duplique o orçamento neles. Pause os acima de R$${(cpa * 1.5).toFixed(0)}.` : cpa <= 100 ? 'Revise sua landing page: headline, prova social (depoimentos), CTA e velocidade (ideal: < 3 segundos). Cada segundo a mais perde 10% dos visitantes.' : 'Pause campanhas com CPL > R$150. Revise o público (tente lookalike 1% de clientes existentes), o criativo e a oferta.',
        impact: cpa <= 50 ? `Com −10% no CPL você obtém +${Math.round(10 / (1 - 0.1))}% mais leads` : `Chegar a R$60: ${cpa > 0 ? '+' + Math.round((cpa / 60 - 1) * 100) + '% mais leads' : 'configure o pixel'}`,
        benchmark: 'Excelente: < R$30 | Bom: R$30-50 | Aceitável: R$50-100 | Crítico: > R$100',
      },
      {
        key: 'ctr', label: 'CTR — Taxa de Cliques no Anúncio', value: ctr > 0 ? `${ctr.toFixed(2)}%` : '—', raw: ctr,
        status: getStatus('ctr', ctr), icon: Activity,
        explanation: ctr > 0
          ? `A cada 1.000 pessoas que veem seu anúncio, ${Math.round(ctr * 10)} clicam. CTR mede a força do criativo: quanto mais alto, mais atraente é o anúncio para o público. ${ctr >= 3 ? 'Esse CTR indica que o criativo está muito alinhado com o público.' : ctr >= 1.5 ? 'CTR saudável. O anúncio está cumprindo seu papel.' : 'CTR baixo = o anúncio não está chamando a atenção. Possíveis causas: público errado, imagem genérica ou headline sem urgência.'}`
          : 'Dados de CTR ainda não disponíveis.',
        recommendation: ctr >= 3 ? 'CTR excepcional! Salve esse criativo como "modelo". Crie 2-3 variações mudando apenas a headline ou a cor do botão para descobrir o que exatamente funciona.' : ctr >= 1.5 ? 'CTR saudável. Teste vídeos curtos (15s) que mostram o problema → solução. Vídeos tipicamente geram 2-3x mais CTR que imagens estáticas.' : 'Ação imediata: 1) Troque a imagem por um vídeo de 15s. 2) Use headline com pergunta (ex: "Você ainda paga R$X por...?"). 3) Segmente público mais específico.',
        impact: ctr < 1.5 ? 'Dobrar o CTR de 0.8% para 1.6% pode reduzir o CPC em até 40%' : 'CTR alto = o algoritmo entrega para mais pessoas pelo mesmo custo',
        benchmark: 'Crítico: < 0.8% | Atenção: 0.8-1.5% | Bom: 1.5-3% | Excelente: > 3%',
      },
      {
        key: 'cpc', label: 'CPC — Custo por Clique', value: cpc > 0 ? `R$ ${cpc.toFixed(2)}` : '—', raw: cpc,
        status: getStatus('cpc', cpc), icon: DollarSign,
        explanation: cpc > 0
          ? `Cada vez que alguém clica no seu anúncio, você paga R$${cpc.toFixed(2)}. Esse valor é determinado pelo leilão do Meta Ads: criativo relevante + público certo = CPC mais barato. ${cpc <= 2 ? 'CPC competitivo — você está pagando pouco por cada visita.' : cpc <= 5 ? 'CPC aceitável. Há espaço para otimizar.' : 'CPC alto indica que o algoritmo não está encontrando o público certo, ou que há muita concorrência no seu segmento.'}`
          : 'Dados de CPC ainda não disponíveis.',
        recommendation: cpc <= 1 ? 'CPC excelente! Escale sem hesitar.' : cpc <= 2.5 ? 'Competitivo. Melhore o CTR para baixar ainda mais o CPC (existe relação direta).' : cpc <= 5 ? 'Revise sobreposição de audiências (no Audience Insights), use exclusões de público e verifique se há campanhas suas competindo entre si.' : 'CPC crítico. Possíveis soluções: 1) Ampliar o público (muito restrito = leilão caro). 2) Melhorar relevância do criativo. 3) Testar horários e dias diferentes.',
        impact: cpc > 2.5 ? `Chegar a R$2: +${cpc > 0 ? Math.round((cpc / 2 - 1) * 100) : 0}% mais cliques pelo mesmo orçamento` : 'CPC baixo = mais cliques pelo mesmo investimento',
        benchmark: 'Excelente: < R$1 | Bom: R$1-2.50 | Atenção: R$2.50-5 | Crítico: > R$5',
      },
      {
        key: 'roi', label: 'ROI — Retorno sobre Investimento', value: roi > 0 ? `${roi.toFixed(0)}%` : '—', raw: roi,
        status: getStatus('roi', roi), icon: BarChart3,
        explanation: roi > 0
          ? `Para cada R$100 investidos você obtém R$${(100 + roi).toFixed(0)} de retorno líquido, ou seja, um lucro de R$${roi.toFixed(0)} por cada R$100 gasto. ${roi >= 300 ? 'Excelente rentabilidade — cada real trabalha para você.' : roi >= 100 ? 'ROI positivo, campanha lucrativa.' : 'ROI ainda baixo — o negócio existe, mas a margem é apertada.'}`
          : 'ROI calculado a partir do ROAS. Configure o valor médio de um cliente para tornar esse dado mais preciso.',
        recommendation: roi >= 300 ? 'ROI excepcional! Duplique o investimento gradualmente (20%/semana) e replique a estratégia em novos públicos.' : roi >= 150 ? 'ROI saudável. Aumente 20% por semana e acompanhe se o ROI se mantém. Automatize relatórios semanais.' : roi > 0 ? 'Analise onde o funil perde: da impressão ao clique (CTR), do clique ao lead (taxa de conversão da LP) e do lead ao cliente (velocidade de atendimento).' : 'Instale rastreamento de conversão. Sem dados de receita, o ROI fica zerado mesmo com boa performance.',
        impact: roi >= 150 ? 'Com ROI de 150%+, escalar duplica os lucros em semanas' : 'Cada +10% na taxa de conversão da LP aumenta o ROI proporcionalmente',
        benchmark: 'Negativo: < 0% | Aceitável: 0-100% | Bom: 100-200% | Excelente: 200%+',
      },
      {
        key: 'leads', label: 'Volume de Leads', value: leads > 0 ? String(leads) : '—', raw: leads,
        status: leads >= 50 ? 'excellent' : leads >= 20 ? 'good' : leads >= 5 ? 'warning' : 'critical',
        icon: Users,
        explanation: leads > 0
          ? `Você gerou ${leads} leads no período. Isso equivale a ~${leadsPerDay} leads/dia. ${leads >= 50 ? 'Volume consistente — suficiente para o algoritmo otimizar bem.' : leads >= 20 ? 'Volume razoável, mas abaixo do ideal para aprendizado do Meta Ads.' : 'Volume baixo. O algoritmo precisa de pelo menos 50 conversões/semana por conjunto para otimizar com precisão.'}`
          : 'Nenhum lead registrado. Verifique o pixel de conversão e certifique-se que o evento "Lead" está disparando na página de obrigado.',
        recommendation: leads >= 50 ? `Excelente volume! Com ${Math.round(leads / 7)} leads/dia, o algoritmo está em fase de aprendizado acelerado. Mantenha o orçamento estável por pelo menos 7 dias.` : leads >= 20 ? 'Volume abaixo do ideal para o algoritmo do Meta. Tente consolidar conjuntos similares em um único conjunto com maior orçamento (meta: 50+ leads/semana por conjunto).' : leads > 0 ? 'Volume crítico para aprendizado. Ações: 1) Expanda o público-alvo. 2) Aumente o orçamento diário. 3) Simplifique o formulário de lead (menos campos = mais conversões).' : 'Configure o pixel corretamente. Crie um evento "Lead" no Gerenciador de Eventos do Meta e teste com a ferramenta de teste de eventos.',
        impact: leads < 50 ? 'Atingir 50 leads/semana ativa o aprendizado acelerado do Meta Ads' : `A cada +10 leads, o algoritmo refina 5% a precisão da segmentação`,
        benchmark: 'Crítico: < 5/semana | Atenção: 5-20/semana | Bom: 20-50/semana | Excelente: 50+/semana',
      },
      {
        key: 'spend', label: 'Distribuição do Orçamento', value: spend > 0 ? `R$ ${spend.toLocaleString('pt-BR')}` : '—', raw: spend,
        status: spend >= 1000 ? 'excellent' : spend >= 300 ? 'good' : spend >= 50 ? 'warning' : 'critical',
        icon: DollarSign,
        explanation: spend > 0
          ? `Você investiu R$${spend.toLocaleString('pt-BR')} no período. ${cplFromLeads > 0 ? `Cada real gasto gerou R$${(leads / spend).toFixed(3)} em leads — ou seja, ${leads} leads por R$${spend.toLocaleString('pt-BR')}.` : ''} ${spend >= 1000 ? 'Orçamento suficiente para testes robustos e otimização.' : spend >= 300 ? 'Orçamento moderado. Concentre em poucos conjuntos de alta performance.' : 'Orçamento baixo. Com menos de R$50/dia, o algoritmo do Meta tem dificuldade de sair da fase de aprendizado.'}`
          : 'Nenhum gasto registrado no período. Verifique se as campanhas estão ativas.',
        recommendation: spend >= 1000 ? 'Bom volume de investimento. Distribua 70% do orçamento nos conjuntos com melhor CPL e 30% em testes de novos públicos/criativos.' : spend >= 300 ? 'Concentre o orçamento em 1-2 conjuntos de melhor performance. Evite distribuir em muitos conjuntos com pouco orçamento — isso prejudica o aprendizado.' : 'Com orçamento limitado: 1) Use 1 único conjunto otimizado. 2) Segmentação ampla + criativo forte. 3) Meta de R$50/dia para sair do aprendizado em 7 dias.',
        impact: spend < 300 ? 'Dobrar o orçamento de R$100 para R$200/dia pode triplicar o volume de leads' : 'Regra: nunca aumente mais de 20% por vez para não resetar o aprendizado',
        benchmark: 'Crítico: < R$50 total | Atenção: R$50-300 | Bom: R$300-1.000 | Escala: R$1.000+',
      },
    ];
    setMetrics(raw);
    const w: Record<string, number> = { roas: 25, cpa: 25, ctr: 20, cpc: 15, roi: 10, leads: 3, spend: 2 };
    const s: Record<string, number> = { excellent: 100, good: 75, warning: 40, critical: 10 };
    let total = 0, wSum = 0;
    raw.forEach((m) => { const ww = w[m.key] || 10; total += (s[m.status] || 50) * ww; wSum += ww; });
    setHealthScore(Math.round(total / wSum));
    setExpandedKey(raw[0].key);
  }

  if (loading && tab === 'geral') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: BG }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${GREEN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const criticalCount = metrics.filter((m) => m.status === 'critical').length;
  const warningCount = metrics.filter((m) => m.status === 'warning').length;
  const hasData = summaryData && summaryData.overview.total_spend > 0;

  return (
    <div className="page-pad" style={{ minHeight: '100vh', background: BG, padding: '32px' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${GREEN}15`, border: `1px solid ${GREEN}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={20} color={GREEN} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: FG }}>Professor IA</h1>
            <p style={{ fontSize: '13px', color: FG_MUTED }}>Análise cirúrgica — por campanha, por período, com recomendações específicas</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginTop: '16px' }}>
          <div style={{ display: 'flex', gap: '4px', background: BG_SUBTLE, border: `1px solid ${BORDER}`, padding: '4px', borderRadius: '10px', flexWrap: 'wrap' }}>
            {([
              ['ia',            '✦ Análise IA'],
              ['apresentacao',  '📊 Apresentação'],
              ['resumo',        'Resumo'],
              ['geral',         'Geral'],
              ['campanha',      'Por Campanha'],
              ['pausadas',      pausedCampaigns.length > 0 ? `Pausadas (${pausedCampaigns.length})` : 'Pausadas'],
            ] as const).map(([t, lbl]) => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', background: tab === t ? (t === 'apresentacao' ? 'rgba(189,0,255,0.1)' : 'rgba(0,255,178,0.1)') : 'transparent', color: tab === t ? (t === 'apresentacao' ? '#BD00FF' : GREEN) : FG_MUTED, boxShadow: 'none' }}>
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
              <p style={{ fontSize: '14px', fontWeight: 700, color: FG }}>Análise por Inteligência Artificial</p>
              <p style={{ fontSize: '12px', color: FG_MUTED }}>Claude analisa suas campanhas, conjuntos e tendências como um especialista em tráfego pago</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {aiData && (
                <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: `1px solid ${BORDER_ACTIVE}`, background: 'rgba(0,255,178,0.06)', color: GREEN, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ↓ Exportar PDF
                </button>
              )}
              <button
                onClick={async () => { setAiLoading(true); setAiError(null); try { const r = await aiApi.professor(range.from, range.to); setAiData(r.data); } catch (e: any) { setAiError(e?.response?.data?.error?.message || 'Erro ao gerar análise'); } finally { setAiLoading(false); } }}
                disabled={aiLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', borderRadius: '10px', border: 'none', background: aiLoading ? `${GREEN}20` : GREEN, color: '#000', fontSize: '13px', fontWeight: 700, cursor: aiLoading ? 'wait' : 'pointer', fontFamily: 'inherit' }}
              >
                {aiLoading ? '⟳ Analisando...' : aiData ? '↺ Nova Análise' : '✦ Analisar Agora'}
              </button>
            </div>
          </div>

          {aiError && (
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,59,92,0.06)', border: '1px solid rgba(255,59,92,0.2)', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: RED, fontWeight: 600 }}>{aiError}</p>
              {aiError.includes('ANTHROPIC_API_KEY') && (
                <p style={{ fontSize: '12px', color: FG_MUTED, marginTop: '6px' }}>
                  Acesse <strong style={{ color: GREEN }}>console.anthropic.com</strong> → API Keys → crie uma chave → adicione como <code style={{ background: `${BORDER}`, padding: '1px 6px', borderRadius: '4px' }}>ANTHROPIC_API_KEY</code> no Easypanel.
                </p>
              )}
            </div>
          )}

          {aiLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: `3px solid ${GREEN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: '14px', color: FG_MUTED }}>Analisando suas campanhas...</p>
              <p style={{ fontSize: '12px', color: FG_SUBTLE }}>Calculando benchmarks e recomendações</p>
            </div>
          )}

          {!aiData && !aiLoading && !aiError && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '16px', background: BG_CARD, borderRadius: '20px', border: `1px dashed ${BORDER}`, boxShadow: SHADOW }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: `${GREEN}10`, border: `1px solid ${GREEN}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCap size={28} color={GREEN} />
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: FG }}>Professor IA pronto para analisar</p>
              <p style={{ fontSize: '13px', color: FG_MUTED, textAlign: 'center', maxWidth: '460px', lineHeight: '1.6' }}>
                Clique em "Analisar Agora" para receber diagnóstico completo baseado nos benchmarks reais de tráfego B2B: nota de 0-100, ações prioritárias com passos numerados, análise por campanha e plano para a semana.
              </p>
            </div>
          )}

          {aiData?.analysis && (
            <div id="ai-report">
              {/* Diagnóstico geral */}
              <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '24px', marginBottom: '16px', boxShadow: SHADOW }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '11px', color: GREEN, fontWeight: 700, letterSpacing: '0.5px', marginBottom: '8px' }}>DIAGNÓSTICO GERAL</p>
                    <p style={{ fontSize: '14px', color: FG, lineHeight: '1.7', fontWeight: 400, whiteSpace: 'pre-line' }}>{aiData.analysis.diagnostico_geral}</p>
                  </div>
                  {aiData.analysis.nota_geral != null && (
                    <HealthGauge score={aiData.analysis.nota_geral} size={110} />
                  )}
                </div>
                {aiData.analysis.insight_oculto && (
                  <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '10px', background: `${GREEN}08`, border: `1px solid ${GREEN}20` }}>
                    <p style={{ fontSize: '11px', color: GREEN, fontWeight: 700, marginBottom: '4px' }}>💡 INSIGHT OCULTO</p>
                    <p style={{ fontSize: '13px', color: FG_MUTED, lineHeight: '1.7', whiteSpace: 'pre-line' }}>{aiData.analysis.insight_oculto}</p>
                  </div>
                )}
              </div>

              {/* Alerta crítico */}
              {aiData.analysis.alerta_critico && (
                <div style={{ background: 'rgba(255,59,92,0.06)', border: '1px solid rgba(255,59,92,0.2)', borderRadius: '14px', padding: '16px 20px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <AlertTriangle size={18} color={RED} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: RED, marginBottom: '4px' }}>ALERTA CRÍTICO</p>
                    <p style={{ fontSize: '13px', color: FG_MUTED }}>{aiData.analysis.alerta_critico}</p>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }} className="grid-ai-2col">
                {/* O que está funcionando */}
                {aiData.analysis.o_que_esta_funcionando?.length > 0 && (
                  <div style={{ background: BG_CARD, border: '1px solid rgba(0,255,178,0.2)', borderRadius: '14px', padding: '20px', boxShadow: SHADOW }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: GREEN, marginBottom: '12px' }}>✓ O QUE ESTÁ FUNCIONANDO</p>
                    {aiData.analysis.o_que_esta_funcionando.map((item: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: GREEN, flexShrink: 0, marginTop: '7px' }} />
                        <p style={{ fontSize: '13px', color: FG_MUTED, lineHeight: '1.5' }}>{item}</p>
                      </div>
                    ))}
                  </div>
                )}
                {/* O que precisa melhorar */}
                {aiData.analysis.o_que_nao_esta_funcionando?.length > 0 && (
                  <div style={{ background: BG_CARD, border: '1px solid rgba(255,59,92,0.2)', borderRadius: '14px', padding: '20px', boxShadow: SHADOW }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: RED, marginBottom: '12px' }}>✗ O QUE PRECISA MELHORAR</p>
                    {aiData.analysis.o_que_nao_esta_funcionando.map((item: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: RED, flexShrink: 0, marginTop: '7px' }} />
                        <p style={{ fontSize: '13px', color: FG_MUTED, lineHeight: '1.5' }}>{item}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ações prioritárias */}
              {aiData.analysis.acoes_prioritarias?.length > 0 && (
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: SHADOW }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: FG, marginBottom: '16px' }}>Ações Prioritárias</p>
                  {aiData.analysis.acoes_prioritarias.map((a: any, i: number) => {
                    const pc = a.prioridade === 'URGENTE' ? '#FF3B5C' : a.prioridade === 'ALTA' ? '#FF3B5C' : '#FFB800';
                    return (
                      <div key={i} style={{ display: 'flex', gap: '14px', padding: '14px 16px', borderRadius: '12px', background: `${pc}06`, border: `1px solid ${pc}18`, marginBottom: '10px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: pc, background: `${pc}15`, padding: '3px 9px', borderRadius: '20px', flexShrink: 0, marginTop: '2px' }}>{a.prioridade}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: FG, marginBottom: '4px' }}>{a.titulo}</p>
                          <p style={{ fontSize: '12px', color: FG_MUTED, lineHeight: '1.8', marginBottom: '6px', whiteSpace: 'pre-line' }}>{a.descricao}</p>
                          {a.impacto_esperado && (
                            <p style={{ fontSize: '11px', color: '#00FFB2', fontWeight: 600 }}>↑ {a.impacto_esperado}</p>
                          )}
                          {a.campanha_ou_conjunto && a.campanha_ou_conjunto !== 'Geral' && (
                            <span style={{ fontSize: '11px', color: FG_SUBTLE, marginTop: '4px', display: 'block' }}>Campanha/Conjunto: {a.campanha_ou_conjunto}</span>
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
                  <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '20px', boxShadow: SHADOW }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: FG, marginBottom: '14px' }}>Por Campanha</p>
                    {aiData.analysis.analise_por_campanha.map((c: any, i: number) => {
                      const rc = c.recomendacao === 'ESCALAR' ? '#00FFB2' : c.recomendacao === 'PAUSAR' ? '#FF3B5C' : c.recomendacao === 'OTIMIZAR' ? '#FFB800' : '#00BFFF';
                      return (
                        <div key={i} style={{ padding: '12px', borderRadius: '10px', background: BG_SUBTLE, border: `1px solid ${BORDER}`, marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: FG, flex: 1, marginRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</p>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: rc, background: `${rc}12`, padding: '2px 8px', borderRadius: '12px', flexShrink: 0 }}>{c.recomendacao}</span>
                          </div>
                          <p style={{ fontSize: '12px', color: FG_MUTED, lineHeight: '1.5', marginBottom: '4px' }}>{c.diagnostico}</p>
                          <p style={{ fontSize: '11px', color: FG_SUBTLE }}>{c.motivo}</p>
                          {c.proximos_passos?.length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                              {c.proximos_passos.map((p: string, j: number) => (
                                <p key={j} style={{ fontSize: '11px', color: GREEN, marginBottom: '2px' }}>→ {p}</p>
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
                  <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '20px', boxShadow: SHADOW }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: FG, marginBottom: '14px' }}>Por Conjunto de Anúncios</p>
                    {aiData.analysis.analise_conjuntos.map((a: any, i: number) => {
                      const ac = a.acao === 'ESCALAR' ? '#00FFB2' : a.acao === 'PAUSAR' ? '#FF3B5C' : '#FFB800';
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', padding: '10px 12px', borderRadius: '10px', background: BG_SUBTLE, border: `1px solid ${BORDER}`, marginBottom: '6px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '12px', fontWeight: 600, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{a.nome}</p>
                            <p style={{ fontSize: '11px', color: FG_SUBTLE, marginBottom: '3px' }}>{a.campanha}</p>
                            <p style={{ fontSize: '11px', color: FG_MUTED }}>{a.motivo_rapido}</p>
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: ac, background: `${ac}12`, padding: '3px 8px', borderRadius: '10px', flexShrink: 0 }}>{a.acao}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Meta próximo período */}
              {aiData.analysis.meta_proximo_periodo && (
                <div style={{ background: `${GREEN}08`, border: `1px solid ${GREEN}25`, borderRadius: '14px', padding: '20px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: GREEN, marginBottom: '8px' }}>🎯 FOCO PARA OS PRÓXIMOS 7 DIAS</p>
                  <p style={{ fontSize: '13px', color: FG_MUTED, lineHeight: '1.8', whiteSpace: 'pre-line' }}>{aiData.analysis.meta_proximo_periodo}</p>
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
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${GREEN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}

          {!summaryLoading && !hasData && (
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '20px', padding: '60px', textAlign: 'center', boxShadow: SHADOW }}>
              <GraduationCap size={48} color={FG_SUBTLE} style={{ margin: '0 auto 20px' }} />
              <p style={{ fontSize: '18px', fontWeight: 700, color: FG, marginBottom: '10px' }}>Nenhum dado encontrado no período</p>
              <p style={{ fontSize: '14px', color: FG_MUTED, lineHeight: 1.7, maxWidth: '480px', margin: '0 auto 20px' }}>
                Para ver o Resumo Executivo, sincronize o Meta Ads com um token válido.<br />
                Vá em <strong style={{ color: GREEN }}>Configurações → Meta Ads → Sincronizar</strong>.
              </p>
            </div>
          )}

          {!summaryLoading && hasData && summaryData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Row 1: Score + KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '16px', alignItems: 'stretch' }} className="grid-resumo-top">
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: SHADOW }}>
                  <p style={{ fontSize: '11px', color: FG_MUTED, textAlign: 'center' }}>SAÚDE DA CONTA</p>
                  <HealthGauge score={summaryData.overview.health_score} size={110} />
                  <p style={{ fontSize: '11px', color: FG_SUBTLE, textAlign: 'center' }}>
                    {summaryData.overview.active_campaigns} camp. • {summaryData.period.days} dias
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }} className="grid-resumo-kpis">
                  <SummaryKpi label="Total Investido" value={`R$ ${summaryData.overview.total_spend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} change={summaryData.comparison.spend_change} sub="vs período anterior" />
                  <SummaryKpi label="Leads Gerados" value={summaryData.overview.total_leads.toLocaleString('pt-BR')} change={summaryData.comparison.leads_change} sub="contatos qualificados" />
                  <SummaryKpi label="Custo por Lead — CPL" value={summaryData.overview.avg_cpa > 0 ? `R$ ${summaryData.overview.avg_cpa.toFixed(0)}` : '—'} change={summaryData.comparison.cpa_change} inverted sub={summaryData.overview.avg_cpa > 0 ? (summaryData.overview.avg_cpa <= 60 ? '✅ Ótimo (< R$60)' : summaryData.overview.avg_cpa <= 150 ? '⚠️ Aceitável (< R$150)' : '❌ Alto (> R$150)') : 'quanto custa cada lead'} />
                  <SummaryKpi label="Retorno sobre Gasto — ROAS" value={summaryData.overview.avg_roas > 0 ? `${summaryData.overview.avg_roas.toFixed(1)}x` : '—'} change={summaryData.comparison.roas_change} sub={summaryData.overview.avg_roas > 0 ? (summaryData.overview.avg_roas >= 3 ? '✅ Ótimo (≥ 3x)' : summaryData.overview.avg_roas >= 2 ? '⚠️ Aceitável (≥ 2x)' : '❌ Baixo (< 2x)') : 'R$ de retorno por R$ gasto'} />
                </div>
              </div>

              {/* Row 2: Metrics row 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }} className="grid-resumo-kpis">
                {[
                  { label: 'Taxa de Cliques — CTR', abbr: 'De cada 100 que viram, quantas clicaram', value: summaryData.overview.avg_ctr > 0 ? `${summaryData.overview.avg_ctr.toFixed(2)}%` : '—', sub: summaryData.overview.avg_ctr >= 2.5 ? '✅ Excelente (≥ 2,5%)' : summaryData.overview.avg_ctr >= 1 ? '⚠️ Aceitável (≥ 1%)' : summaryData.overview.avg_ctr > 0 ? '❌ Baixo (< 1%)' : 'cliques ÷ impressões', color: summaryData.overview.avg_ctr >= 2.5 ? '#00FFB2' : summaryData.overview.avg_ctr >= 1 ? '#FFB800' : summaryData.overview.avg_ctr > 0 ? '#FF3B5C' : FG_SUBTLE },
                  { label: 'Custo por Clique — CPC', abbr: 'Quanto custa cada visita ao site', value: summaryData.overview.avg_cpc > 0 ? `R$ ${summaryData.overview.avg_cpc.toFixed(2)}` : '—', sub: summaryData.overview.avg_cpc <= 5 ? '✅ Bom (≤ R$5)' : summaryData.overview.avg_cpc <= 15 ? '⚠️ Médio (≤ R$15)' : summaryData.overview.avg_cpc > 0 ? '❌ Caro (> R$15)' : 'gasto ÷ cliques', color: summaryData.overview.avg_cpc <= 5 ? '#00FFB2' : summaryData.overview.avg_cpc <= 15 ? '#FFB800' : summaryData.overview.avg_cpc > 0 ? '#FF3B5C' : FG_SUBTLE },
                  { label: 'Total de Cliques', abbr: 'Pessoas que clicaram no anúncio', value: summaryData.overview.total_clicks > 0 ? summaryData.overview.total_clicks.toLocaleString('pt-BR') : '—', sub: 'no período selecionado', color: GREEN },
                  { label: 'Impressões — Alcance', abbr: 'Vezes que o anúncio apareceu na tela', value: summaryData.overview.total_impressions > 1000 ? `${(summaryData.overview.total_impressions / 1000).toFixed(1)}k` : summaryData.overview.total_impressions.toLocaleString('pt-BR'), sub: 'total de exibições', color: '#BD00FF' },
                ].map((item) => (
                  <div key={item.label} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '14px 16px', boxShadow: SHADOW }}>
                    <p style={{ fontSize: '11px', color: FG_MUTED, marginBottom: '2px', letterSpacing: '0.03em', fontWeight: 600 }}>{item.label}</p>
                    <p style={{ fontSize: '10px', color: FG_SUBTLE, marginBottom: '8px', lineHeight: 1.3 }}>{item.abbr}</p>
                    <p style={{ fontSize: '22px', fontWeight: 800, color: item.color, marginBottom: '4px', lineHeight: 1 }}>{item.value}</p>
                    <p style={{ fontSize: '11px', color: FG_SUBTLE }}>{item.sub}</p>
                  </div>
                ))}
              </div>

              {/* Row 3: O que fazer HOJE */}
              {summaryData.top_actions.length > 0 && (
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px', boxShadow: SHADOW }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${GREEN}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={15} color={GREEN} />
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: FG }}>O Que Fazer HOJE</p>
                      <p style={{ fontSize: '11px', color: FG_MUTED }}>Ações prioritárias baseadas nos dados do período</p>
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
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px', boxShadow: SHADOW }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: FG, marginBottom: '4px' }}>Ranking de Campanhas</p>
                  <p style={{ fontSize: '11px', color: FG_MUTED, marginBottom: '16px' }}>
                    Ordenado por score de saúde · período {summaryData.period.from.split('-').reverse().join('/')} → {summaryData.period.to.split('-').reverse().join('/')}
                  </p>
                  {summaryData.campaigns.length === 0 ? (
                    <p style={{ fontSize: '13px', color: FG_SUBTLE, padding: '20px 0', textAlign: 'center' }}>Nenhuma campanha com gasto no período.</p>
                  ) : (
                    [...summaryData.campaigns].sort((a, b) => b.score - a.score).map((c) => (
                      <CampaignScoreRow key={c.id} c={c} maxSpend={summaryData.campaigns[0]?.total_spend || 1} />
                    ))
                  )}
                </div>

                {/* Projeção */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {summaryData.projection.days_remaining > 0 && (
                    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px', boxShadow: SHADOW }}>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: FG, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CalendarDays size={15} color={GREEN} /> Projeção do Mês
                      </p>
                      <p style={{ fontSize: '11px', color: FG_MUTED, marginBottom: '16px' }}>
                        {summaryData.projection.days_remaining} dias restantes no mês
                      </p>
                      {[
                        { label: 'Gasto Projetado', value: `R$ ${summaryData.projection.projected_spend.toLocaleString('pt-BR')}`, color: '#00BFFF' },
                        { label: 'Leads Projetados', value: summaryData.projection.projected_leads.toLocaleString('pt-BR'), color: '#00FFB2' },
                        { label: 'CPA Projetado', value: summaryData.projection.projected_cpa > 0 ? `R$ ${summaryData.projection.projected_cpa}` : '—', color: summaryData.projection.projected_cpa > 60 ? '#FF3B5C' : '#00FFB2' },
                      ].map((item) => (
                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', background: BG_SUBTLE, border: `1px solid ${BORDER}`, marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: FG_MUTED }}>{item.label}</span>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: item.color }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Período comparativo info */}
                  <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '16px', boxShadow: SHADOW }}>
                    <p style={{ fontSize: '11px', color: FG_MUTED, marginBottom: '10px' }}>COMPARATIVO DE PERÍODO</p>
                    <p style={{ fontSize: '12px', color: FG_MUTED, marginBottom: '4px' }}>
                      Atual: <strong style={{ color: FG }}>{summaryData.period.from.split('-').reverse().join('/')} → {summaryData.period.to.split('-').reverse().join('/')}</strong>
                    </p>
                    <p style={{ fontSize: '12px', color: FG_SUBTLE }}>
                      Anterior: {summaryData.period.prev_from.split('-').reverse().join('/')} → {summaryData.period.prev_to.split('-').reverse().join('/')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Row 5: Campanhas ativas — análise detalhada */}
              {summaryData.campaigns.length > 0 && (
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px', boxShadow: SHADOW }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Activity size={15} color={GREEN} />
                    <p style={{ fontSize: '14px', fontWeight: 700, color: FG }}>Campanhas Ativas — Análise Completa</p>
                  </div>
                  <p style={{ fontSize: '11px', color: FG_MUTED, marginBottom: '20px' }}>
                    Cada campanha com saúde visual, métricas coloridas e diagnóstico em linguagem simples.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                    {summaryData.campaigns.map((c) => {
                      const scoreColor = c.score >= 75 ? '#00FFB2' : c.score >= 50 ? '#FFB800' : '#FF3B5C';
                      const scoreEmoji = c.score >= 75 ? '🟢' : c.score >= 50 ? '🟡' : '🔴';
                      const cplColor = c.avg_cpa <= 0 ? FG_SUBTLE : c.avg_cpa <= 60 ? '#00FFB2' : c.avg_cpa <= 150 ? '#FFB800' : '#FF3B5C';
                      const cplLabel = c.avg_cpa <= 0 ? '—' : c.avg_cpa <= 60 ? '✅ Ótimo' : c.avg_cpa <= 150 ? '⚠️ Aceitável' : '❌ Alto';
                      const ctrColor = c.avg_ctr <= 0 ? FG_SUBTLE : c.avg_ctr >= 2.5 ? '#00FFB2' : c.avg_ctr >= 1 ? '#FFB800' : '#FF3B5C';
                      const ctrLabel = c.avg_ctr <= 0 ? '—' : c.avg_ctr >= 2.5 ? '✅ Excelente' : c.avg_ctr >= 1 ? '⚠️ Aceitável' : '❌ Baixo';
                      const diag = c.total_leads === 0 && c.total_spend > 0
                        ? 'Investimento sem leads — verifique o pixel e a landing page.'
                        : c.avg_cpa <= 60 && c.avg_ctr >= 1
                          ? 'Campanha eficiente — boa candidata para aumentar o orçamento gradualmente.'
                          : c.avg_cpa > 150
                            ? 'CPL alto — revise a landing page e o criativo antes de investir mais.'
                            : c.avg_ctr < 1 && c.avg_ctr > 0
                              ? 'CTR baixo — o criativo não está chamando atenção. Teste nova imagem ou vídeo.'
                              : c.total_leads < 3
                                ? 'Volume pequeno — aguarde mais dados antes de tomar decisões.'
                                : 'Métricas aceitáveis — monitore e teste variações de criativo.';
                      return (
                        <div key={c.id} style={{ background: BG_SUBTLE, border: `1px solid ${scoreColor}25`, borderRadius: '14px', padding: '16px' }}>
                          {/* Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: '13px', fontWeight: 700, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>{c.name}</p>
                              <p style={{ fontSize: '11px', color: FG_SUBTLE }}>{PLATFORM_LABEL[c.platform] || c.platform} · {c.status === 'active' ? '🟢 Ativa' : c.status === 'paused' ? '⏸ Pausada' : c.status}</p>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                              <p style={{ fontSize: '24px', fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{c.score}</p>
                              <p style={{ fontSize: '9px', color: FG_SUBTLE, marginTop: '1px' }}>saúde</p>
                            </div>
                          </div>

                          {/* Métricas principais */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                            <div style={{ padding: '10px', borderRadius: '10px', background: BG_CARD, border: `1px solid ${cplColor}20` }}>
                              <p style={{ fontSize: '10px', color: FG_SUBTLE, marginBottom: '3px' }}>Custo por Lead (CPL)</p>
                              <p style={{ fontSize: '18px', fontWeight: 800, color: cplColor, lineHeight: 1 }}>{c.avg_cpa > 0 ? `R$ ${c.avg_cpa.toFixed(0)}` : '—'}</p>
                              <p style={{ fontSize: '10px', color: cplColor, marginTop: '3px', fontWeight: 600 }}>{cplLabel}</p>
                            </div>
                            <div style={{ padding: '10px', borderRadius: '10px', background: BG_CARD, border: `1px solid ${ctrColor}20` }}>
                              <p style={{ fontSize: '10px', color: FG_SUBTLE, marginBottom: '3px' }}>Taxa de Cliques (CTR)</p>
                              <p style={{ fontSize: '18px', fontWeight: 800, color: ctrColor, lineHeight: 1 }}>{c.avg_ctr > 0 ? `${c.avg_ctr.toFixed(2)}%` : '—'}</p>
                              <p style={{ fontSize: '10px', color: ctrColor, marginTop: '3px', fontWeight: 600 }}>{ctrLabel}</p>
                            </div>
                          </div>

                          {/* Métricas secundárias */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '10px' }}>
                            {[
                              { lbl: 'Investido', val: `R$ ${c.total_spend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, color: FG },
                              { lbl: 'Leads', val: String(c.total_leads), color: '#00FFB2' },
                              { lbl: 'ROAS', val: c.avg_roas > 0 ? `${c.avg_roas.toFixed(1)}x` : '—', color: c.avg_roas >= 3 ? '#00FFB2' : c.avg_roas >= 2 ? '#FFB800' : '#FF3B5C' },
                            ].map(({ lbl, val, color }) => (
                              <div key={lbl} style={{ textAlign: 'center', padding: '7px', borderRadius: '8px', background: BG_CARD, border: `1px solid ${BORDER}` }}>
                                <p style={{ fontSize: '10px', color: FG_SUBTLE, marginBottom: '2px' }}>{lbl}</p>
                                <p style={{ fontSize: '13px', fontWeight: 700, color }}>{val}</p>
                              </div>
                            ))}
                          </div>

                          {/* Diagnóstico */}
                          <div style={{ padding: '8px 10px', borderRadius: '8px', background: BG_CARD, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${scoreColor}` }}>
                            <p style={{ fontSize: '11px', color: FG_MUTED, lineHeight: 1.5 }}>{scoreEmoji} {diag}</p>
                          </div>

                          {/* Ação recomendada */}
                          {c.top_action && (
                            <div style={{ marginTop: '8px', padding: '8px 10px', borderRadius: '8px', background: `${PRIORITY_COLOR[c.top_action.priority] || FG_SUBTLE}08`, border: `1px solid ${PRIORITY_COLOR[c.top_action.priority] || FG_SUBTLE}20` }}>
                              <p style={{ fontSize: '10px', fontWeight: 700, color: PRIORITY_COLOR[c.top_action.priority] || FG_SUBTLE, marginBottom: '3px' }}>{c.top_action.priority.toUpperCase()}</p>
                              <p style={{ fontSize: '12px', color: FG, fontWeight: 600, marginBottom: '2px' }}>{c.top_action.acao}</p>
                              <p style={{ fontSize: '11px', color: FG_MUTED }}>{c.top_action.motivo}</p>
                            </div>
                          )}

                          {/* Expand button */}
                          <button
                            onClick={() => loadCampaignDeepForCard(c.id)}
                            style={{ marginTop: '10px', width: '100%', padding: '8px', borderRadius: '8px', border: `1px solid ${BORDER}`, background: expandedCampaignId === c.id ? `${GREEN}10` : BG_CARD, color: expandedCampaignId === c.id ? GREEN : FG_MUTED, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          >
                            {loadingDeepId === c.id ? '⟳ Carregando...' : expandedCampaignId === c.id ? '▲ Ocultar conjuntos e anúncios' : '▼ Ver conjuntos e anúncios'}
                          </button>

                          {/* Expanded: ad sets + ads */}
                          {expandedCampaignId === c.id && campaignDeepCache[c.id] && (() => {
                            const deep = campaignDeepCache[c.id];
                            return (
                              <div style={{ marginTop: '12px', borderTop: `1px solid ${BORDER}`, paddingTop: '12px' }}>
                                {/* Ad Sets */}
                                {deep.adSets.length > 0 && (
                                  <div style={{ marginBottom: '12px' }}>
                                    <p style={{ fontSize: '11px', fontWeight: 700, color: FG_MUTED, marginBottom: '8px', letterSpacing: '0.05em' }}>CONJUNTOS DE ANÚNCIOS ({deep.adSets.length})</p>
                                    {deep.adSets.map((as) => {
                                      const asColor = as.score >= 75 ? '#00FFB2' : as.score >= 50 ? '#FFB800' : '#FF3B5C';
                                      const isActive = as.status === 'active';
                                      const statusDot = as.status === 'active' ? '🟢' : as.status === 'paused' ? '⏸' : '⭕';
                                      return (
                                        <div key={as.id} style={{ padding: '10px 12px', borderRadius: '10px', background: BG_CARD, border: `1px solid ${asColor}20`, marginBottom: '6px' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                              <p style={{ fontSize: '12px', fontWeight: 600, color: isActive ? FG : FG_MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{statusDot} {as.name}</p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
                                              <span style={{ fontSize: '10px', fontWeight: 700, color: as.action.color, background: as.action.bg, padding: '2px 7px', borderRadius: '8px' }}>{as.action.label}</span>
                                              <span style={{ fontSize: '13px', fontWeight: 800, color: asColor }}>{as.score}</span>
                                            </div>
                                          </div>
                                          {isActive && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                                              {[
                                                { lbl: 'CPL', val: as.cpa > 0 ? `R$${as.cpa.toFixed(0)}` : '—', color: as.cpa <= 60 ? '#00FFB2' : as.cpa <= 150 ? '#FFB800' : '#FF3B5C' },
                                                { lbl: 'CTR', val: as.ctr > 0 ? `${as.ctr.toFixed(1)}%` : '—', color: as.ctr >= 2.5 ? '#00FFB2' : as.ctr >= 1 ? '#FFB800' : '#FF3B5C' },
                                                { lbl: 'Leads', val: String(as.leads), color: FG },
                                                { lbl: 'Gasto', val: `R$${Number(as.spend).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, color: FG },
                                              ].map(({ lbl, val, color }) => (
                                                <div key={lbl} style={{ textAlign: 'center', padding: '4px', borderRadius: '6px', background: BG_SUBTLE }}>
                                                  <p style={{ fontSize: '9px', color: FG_SUBTLE, marginBottom: '1px' }}>{lbl}</p>
                                                  <p style={{ fontSize: '12px', fontWeight: 700, color }}>{val}</p>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Individual Ads */}
                                {deep.ads && deep.ads.length > 0 && (
                                  <div>
                                    <p style={{ fontSize: '11px', fontWeight: 700, color: FG_MUTED, marginBottom: '8px', letterSpacing: '0.05em' }}>ANÚNCIOS INDIVIDUAIS ({deep.ads.length})</p>
                                    {deep.ads.map((ad) => {
                                      const adColor = ad.score >= 75 ? '#00FFB2' : ad.score >= 50 ? '#FFB800' : '#FF3B5C';
                                      const isActive = ad.status === 'active';
                                      const statusDot = ad.status === 'active' ? '🟢' : ad.status === 'paused' ? '⏸' : '⭕';
                                      return (
                                        <div key={ad.id} style={{ padding: '9px 12px', borderRadius: '9px', background: BG_CARD, border: `1px solid ${BORDER}`, marginBottom: '5px' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                              <p style={{ fontSize: '11px', fontWeight: 600, color: isActive ? FG : FG_SUBTLE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{statusDot} {ad.name}</p>
                                              <p style={{ fontSize: '10px', color: FG_SUBTLE, marginTop: '1px' }}>Conjunto: {ad.ad_set_name}</p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                              <span style={{ fontSize: '10px', fontWeight: 700, color: ad.action.color, background: ad.action.bg, padding: '1px 6px', borderRadius: '6px' }}>{ad.action.label}</span>
                                              <span style={{ fontSize: '12px', fontWeight: 800, color: adColor }}>{ad.score}</span>
                                            </div>
                                          </div>
                                          {isActive && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginTop: '6px' }}>
                                              {[
                                                { lbl: 'CPL', val: ad.cpa > 0 ? `R$${Number(ad.cpa).toFixed(0)}` : '—', color: Number(ad.cpa) <= 60 ? '#00FFB2' : Number(ad.cpa) <= 150 ? '#FFB800' : '#FF3B5C' },
                                                { lbl: 'CTR', val: ad.ctr > 0 ? `${Number(ad.ctr).toFixed(1)}%` : '—', color: Number(ad.ctr) >= 2.5 ? '#00FFB2' : Number(ad.ctr) >= 1 ? '#FFB800' : '#FF3B5C' },
                                                { lbl: 'CPC', val: ad.cpc > 0 ? `R$${Number(ad.cpc).toFixed(2)}` : '—', color: FG_MUTED },
                                                { lbl: 'Leads', val: String(ad.leads), color: '#00FFB2' },
                                                { lbl: 'Gasto', val: `R$${Number(ad.spend).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, color: FG },
                                              ].map(({ lbl, val, color }) => (
                                                <div key={lbl} style={{ textAlign: 'center', padding: '3px', borderRadius: '5px', background: BG_SUBTLE }}>
                                                  <p style={{ fontSize: '8px', color: FG_SUBTLE, marginBottom: '1px' }}>{lbl}</p>
                                                  <p style={{ fontSize: '11px', fontWeight: 700, color }}>{val}</p>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {deep.adSets.length === 0 && (!deep.ads || deep.ads.length === 0) && (
                                  <p style={{ fontSize: '12px', color: FG_SUBTLE, textAlign: 'center', padding: '12px' }}>Nenhum conjunto/anúncio sincronizado ainda.</p>
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

            </div>
          )}
        </div>
      )}

      {/* ─── TAB: GERAL ─── */}
      {tab === 'geral' && (
        <div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${GREEN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : noData ? (
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '20px', padding: '60px', textAlign: 'center', boxShadow: SHADOW }}>
              <GraduationCap size={48} color={FG_SUBTLE} style={{ margin: '0 auto 20px' }} />
              <p style={{ fontSize: '16px', fontWeight: 700, color: FG, marginBottom: '8px' }}>Sem dados no período selecionado</p>
              <p style={{ fontSize: '13px', color: FG_MUTED, lineHeight: 1.6 }}>
                Sincronize o Meta Ads em <strong style={{ color: GREEN }}>Configurações</strong> para ver a análise real.
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
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxShadow: SHADOW }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: FG_MUTED }}>Score de Saúde</p>
                  <HealthGauge score={healthScore} />
                  <div style={{ width: '100%', borderTop: `1px solid ${BORDER}`, paddingTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: FG_MUTED }}>Críticas</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: criticalCount > 0 ? '#FF3B5C' : '#00FFB2' }}>{criticalCount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: FG_MUTED }}>Atenção</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: warningCount > 0 ? '#FFB800' : '#00FFB2' }}>{warningCount}</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px', boxShadow: SHADOW }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: FG_MUTED, marginBottom: '12px' }}>Diagnóstico Rápido</p>
                  {metrics.map((m) => {
                    const cfg = STATUS_CONFIG[m.status as keyof typeof STATUS_CONFIG];
                    return (
                      <div key={m.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: FG_MUTED }}>{m.label.split(' ')[0]}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.color }} />
                          <span style={{ fontSize: '11px', color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ background: `${GREEN}08`, border: `1px solid ${GREEN}25`, borderRadius: '16px', padding: '20px' }}>
                  <p style={{ fontSize: '12px', color: GREEN, fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={13} /> PRÓXIMO PASSO</p>
                  <p style={{ fontSize: '13px', color: FG_MUTED, lineHeight: '1.6' }}>
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
              <p style={{ fontSize: '11px', color: FG_MUTED }}>CAMPANHA</p>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                style={{ background: '#0A0D16', border: `1px solid ${BORDER}`, borderRadius: '10px', color: FG, padding: '8px 14px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', minWidth: '220px', cursor: 'pointer', boxShadow: SHADOW }}
              >
                {campaigns.length === 0 && <option value="">Nenhuma campanha — sincronize o Meta Ads</option>}
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button
              onClick={() => selectedCampaignId && doLoadDeep(selectedCampaignId, range)}
              disabled={deepLoading || !selectedCampaignId}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-end', padding: '8px 16px', borderRadius: '10px', border: `1px solid ${GREEN}40`, background: `${GREEN}15`, color: GREEN, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: (deepLoading || !selectedCampaignId) ? 0.5 : 1 }}
            >
              <RefreshCw size={13} style={{ animation: deepLoading ? 'spin 1s linear infinite' : 'none' }} />
              {deepLoading ? 'Analisando...' : 'Analisar'}
            </button>
          </div>

          {deepLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${GREEN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}

          {!deepLoading && deepError && (
            <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255,59,92,0.06)', border: '1px solid rgba(255,59,92,0.2)', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#FF3B5C', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} /> Erro ao carregar análise
              </p>
              <p style={{ fontSize: '12px', color: FG_MUTED, marginBottom: '10px' }}>{deepError}</p>
              <p style={{ fontSize: '11px', color: FG_SUBTLE, lineHeight: 1.6 }}>
                Possíveis causas: token Meta expirado, backend não atualizado, ou campanha sem dados no período.
                <br />Atualize o token em <strong style={{ color: FG_MUTED }}>Configurações → Meta Ads</strong> e execute uma sincronização.
              </p>
            </div>
          )}

          {!deepLoading && !deepData && !deepError && (
            <div style={{ textAlign: 'center', padding: '60px', color: FG_SUBTLE }}>
              <GraduationCap size={40} color={FG_SUBTLE} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
              {campaigns.length === 0
                ? <><p style={{ fontSize: '14px', marginBottom: '8px', color: FG_MUTED }}>Nenhuma campanha encontrada.</p><p style={{ fontSize: '12px' }}>Sincronize o Meta Ads em Configurações para importar suas campanhas.</p></>
                : <><p style={{ fontSize: '14px', marginBottom: '8px', color: FG_MUTED }}>Selecione uma campanha para analisar.</p><p style={{ fontSize: '12px' }}>Você verá funil, ranking de conjuntos e projeção mensal.</p></>
              }
            </div>
          )}

          {!deepLoading && deepData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Score + Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '16px', background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px', boxShadow: SHADOW }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRight: `1px solid ${BORDER}`, paddingRight: '20px' }}>
                  <p style={{ fontSize: '11px', color: FG_MUTED }}>Score da Campanha</p>
                  <HealthGauge score={deepData.analysis.score} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {[
                    { label: 'Gasto', value: `R$ ${deepData.summary.spend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, color: '#00BFFF' },
                    { label: 'Leads', value: deepData.summary.leads.toLocaleString('pt-BR'), color: '#00FFB2' },
                    { label: 'CPA Médio', value: deepData.summary.cpa > 0 ? `R$ ${deepData.summary.cpa.toFixed(0)}` : '—', color: deepData.summary.cpa > 60 ? '#FF3B5C' : '#00FFB2' },
                    { label: 'ROAS', value: deepData.summary.roas > 0 ? `${deepData.summary.roas.toFixed(1)}x` : '—', color: deepData.summary.roas >= 3 ? '#00FFB2' : deepData.summary.roas >= 2 ? '#FFB800' : '#FF3B5C' },
                    { label: 'CTR Médio', value: deepData.summary.ctr > 0 ? `${deepData.summary.ctr.toFixed(2)}%` : '—', color: deepData.summary.ctr >= 1.5 ? '#00FFB2' : '#FFB800' },
                    { label: 'CPC Médio', value: deepData.summary.cpc > 0 ? `R$ ${deepData.summary.cpc.toFixed(2)}` : '—', color: FG },
                    { label: 'Cliques', value: deepData.summary.clicks.toLocaleString('pt-BR'), color: GREEN },
                    { label: 'Impressões', value: deepData.summary.impressions > 1000 ? `${(deepData.summary.impressions / 1000).toFixed(1)}k` : deepData.summary.impressions.toLocaleString('pt-BR'), color: '#BD00FF' },
                  ].map((item) => (
                    <div key={item.label} style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '10px', color: FG_SUBTLE, marginBottom: '4px' }}>{item.label}</p>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: item.color }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px' }}>
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px', boxShadow: SHADOW }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: FG, marginBottom: '4px' }}>Funil de Conversão</p>
                  <p style={{ fontSize: '11px', color: FG_MUTED, marginBottom: '16px' }}>Onde você perde volume</p>
                  <Funnel data={deepData.funnel} />
                </div>

                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px', boxShadow: SHADOW }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: FG, marginBottom: '4px' }}>Evolução Diária</p>
                  <p style={{ fontSize: '11px', color: FG_MUTED, marginBottom: '16px' }}>Gasto e leads por dia no período</p>
                  {deepData.daily.length === 0 ? (
                    <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <p style={{ fontSize: '12px', color: FG_SUBTLE, textAlign: 'center' }}>Sem dados diários para o período.<br />Sincronize o Meta Ads para ver a evolução.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={deepData.daily}>
                        <defs>
                          <linearGradient id="dBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00BFFF" stopOpacity={0.2} /><stop offset="100%" stopColor="#00BFFF" stopOpacity={0} /></linearGradient>
                          <linearGradient id="dGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00FFB2" stopOpacity={0.2} /><stop offset="100%" stopColor="#00FFB2" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,178,0.04)" />
                        <XAxis dataKey="label" stroke="transparent" tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ background: BG_CARD, border: `1px solid ${BORDER_ACTIVE}`, borderRadius: '8px', fontSize: '11px', color: FG }} />
                        <Area type="monotone" dataKey="spend" name="Gasto (R$)" stroke="#00BFFF" strokeWidth={2} fill="url(#dBlue)" dot={false} />
                        <Area type="monotone" dataKey="leads" name="Leads" stroke="#00FFB2" strokeWidth={2} fill="url(#dGreen)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Ad Set Ranking */}
              <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', overflow: 'hidden', boxShadow: SHADOW }}>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={15} color={GREEN} />
                  <p style={{ fontSize: '14px', fontWeight: 700, color: FG }}>Ranking dos Conjuntos</p>
                  <span style={{ fontSize: '11px', color: FG_SUBTLE, marginLeft: '4px' }}>{deepData.adSets.length} conjuntos</span>
                </div>
                {deepData.adSets.length === 0 ? (
                  <p style={{ padding: '24px', fontSize: '13px', color: FG_SUBTLE, textAlign: 'center' }}>Nenhum conjunto encontrado. Sincronize o Meta Ads primeiro.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${BORDER}`, background: BG_SUBTLE }}>
                          {['Conjunto', 'Status', 'Score', 'CTR', 'CPC', 'CPA', 'ROAS', 'Leads', 'Gasto', 'Ação'].map((h) => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Conjunto' ? 'left' : 'center', color: FG_MUTED, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {deepData.adSets.map((as) => {
                          const scoreColor = as.score >= 75 ? '#00FFB2' : as.score >= 55 ? '#00BFFF' : as.score >= 35 ? '#FFB800' : '#FF3B5C';
                          return (
                            <tr key={as.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                              <td style={{ padding: '12px 14px', color: FG, fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{as.name}</td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: as.status === 'active' ? '#00FFB2' : '#FFB800', margin: '0 auto' }} />
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: scoreColor }}>{as.score}</td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', color: Number(as.ctr) >= 1.5 ? '#00FFB2' : Number(as.ctr) >= 1 ? '#FFB800' : Number(as.ctr) > 0 ? '#FF3B5C' : FG_SUBTLE, fontWeight: 600 }}>
                                {Number(as.ctr) > 0 ? `${Number(as.ctr).toFixed(1)}%` : '—'}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', color: FG_MUTED }}>{Number(as.cpc) > 0 ? `R$${Number(as.cpc).toFixed(2)}` : '—'}</td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', color: Number(as.cpa) > 60 ? '#FF3B5C' : Number(as.cpa) > 0 ? '#00FFB2' : FG_SUBTLE, fontWeight: 600 }}>
                                {Number(as.cpa) > 0 ? `R$${Number(as.cpa).toFixed(0)}` : '—'}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', color: Number(as.roas) >= 3 ? '#00FFB2' : Number(as.roas) >= 2 ? '#FFB800' : Number(as.roas) > 0 ? '#FF3B5C' : FG_SUBTLE, fontWeight: 600 }}>
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
                                  <p style={{ fontSize: '10px', color: FG_SUBTLE, marginTop: '3px', maxWidth: '160px', lineHeight: '1.4' }}>{as.action.detail}</p>
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
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px', boxShadow: SHADOW }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: FG, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}><GraduationCap size={15} color={GREEN} /> Recomendações do Professor</p>
                  <p style={{ fontSize: '11px', color: FG_MUTED, marginBottom: '14px' }}>Baseado nas métricas do período selecionado</p>
                  {deepData.analysis.actions.slice(0, 4).map((action, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', borderRadius: '10px', marginBottom: '8px', background: `${PRIORITY_COLOR[action.priority]}06`, border: `1px solid ${PRIORITY_COLOR[action.priority]}18` }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: PRIORITY_COLOR[action.priority], flexShrink: 0, marginTop: '5px' }} />
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: FG, marginBottom: '2px' }}>{action.acao}</p>
                        <p style={{ fontSize: '11px', color: FG_MUTED }}>{action.motivo}</p>
                      </div>
                      <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, flexShrink: 0, padding: '2px 8px', borderRadius: '12px', color: PRIORITY_COLOR[action.priority], background: `${PRIORITY_COLOR[action.priority]}12` }}>{action.priority.toUpperCase()}</span>
                    </div>
                  ))}
                  {deepData.analysis.issues.length === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00FFB2' }}>
                      <CheckCircle size={16} />
                      <span style={{ fontSize: '13px' }}>Campanha sem problemas críticos detectados.</span>
                    </div>
                  )}
                </div>

                {deepData.projection.daysRemaining > 0 && (
                  <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px', boxShadow: SHADOW }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: FG, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}><CalendarDays size={15} color={GREEN} /> Projeção de Fim de Mês</p>
                    <p style={{ fontSize: '11px', color: FG_MUTED, marginBottom: '16px' }}>{deepData.projection.daysRemaining} dias restantes</p>
                    {[
                      { label: 'Total Gasto Est.', value: `R$ ${deepData.projection.projectedTotalSpend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, color: '#00BFFF' },
                      { label: 'Total Leads Est.', value: deepData.projection.projectedTotalLeads.toLocaleString('pt-BR'), color: '#00FFB2' },
                      { label: 'CPA Projetado', value: deepData.projection.projectedCpa > 0 ? `R$ ${deepData.projection.projectedCpa.toFixed(0)}` : '—', color: deepData.projection.projectedCpa > 60 ? '#FF3B5C' : '#00FFB2' },
                    ].map((item) => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', background: BG_SUBTLE, border: `1px solid ${BORDER}`, marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: FG_MUTED }}>{item.label}</span>
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
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: SHADOW }}>
              <PauseCircle size={32} color={FG_SUBTLE} style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '14px', color: FG_MUTED }}>Nenhuma campanha pausada.</p>
            </div>
          ) : pausedCampaigns.map((c: any) => {
            const vc = VERDICT_CONFIG[c.verdict] || VERDICT_CONFIG.reativar_com_cautela;
            return (
              <div key={c.id} style={{ background: BG_CARD, border: `1px solid ${vc.border}`, borderRadius: '16px', padding: '20px', boxShadow: SHADOW }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: FG, marginBottom: '4px' }}>{c.name}</p>
                    <p style={{ fontSize: '12px', color: FG_SUBTLE }}>{PLATFORM_LABEL[c.platform] || c.platform}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '12px', color: vc.color, background: vc.bg }}>{vc.label}</span>
                    <span style={{ fontSize: '11px', color: FG_SUBTLE }}>Score: {c.score}/100</span>
                  </div>
                </div>
                {c.total_spend > 0 && (
                  <div style={{ display: 'flex', gap: '20px', padding: '12px', borderRadius: '10px', background: BG_SUBTLE, border: `1px solid ${BORDER}`, marginBottom: '12px' }}>
                    {[
                      { l: 'CPA', v: `R$ ${c.avg_cpa.toFixed(0)}`, color: c.avg_cpa > 60 ? '#FF3B5C' : '#00FFB2' },
                      { l: 'ROAS', v: `${c.avg_roas.toFixed(1)}x`, color: c.avg_roas >= 3 ? '#00FFB2' : c.avg_roas >= 2 ? '#FFB800' : '#FF3B5C' },
                      { l: 'CTR', v: `${c.avg_ctr.toFixed(1)}%`, color: c.avg_ctr >= 1.5 ? '#00FFB2' : '#FFB800' },
                      { l: 'Leads', v: String(c.total_leads), color: FG },
                    ].map((item) => (
                      <div key={item.l}>
                        <p style={{ fontSize: '10px', color: FG_SUBTLE, marginBottom: '2px' }}>{item.l}</p>
                        <p style={{ fontSize: '16px', fontWeight: 700, color: item.color }}>{item.v}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ padding: '12px', borderRadius: '10px', background: vc.bg, border: `1px solid ${vc.border}` }}>
                  <p style={{ fontSize: '11px', color: vc.color, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><Zap size={12} /> RECOMENDAÇÃO DA IA</p>
                  <p style={{ fontSize: '13px', color: FG_MUTED, lineHeight: '1.6' }}>{c.verdict_reason}</p>
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '20px', background: BG_CARD, borderRadius: '20px', border: `1px dashed ${BORDER}`, boxShadow: SHADOW }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(189,0,255,0.08)', border: '1px solid rgba(189,0,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                📊
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: FG }}>Gere a análise primeiro</p>
              <p style={{ fontSize: '13px', color: FG_MUTED, textAlign: 'center', maxWidth: '380px', lineHeight: '1.6' }}>
                Vá para a aba "✦ Análise IA", clique em "Analisar Agora" e depois volte aqui para ver o relatório pronto para apresentar ao cliente.
              </p>
              <button
                onClick={() => setTab('ia')}
                style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'rgba(189,0,255,0.1)', color: '#BD00FF', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
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
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '10px', border: `1px solid ${BORDER}`, background: BG_CARD, color: FG_MUTED, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: SHADOW }}
                >
                  🖨️ Imprimir / Salvar PDF
                </button>
              </div>

              {/* CABEÇALHO DO RELATÓRIO */}
              <div style={{ background: `linear-gradient(135deg, ${GREEN}0A, rgba(189,0,255,0.05))`, border: `1px solid ${GREEN}20`, borderRadius: '20px', padding: '32px', marginBottom: '16px', boxShadow: SHADOW }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: FG_MUTED, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>Relatório de Performance</p>
                    <h2 style={{ fontSize: '26px', fontWeight: 800, color: FG, marginBottom: '4px' }}>Meta Ads</h2>
                    <p style={{ fontSize: '14px', color: FG_MUTED }}>
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
                    { label: 'Total Investido', value: `R$ ${Number(aiData.input_summary.total_spend).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: '💰', color: '#00BFFF', desc: 'Quanto foi gasto no período' },
                    { label: 'Leads Gerados', value: String(aiData.input_summary.total_leads), icon: '🎯', color: '#00FFB2', desc: 'Pessoas que demonstraram interesse' },
                    { label: 'Campanhas Ativas', value: String(aiData.input_summary.campaigns), icon: '📣', color: '#BD00FF', desc: 'Campanhas com investimento' },
                    { label: 'Conjuntos', value: String(aiData.input_summary.ad_sets), icon: '🗂️', color: '#FFB800', desc: 'Grupos de anúncios analisados' },
                  ].map((item) => (
                    <div key={item.label} style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '20px', textAlign: 'center', boxShadow: SHADOW }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
                      <p style={{ fontSize: '22px', fontWeight: 800, color: item.color, marginBottom: '4px' }}>{item.value}</p>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: FG, marginBottom: '2px' }}>{item.label}</p>
                      <p style={{ fontSize: '11px', color: FG_SUBTLE }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* ALERTA CRÍTICO */}
              {aiData.analysis.alerta_critico && (
                <div style={{ background: 'rgba(255,59,92,0.06)', border: '1px solid rgba(255,59,92,0.25)', borderRadius: '14px', padding: '18px 22px', marginBottom: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '22px', flexShrink: 0 }}>🚨</span>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 800, color: '#FF3B5C', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Atenção Imediata Necessária</p>
                    <p style={{ fontSize: '13px', color: FG_MUTED, lineHeight: '1.6', whiteSpace: 'pre-line' }}>{aiData.analysis.alerta_critico}</p>
                  </div>
                </div>
              )}

              {/* O QUE ESTÁ FUNCIONANDO / MELHORAR */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }} className="grid-ai-2col">
                {aiData.analysis.o_que_esta_funcionando?.length > 0 && (
                  <div style={{ background: 'rgba(0,255,178,0.06)', border: '1px solid rgba(0,255,178,0.2)', borderRadius: '16px', padding: '22px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#00FFB2', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      ✅ O QUE ESTÁ FUNCIONANDO
                    </p>
                    {aiData.analysis.o_que_esta_funcionando.map((item: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                        <span style={{ color: '#00FFB2', flexShrink: 0, fontWeight: 700 }}>✓</span>
                        <p style={{ fontSize: '13px', color: FG_MUTED, lineHeight: '1.6' }}>{item}</p>
                      </div>
                    ))}
                  </div>
                )}
                {aiData.analysis.o_que_nao_esta_funcionando?.length > 0 && (
                  <div style={{ background: 'rgba(255,59,92,0.06)', border: '1px solid rgba(255,59,92,0.2)', borderRadius: '16px', padding: '22px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#FF3B5C', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🔧 O QUE PRECISA MELHORAR
                    </p>
                    {aiData.analysis.o_que_nao_esta_funcionando.map((item: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                        <span style={{ color: '#FF3B5C', flexShrink: 0, fontWeight: 700 }}>!</span>
                        <p style={{ fontSize: '13px', color: FG_MUTED, lineHeight: '1.6' }}>{item}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AÇÕES PRIORITÁRIAS */}
              {aiData.analysis.acoes_prioritarias?.length > 0 && (
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '24px', marginBottom: '16px', boxShadow: SHADOW }}>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: FG, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⚡ Próximas Ações — O Que Fazer Agora
                  </p>
                  {aiData.analysis.acoes_prioritarias.map((a: any, i: number) => {
                    const pc = a.prioridade === 'URGENTE' ? '#FF3B5C' : a.prioridade === 'ALTA' ? '#FF3B5C' : '#FFB800';
                    const num = ['①', '②', '③', '④', '⑤', '⑥'][i] || `${i+1}.`;
                    return (
                      <div key={i} style={{ display: 'flex', gap: '16px', padding: '18px', borderRadius: '12px', background: `${pc}05`, border: `1px solid ${pc}18`, marginBottom: '12px', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <span style={{ fontSize: '18px', fontWeight: 800, color: pc }}>{num}</span>
                          <span style={{ fontSize: '9px', fontWeight: 700, color: pc, background: `${pc}12`, padding: '2px 6px', borderRadius: '10px', textAlign: 'center', whiteSpace: 'nowrap' }}>{a.prioridade}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '15px', fontWeight: 700, color: FG, marginBottom: '8px' }}>{a.titulo}</p>
                          <p style={{ fontSize: '13px', color: FG_MUTED, lineHeight: '1.8', marginBottom: '10px', whiteSpace: 'pre-line' }}>{a.descricao}</p>
                          {a.impacto_esperado && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,255,178,0.06)', border: '1px solid rgba(0,255,178,0.15)' }}>
                              <span style={{ fontSize: '14px' }}>📈</span>
                              <p style={{ fontSize: '12px', color: '#00FFB2', fontWeight: 600 }}>{a.impacto_esperado}</p>
                            </div>
                          )}
                          {a.campanha_ou_conjunto && a.campanha_ou_conjunto !== 'Geral' && (
                            <p style={{ fontSize: '11px', color: FG_SUBTLE, marginTop: '8px' }}>📌 {a.campanha_ou_conjunto}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ANÁLISE POR CAMPANHA */}
              {aiData.analysis.analise_por_campanha?.length > 0 && (
                <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '24px', marginBottom: '16px', boxShadow: SHADOW }}>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: FG, marginBottom: '18px' }}>📣 Análise por Campanha</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {aiData.analysis.analise_por_campanha.map((c: any, i: number) => {
                      const rc = c.recomendacao === 'ESCALAR' ? '#00FFB2' : c.recomendacao === 'PAUSAR' ? '#FF3B5C' : c.recomendacao === 'OTIMIZAR' ? '#FFB800' : '#00BFFF';
                      const rcEmoji = c.recomendacao === 'ESCALAR' ? '🚀' : c.recomendacao === 'PAUSAR' ? '⏸️' : c.recomendacao === 'OTIMIZAR' ? '⚙️' : '👀';
                      return (
                        <div key={i} style={{ border: `1px solid ${rc}20`, borderRadius: '14px', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: `${rc}06`, borderBottom: `1px solid ${rc}15` }}>
                            <p style={{ fontSize: '14px', fontWeight: 700, color: FG }}>{c.nome}</p>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: rc, background: `${rc}12`, padding: '4px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {rcEmoji} {c.recomendacao}
                            </span>
                          </div>
                          <div style={{ padding: '14px 18px', background: BG_CARD }}>
                            <p style={{ fontSize: '13px', color: FG_MUTED, lineHeight: '1.6', marginBottom: '8px' }}>{c.diagnostico}</p>
                            <p style={{ fontSize: '12px', color: FG_SUBTLE, lineHeight: '1.6', marginBottom: c.proximos_passos?.length ? '10px' : '0' }}>{c.motivo}</p>
                            {c.proximos_passos?.length > 0 && (
                              <div style={{ paddingTop: '10px', borderTop: `1px solid ${BORDER}` }}>
                                <p style={{ fontSize: '11px', color: FG_SUBTLE, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Próximos passos</p>
                                {c.proximos_passos.map((p: string, j: number) => (
                                  <p key={j} style={{ fontSize: '12px', color: FG_MUTED, marginBottom: '4px', display: 'flex', alignItems: 'flex-start', gap: '6px', lineHeight: '1.5' }}>
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
                <div style={{ background: `${GREEN}08`, border: `1px solid ${GREEN}20`, borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: GREEN, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🎯 PLANO DA PRÓXIMA SEMANA
                  </p>
                  <p style={{ fontSize: '13px', color: FG_MUTED, lineHeight: '1.9', whiteSpace: 'pre-line' }}>{aiData.analysis.meta_proximo_periodo}</p>
                </div>
              )}

              {/* RODAPÉ */}
              <div style={{ textAlign: 'center', padding: '20px', borderTop: `1px solid ${BORDER}`, marginTop: '8px' }}>
                <p style={{ fontSize: '11px', color: FG_SUBTLE }}>
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
