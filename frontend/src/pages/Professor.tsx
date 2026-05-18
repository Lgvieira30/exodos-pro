import React, { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Info, ChevronRight, Zap, Target, DollarSign, BarChart3, Activity,
  PauseCircle, ChevronDown, Layers, Image, TrendingDown as FunnelIcon,
  CalendarDays, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { metricsApi, analyzeApi, campaignsApi } from '../lib/api';
import { DateRangePicker, DateRange, defaultRange } from '../components/DateRangePicker';

const CYAN = '#3DB8E8';
const TEAL = '#00B7B7';

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
  good: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', label: 'Bom', icon: TrendingUp },
  warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', label: 'Atenção', icon: AlertTriangle },
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', label: 'Crítico', icon: TrendingDown },
};

const PRIORITY_COLOR: Record<string, string> = { alta: '#ef4444', media: '#f59e0b', baixa: '#10b981' };
const PLATFORM_LABEL: Record<string, string> = { meta: 'Meta Ads', google: 'Google Ads', linkedin: 'LinkedIn' };
const VERDICT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  reativar: { label: 'Reativar', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  reativar_com_cautela: { label: 'Revisar e Reativar', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  manter_pausada: { label: 'Manter Pausada', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function HealthGauge({ score }: { score: number }) {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const label = score >= 75 ? 'Excelente' : score >= 50 ? 'Atenção' : 'Crítico';
  const c = 2 * Math.PI * 52;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ position: 'relative', width: '130px', height: '130px' }}>
        <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="65" cy="65" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <circle cx="65" cy="65" r="52" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={c} strokeDashoffset={c - (score / 100) * c}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>{score}</span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '-2px' }}>/ 100</span>
        </div>
      </div>
      <span style={{ fontSize: '13px', fontWeight: 600, color }}>{label}</span>
    </div>
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

// ─── Funil Visual ─────────────────────────────────────────────────────────────

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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Professor() {
  const [tab, setTab] = useState<'geral' | 'campanha' | 'pausadas'>('geral');
  const [range, setRange] = useState<DateRange>(defaultRange());
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [metrics, setMetrics] = useState<any[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [healthScore, setHealthScore] = useState(0);
  const [usingMock, setUsingMock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deepData, setDeepData] = useState<DeepData | null>(null);
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepError, setDeepError] = useState<string | null>(null);
  const [pausedCampaigns, setPausedCampaigns] = useState<any[]>([]);

  // Load campaign list once
  useEffect(() => {
    campaignsApi.list().then((res) => {
      const list = res?.data?.campaigns || [];
      setCampaigns(list);
      if (list.length > 0 && !selectedCampaignId) setSelectedCampaignId(list[0].id);
    }).catch(() => {});
  }, []);

  // Load general metrics when range changes
  const loadGeneral = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, pausedRes] = await Promise.all([
        metricsApi.dashboard(range.from, range.to).catch(() => null),
        analyzeApi.paused().catch(() => null),
      ]);
      const s = metricsRes?.data?.summary;
      if (s && (s.spend > 0 || s.leads > 0)) {
        const roi = s.roas > 0 ? (s.roas - 1) * 100 : 0;
        buildMetrics(s.cpa || 0, s.roas || 0, s.ctr || 0, s.cpc || 0, roi);
        setUsingMock(false);
      } else {
        buildMetrics(47, 3.4, 1.8, 2.1, 240);
        setUsingMock(true);
      }
      if (pausedRes?.data?.paused) setPausedCampaigns(pausedRes.data.paused);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { loadGeneral(); }, [loadGeneral]);

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
      const msg = err?.response?.data?.error?.message || err?.message || 'Erro ao conectar com o backend';
      setDeepError(msg);
      setDeepData(null);
    } finally {
      setDeepLoading(false);
    }
  }, []);

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
        key: 'roas', label: 'ROAS', value: roas > 0 ? `${roas.toFixed(1)}x` : '--', raw: roas,
        status: getStatus('roas', roas), icon: TrendingUp,
        explanation: roas > 0 ? `Para cada R$1 investido você recupera R$${roas.toFixed(2)}. ${roas >= 3 ? 'Campanha gerando retorno real acima do custo.' : 'O retorno ainda não cobre bem os custos operacionais.'}` : 'Sem dados de ROAS. Aparece após a primeira conversão.',
        recommendation: roas >= 5 ? 'ROAS excepcional — escale 30-50% sem mexer na segmentação.' : roas >= 3 ? 'Bom ROAS. Aumente o orçamento 20% a cada 3-4 dias.' : roas >= 2 ? 'Revise a oferta e a landing page antes de escalar.' : roas > 0 ? 'Pause conjuntos ruins e revise público, criativo e oferta.' : 'Configure o pixel de conversão.',
        impact: roas >= 3 ? 'Escalar 20% → +20% proporcional' : 'Dobrar o ROAS é possível revisando criativo e funil',
        benchmark: 'Bom: 3x+ | Excelente: 5x+ | Escalar com segurança: 4x+',
      },
      {
        key: 'cpa', label: 'CPA (Custo por Lead)', value: cpa > 0 ? `R$ ${cpa.toFixed(2)}` : '--', raw: cpa,
        status: getStatus('cpa', cpa), icon: Target,
        explanation: cpa > 0 ? `Você paga R$${cpa.toFixed(2)} por lead. Com R$1.000 de orçamento: ~${Math.round(1000 / cpa)} leads. ${cpa <= 50 ? 'CPA saudável.' : 'CPA acima do ideal — revise o funil.'}` : 'Sem conversões ainda.',
        recommendation: cpa <= 30 ? 'CPA excelente — escale com confiança.' : cpa <= 50 ? `Pause anúncios acima de R$${(cpa * 1.5).toFixed(0)} e redirecione o budget.` : cpa <= 80 ? 'Revise headline, prova social, CTA e velocidade da LP.' : 'Pause e revise toda estrutura: segmentação, criativo, oferta.',
        impact: cpa <= 50 ? '−10% no CPA = +10% mais leads com mesmo orçamento' : `Chegar a R$50: +${cpa > 0 ? Math.round((cpa / 50 - 1) * 100) : 0}% mais leads`,
        benchmark: 'Excelente: < R$30 | Bom: R$30-50 | Atenção: R$50-80 | Crítico: > R$80',
      },
      {
        key: 'ctr', label: 'CTR (Taxa de Cliques)', value: ctr > 0 ? `${ctr.toFixed(2)}%` : '--', raw: ctr,
        status: getStatus('ctr', ctr), icon: Activity,
        explanation: ctr > 0 ? `${Math.round(ctr * 10)} em cada 1.000 pessoas clicam no seu anúncio. ${ctr >= 2 ? 'CTR acima de 2% — anúncio ressoa bem com a audiência.' : 'CTR baixo também encarece o CPC, pois o algoritmo penaliza anúncios com baixo engajamento.'}` : 'Sem dados de CTR ainda.',
        recommendation: ctr >= 3 ? 'CTR excelente — salve esse criativo e teste variações pequenas.' : ctr >= 1.5 ? 'Saudável. Teste 2-3 variações mudando um elemento por vez.' : ctr >= 0.8 ? 'Teste vídeo vs imagem, headline com pergunta e público mais específico.' : 'CTR crítico — mude completamente formato, ângulo e CTA.',
        impact: ctr < 1.5 ? 'Dobrar o CTR pode reduzir o CPC em até 40%' : 'CTR alto = algoritmo favorece no leilão',
        benchmark: 'Bom: 1.5%+ | Excelente: 3%+ | Crítico: < 0.8%',
      },
      {
        key: 'cpc', label: 'CPC (Custo por Clique)', value: cpc > 0 ? `R$ ${cpc.toFixed(2)}` : '--', raw: cpc,
        status: getStatus('cpc', cpc), icon: DollarSign,
        explanation: cpc > 0 ? `Cada clique custa R$${cpc.toFixed(2)}. ${cpc <= 2.5 ? 'CPC competitivo para o mercado brasileiro.' : 'CPC alto pode indicar concorrência elevada ou baixo score de relevância.'} CTR mais alto = CPC menor automaticamente.` : 'Sem dados de CPC ainda.',
        recommendation: cpc <= 1 ? 'CPC excelente — escale, tende a subir pouco.' : cpc <= 2.5 ? 'Competitivo. Melhore CTR e mire públicos com maior intenção.' : cpc <= 5 ? 'Revise sobreposição de audiências e melhore relevância do anúncio.' : 'CPC muito alto — teste Reels/Stories que costumam ser mais baratos.',
        impact: cpc > 2.5 ? `Chegar a R$2: +${cpc > 0 ? Math.round((cpc / 2 - 1) * 100) : 0}% mais cliques` : 'CPC baixo = mais cliques pelo mesmo investimento',
        benchmark: 'Excelente: < R$1 | Bom: R$1-2.50 | Atenção: R$2.50-5 | Crítico: > R$5',
      },
      {
        key: 'roi', label: 'ROI (Retorno sobre Investimento)', value: roi > 0 ? `${roi.toFixed(0)}%` : '--', raw: roi,
        status: getStatus('roi', roi), icon: BarChart3,
        explanation: roi > 0 ? `Para cada R$100 investidos você obtém R$${(100 + roi).toFixed(0)} de retorno — lucro de R$${roi.toFixed(0)} antes de outros custos. ${roi >= 150 ? 'ROI acima de 150% indica operação gerando valor real.' : 'ROI pode melhorar com otimização do funil.'}` : 'ROI aparece após os primeiros dados de receita.',
        recommendation: roi >= 300 ? 'ROI excepcional — escale e replique em outros produtos.' : roi >= 150 ? 'ROI saudável. Aumente orçamento 20%/semana monitorando o CPA.' : roi >= 50 ? 'Analise onde o funil perde leads — cada 10% de melhoria pode dobrar o ROI.' : 'Revise ticket médio vs CPA, taxa de fechamento e perfil do lead.',
        impact: roi >= 150 ? 'Replique em novos mercados ou produtos' : 'Cada +10% na taxa de conversão aumenta o ROI proporcionalmente',
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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${CYAN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const criticalCount = metrics.filter((m) => m.status === 'critical').length;
  const warningCount = metrics.filter((m) => m.status === 'warning').length;

  // ─── Render ───

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

        {/* Controls row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginTop: '16px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '10px' }}>
            {([['geral', 'Geral'], ['campanha', 'Por Campanha'], ['pausadas', 'Pausadas']] as const).map(([t, lbl]) => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', background: tab === t ? 'rgba(255,255,255,0.08)' : 'transparent', color: tab === t ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                {t === 'pausadas' && pausedCampaigns.length > 0 ? `Pausadas (${pausedCampaigns.length})` : lbl}
              </button>
            ))}
          </div>

          {/* Date range picker */}
          <DateRangePicker value={range} onChange={(r) => setRange(r)} />
        </div>

        {usingMock && tab === 'geral' && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#f59e0b', padding: '6px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', marginTop: '12px' }}>
            <AlertTriangle size={13} /> Exibindo dados de demonstração — sincronize o Meta Ads para ver sua análise real.
          </div>
        )}
      </div>

      {/* ─── TAB: GERAL ─── */}
      {tab === 'geral' && (
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
                {criticalCount > 0 ? `Foque nas ${criticalCount} métrica(s) crítica(s). Clique em cada cartão para ver a ação.` : warningCount > 0 ? `Otimize as ${warningCount} métrica(s) em atenção para subir de nível.` : 'Excelente! Escale — aumente o orçamento 20% nos melhores conjuntos.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: POR CAMPANHA ─── */}
      {tab === 'campanha' && (
        <div>
          {/* Campaign selector */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>CAMPANHA</p>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', padding: '8px 14px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', minWidth: '220px', cursor: 'pointer' }}
              >
                {campaigns.length === 0 && <option value="">Nenhuma campanha</option>}
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => doLoadDeep(selectedCampaignId, range)}
              disabled={deepLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-end', padding: '8px 16px', borderRadius: '10px', border: `1px solid ${CYAN}40`, background: `${CYAN}15`, color: CYAN, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: deepLoading ? 0.6 : 1 }}
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

                {/* Funil */}
                <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Funil de Conversão</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '16px' }}>Onde você perde volume</p>
                  <Funnel data={deepData.funnel} />
                </div>

                {/* Daily chart */}
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
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginLeft: '4px' }}>{deepData.adSets.length} conjuntos — ordenados por gasto</span>
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
                              <td style={{ padding: '12px 14px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                                {Number(as.cpc) > 0 ? `R$${Number(as.cpc).toFixed(2)}` : '—'}
                              </td>
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
                                <div style={{ display: 'inline-block' }}>
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

                {/* AI Recommendations */}
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

                {/* Projection */}
                {deepData.projection.daysRemaining > 0 && (
                  <div style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${CYAN}30`, borderRadius: '16px', padding: '20px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}><CalendarDays size={15} color={CYAN} /> Projeção de Fim de Mês</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '16px' }}>No ritmo atual — {deepData.projection.daysRemaining} dias restantes</p>
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
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '8px', lineHeight: '1.5' }}>
                      * Projeção baseada na média diária do período selecionado.
                    </p>
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
            const vc = VERDICT_CONFIG[c.verdict];
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .grid-professor { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
