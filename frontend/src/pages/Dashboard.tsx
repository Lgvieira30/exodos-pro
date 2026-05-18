import React, { useEffect, useState, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, Zap, Plus, Target, RefreshCw, AlertTriangle, CheckCircle, ArrowRight, PauseCircle, Brain, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { campaignsApi, metricsApi, syncApi, analyzeApi } from '../lib/api';
import { DateRangePicker, DateRange, defaultRange } from '../components/DateRangePicker';

const CYAN = '#3DB8E8';

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

const VERDICT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  reativar:             { label: 'Reativar',            color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  reativar_com_cautela: { label: 'Revisar e Reativar', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  manter_pausada:       { label: 'Manter Pausada',      color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Ativa',      color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  paused:    { label: 'Pausada',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  draft:     { label: 'Rascunho',  color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  completed: { label: 'Concluida', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  alta:  { label: 'URGENTE', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  media: { label: 'ALTA',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  baixa: { label: 'MÉDIA',   color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
};

const PLATFORM_LABEL: Record<string, string> = {
  meta: 'Meta Ads', google: 'Google Ads', linkedin: 'LinkedIn',
};

// ─── Saúde da campanha: semáforo baseado em CPL vs benchmark ───────────────
function getCampaignHealthDot(avgCpa: number, avgCtr: number): { dot: string; label: string; color: string } {
  if (avgCpa <= 0 && avgCtr <= 0) return { dot: '⚪', label: 'Sem dados', color: '#64748b' };
  const cplOk = avgCpa > 0 && avgCpa <= 60;
  const cplMid = avgCpa > 0 && avgCpa <= 150;
  const ctrOk = avgCtr >= 2.5;
  const ctrMid = avgCtr >= 1;
  // Verde: CPL ótimo E CTR aceitável ou sem CPL mas CTR ótimo
  if ((cplOk && (ctrOk || ctrMid)) || (avgCpa <= 0 && ctrOk)) return { dot: '🟢', label: 'Saudável', color: '#10b981' };
  // Amarelo: CPL aceitável OU CTR médio
  if (cplMid || ctrMid) return { dot: '🟡', label: 'Atenção', color: '#f59e0b' };
  // Vermelho
  return { dot: '🔴', label: 'Crítico', color: '#ef4444' };
}

// ─── Frase diagnóstica em linguagem natural ─────────────────────────────────
function buildDiagnosticSentence(analysis: Analysis, summary: any): string {
  const score = analysis.score;
  const spend = summary?.spend || 0;
  const leads = summary?.leads || 0;
  const cpa = summary?.cpa || 0;

  if (score >= 75) {
    return 'Suas campanhas estão performando bem — métricas dentro dos benchmarks B2B. Continue monitorando o CPL semanalmente.';
  }
  if (spend > 0 && leads === 0) {
    return 'Você está investindo em anúncios mas não está gerando leads — verifique se o formulário ou a página de destino está funcionando corretamente.';
  }
  if (spend > 0 && leads > 0 && cpa > 150) {
    return 'Você está gerando leads, mas o custo por lead está alto demais — revise o público-alvo, o criativo e a página de destino para reduzir o CPL.';
  }
  if (spend > 0 && leads > 0 && cpa > 60) {
    return 'Você está gastando bem mas o custo por lead ainda pode melhorar — teste novos criativos e refine o público para chegar abaixo de R$60 por lead.';
  }
  if (analysis.issues.length > 0) {
    return 'Foram detectados pontos de atenção nas suas campanhas — revise as ações recomendadas abaixo para melhorar os resultados.';
  }
  return 'Análise em andamento — adicione métricas reais para obter um diagnóstico preciso das suas campanhas.';
}

// ─── Barra de benchmark horizontal ─────────────────────────────────────────
interface BenchmarkBarProps {
  label: string;
  abbreviation: string;
  value: number | null;
  unit: 'currency' | 'percent';
  zones: { max: number; color: string; label: string }[]; // ordered low→high
  higherIsBetter: boolean;
}

function BenchmarkBar({ label, abbreviation, value, unit, zones, higherIsBetter }: BenchmarkBarProps) {
  const maxZone = zones[zones.length - 1].max;
  const clampedVal = value !== null ? Math.min(value, maxZone * 1.05) : null;
  const pct = clampedVal !== null ? Math.min((clampedVal / maxZone) * 100, 100) : null;

  // Determine status label and emoji
  let statusEmoji = '—';
  let statusLabel = 'Sem dados';
  let statusColor = '#64748b';

  if (value !== null && value > 0) {
    if (higherIsBetter) {
      if (value >= zones[zones.length - 1].max * 0.6) { statusEmoji = '✅'; statusLabel = 'Excelente'; statusColor = '#10b981'; }
      else if (value >= zones[0].max) { statusEmoji = '⚠️'; statusLabel = 'Aceitável'; statusColor = '#f59e0b'; }
      else { statusEmoji = '🔴'; statusLabel = 'Baixo'; statusColor = '#ef4444'; }
    } else {
      if (value <= zones[0].max) { statusEmoji = '✅'; statusLabel = 'Ótimo'; statusColor = '#10b981'; }
      else if (value <= zones[1].max) { statusEmoji = '⚠️'; statusLabel = 'Aceitável'; statusColor = '#f59e0b'; }
      else { statusEmoji = '🔴'; statusLabel = 'Alto'; statusColor = '#ef4444'; }
    }
  }

  const formatVal = (v: number) => unit === 'currency' ? `R$ ${v.toFixed(0)}` : `${v.toFixed(1)}%`;
  const currentFormatted = value !== null && value > 0 ? (unit === 'currency' ? `R$ ${value.toFixed(2)}` : `${value.toFixed(2)}%`) : '--';

  // Zone widths as percentages of maxZone
  const zoneWidths = zones.map((z, i) => {
    const prev = i === 0 ? 0 : zones[i - 1].max;
    return ((z.max - prev) / maxZone) * 100;
  });

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
        <div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{label}</span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginLeft: '4px' }}>— {abbreviation}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '16px', fontWeight: 800, color: statusColor }}>{currentFormatted}</span>
          <span style={{ fontSize: '11px' }}>{statusEmoji}</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: statusColor }}>{statusLabel}</span>
        </div>
      </div>

      {/* Bar track */}
      <div style={{ position: 'relative', height: '10px', borderRadius: '6px', overflow: 'hidden', display: 'flex', marginBottom: '4px' }}>
        {zones.map((zone, i) => (
          <div
            key={i}
            style={{
              height: '100%',
              width: `${zoneWidths[i]}%`,
              background: zone.color,
              opacity: 0.35,
            }}
          />
        ))}
        {/* Overlay dot for current value */}
        {pct !== null && value !== null && value > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: `${pct}%`,
              transform: 'translate(-50%, -50%)',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: statusColor,
              border: '2px solid #0f172a',
              boxShadow: `0 0 6px ${statusColor}80`,
              zIndex: 2,
            }}
          />
        )}
      </div>

      {/* Zone labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
        {zones.map((zone, i) => (
          <span key={i} style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', flex: 1 }}>
            {i === 0 ? `≤ ${formatVal(zone.max)}` : i === zones.length - 1 ? `> ${formatVal(zones[i - 1].max)}` : formatVal(zone.max)}
            <br />
            <span style={{ color: zone.color, opacity: 0.8 }}>{zone.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Bloco de benchmarks completo ───────────────────────────────────────────
function BenchmarkStrip({ cpl, ctr, cpc }: { cpl: number; ctr: number; cpc: number }) {
  const cplZones = [
    { max: 60,  color: '#10b981', label: 'Excelente' },
    { max: 150, color: '#f59e0b', label: 'Aceitável' },
    { max: 300, color: '#ef4444', label: 'Alto' },
  ];
  const ctrZones = [
    { max: 1.0, color: '#ef4444', label: 'Baixo' },
    { max: 2.5, color: '#f59e0b', label: 'Aceitável' },
    { max: 5.0, color: '#10b981', label: 'Excelente' },
  ];
  const cpcZones = [
    { max: 5,  color: '#10b981', label: 'Excelente' },
    { max: 15, color: '#f59e0b', label: 'Aceitável' },
    { max: 40, color: '#ef4444', label: 'Alto' },
  ];

  return (
    <div style={{
      background: 'rgba(15,23,42,0.8)',
      border: `1px solid ${CYAN}20`,
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <BarChart2 size={16} color={CYAN} />
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Situação vs. Mercado</p>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginLeft: '2px' }}>— Benchmarks B2B Meta Ads</span>
      </div>
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '16px', lineHeight: '1.5' }}>
        Compare suas métricas com o que é considerado bom, aceitável e alto no mercado B2B brasileiro no Meta Ads.
        O ponto colorido mostra exatamente onde você está.
      </p>
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <BenchmarkBar
          label="Custo por Lead"
          abbreviation="CPL"
          value={cpl}
          unit="currency"
          zones={cplZones}
          higherIsBetter={false}
        />
        <BenchmarkBar
          label="Taxa de Cliques"
          abbreviation="CTR"
          value={ctr}
          unit="percent"
          zones={ctrZones}
          higherIsBetter={true}
        />
        <BenchmarkBar
          label="Custo por Clique"
          abbreviation="CPC"
          value={cpc}
          unit="currency"
          zones={cpcZones}
          higherIsBetter={false}
        />
      </div>
    </div>
  );
}

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

  const load = useCallback(async (r: DateRange) => {
    try {
      const [metricsRes, campaignsRes, syncStatusRes] = await Promise.all([
        metricsApi.dashboard(r.from, r.to).catch(() => null),
        campaignsApi.list(r.from, r.to).catch(() => ({ campaigns: [] })),
        syncApi.status().catch(() => null),
      ]);
      setSummary(metricsRes?.data?.summary || { spend: 0, leads: 0, cpa: 0, roas: 0, campaigns: 0 });
      setWeekly(metricsRes?.data?.weekly || []);
      setCampaigns(campaignsRes?.data?.campaigns || []);

      const metaIntegration = (syncStatusRes?.data?.integrations || []).find((i: any) => i.platform === 'meta');
      if (metaIntegration) {
        setLastSync({ at: metaIntegration.last_sync_at, status: metaIntegration.last_sync_status });
      }

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

  useEffect(() => { load(range); }, [range]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSync() {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await syncApi.meta();
      setSyncMsg(res.data?.message || res.message || 'Sincronizado com sucesso!');
      await load(range);
    } catch (err: any) {
      setSyncMsg(err.response?.data?.error?.message || 'Erro ao sincronizar. Configure o Meta Ads em Configuracoes.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 5000);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${CYAN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // Derive CPC for benchmark: spend / clicks. If not available, approximate from CTR + spend
  // The summary doesn't expose clicks directly, so we compute CPC as spend / (leads * 10) as fallback
  // — this will be replaced with real data when the API exposes clicks.
  const avgCtr = campaigns.filter(c => c.avg_ctr > 0).reduce((acc, c, _, arr) => acc + c.avg_ctr / arr.length, 0);
  const avgCpc = campaigns.filter(c => c.total_spend > 0 && c.avg_ctr > 0)
    .reduce((acc, c, _, arr) => {
      const estClicks = (c.avg_ctr / 100) * 1000; // rough estimate
      return acc + (c.total_spend / Math.max(estClicks, 1)) / arr.length;
    }, 0);

  const kpis = [
    {
      label: 'Total Investido',
      abbr: null,
      value: `R$ ${(summary?.spend || 0).toLocaleString('pt-BR')}`,
      icon: DollarSign,
      color: '#3b82f6',
      tooltip: 'Quanto foi gasto em anúncios no período selecionado.',
    },
    {
      label: 'Leads Gerados',
      abbr: null,
      value: (summary?.leads || 0).toLocaleString('pt-BR'),
      icon: Users,
      color: '#10b981',
      tooltip: 'Número de pessoas que demonstraram interesse (preencheram formulário, enviaram mensagem, etc.).',
    },
    {
      label: 'Custo por Lead',
      abbr: 'CPL',
      value: summary?.cpa > 0 ? `R$ ${Number(summary.cpa).toFixed(2)}` : '--',
      icon: Target,
      color: '#f97316',
      tooltip: 'Quanto você pagou em média para cada pessoa interessada. Benchmark B2B Meta Ads: ótimo abaixo de R$60, aceitável até R$150.',
    },
    {
      label: 'Retorno sobre Gasto',
      abbr: 'ROAS',
      value: summary?.roas > 0 ? `${Number(summary.roas).toFixed(1)}x` : '--',
      icon: Zap,
      color: '#a78bfa',
      tooltip: 'Para cada R$1 investido em anúncios, quanto voltou em receita. Ex: ROAS 3x = R$3 de retorno para cada R$1 gasto.',
    },
  ];

  const scoreColor = !analysis ? '#64748b' : analysis.score >= 75 ? '#10b981' : analysis.score >= 50 ? '#f59e0b' : '#ef4444';
  const scoreLabel = !analysis ? 'Sem dados' : analysis.score >= 75 ? 'Saudável' : analysis.score >= 50 ? 'Atenção' : 'Crítico';

  const diagnosticSentence = analysis ? buildDiagnosticSentence(analysis, summary) : null;

  // Arc/ring progress for score
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const scoreArc = analysis ? (analysis.score / 100) * circumference : 0;

  return (
    <div className="page-pad" style={{ minHeight: '100vh', background: '#000', padding: '32px' }}>

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Dashboard</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Visão geral das suas campanhas</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <DateRangePicker value={range} onChange={setRange} />
          {syncMsg && (
            <span style={{ fontSize: '12px', color: syncMsg.includes('Erro') ? '#ef4444' : '#10b981', padding: '6px 12px', borderRadius: '8px', background: syncMsg.includes('Erro') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)' }}>
              {syncMsg}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '10px', border: `1px solid ${CYAN}40`,
              background: `${CYAN}15`, color: CYAN, fontSize: '13px',
              fontWeight: 600, cursor: syncing ? 'not-allowed' : 'pointer',
              opacity: syncing ? 0.6 : 1, fontFamily: 'inherit',
            }}
          >
            <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Sincronizando...' : 'Sincronizar Meta Ads'}
          </button>
          <button
            onClick={() => navigate('/wizard')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '10px', border: 'none',
              background: `linear-gradient(135deg, ${CYAN}, #1a8ab8)`,
              color: '#000', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Plus size={14} /> Nova Campanha
          </button>
        </div>
      </div>

      {/* Sync status banner */}
      {lastSync.status === 'error' && (
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertTriangle size={16} color="#ef4444" />
          <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: 600 }}>Última sincronização falhou</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            — token Meta Ads provavelmente expirou. Vá em{' '}
            <span onClick={() => navigate('/settings')} style={{ color: CYAN, cursor: 'pointer', textDecoration: 'underline' }}>Configurações</span>
            {' '}e renove o token.
          </span>
          {lastSync.at && (
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
              Última tentativa: {new Date(lastSync.at).toLocaleString('pt-BR')}
            </span>
          )}
        </div>
      )}
      {lastSync.status === 'success' && lastSync.at && (
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '10px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
          <CheckCircle size={14} color="#10b981" />
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            Dados do Meta Ads sincronizados em <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{new Date(lastSync.at).toLocaleString('pt-BR')}</strong>
          </span>
        </div>
      )}
      {!lastSync.status && (
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '10px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <AlertTriangle size={14} color="#f59e0b" />
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            Meta Ads não sincronizado ainda. Configure o token em{' '}
            <span onClick={() => navigate('/settings')} style={{ color: CYAN, cursor: 'pointer', textDecoration: 'underline' }}>Configurações</span>
            {' '}e clique em Sincronizar.
          </span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {kpis.map(({ label, abbr, value, icon: Icon, color, tooltip }) => (
          <div key={label} style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
              <span title={tooltip} style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.35)', cursor: 'help', flexShrink: 0 }}>?</span>
            </div>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '4px', lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '1px' }}>{label}</p>
            {abbr && (
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{abbr}</p>
            )}
          </div>
        ))}
      </div>

      {/* Benchmark Strip */}
      <BenchmarkStrip
        cpl={summary?.cpa || 0}
        ctr={avgCtr}
        cpc={avgCpc}
      />

      <div className="grid-main" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>

        {/* Coluna principal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Centro de Análise IA */}
          {analysis && (
            <div style={{
              background: 'rgba(15,23,42,0.8)',
              border: `1px solid ${scoreColor}30`,
              borderRadius: '16px',
              padding: '20px',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: `${scoreColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Brain size={18} color={scoreColor} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Centro de Análise</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Diagnóstico baseado nas suas métricas reais</p>
                </div>
              </div>

              {/* Score ring + diagnostic sentence */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px', padding: '16px', borderRadius: '12px', background: `${scoreColor}08`, border: `1px solid ${scoreColor}20` }}>
                {/* SVG ring */}
                <div style={{ flexShrink: 0, position: 'relative', width: '90px', height: '90px' }}>
                  <svg width="90" height="90" viewBox="0 0 90 90">
                    <circle cx="45" cy="45" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
                    <circle
                      cx="45" cy="45" r={radius} fill="none"
                      stroke={scoreColor} strokeWidth="7"
                      strokeDasharray={`${scoreArc} ${circumference}`}
                      strokeLinecap="round"
                      transform="rotate(-90 45 45)"
                      style={{ filter: `drop-shadow(0 0 6px ${scoreColor}80)` }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '22px', fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{analysis.score}</span>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>/ 100</span>
                  </div>
                </div>

                {/* Diagnosis */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '12px', color: scoreColor, background: `${scoreColor}20` }}>
                      {scoreLabel.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: '1.55' }}>
                    {diagnosticSentence}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Ações recomendadas
              </p>
              {analysis.actions.slice(0, 3).map((action, i) => {
                const pc = PRIORITY_CONFIG[action.priority];
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                    padding: '12px 14px', borderRadius: '10px', marginBottom: '8px',
                    background: `${pc.color}08`,
                    border: `1px solid ${pc.color}25`,
                  }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 800, flexShrink: 0, marginTop: '2px',
                      padding: '2px 8px', borderRadius: '12px', letterSpacing: '0.04em',
                      color: pc.color, background: pc.bg,
                    }}>{pc.label}</span>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '3px' }}>{action.acao}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.5' }}>{action.motivo}</p>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => navigate('/professor')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  marginTop: '4px', background: 'none', border: 'none',
                  color: CYAN, fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', padding: 0,
                }}
              >
                Ver análise completa no Professor <ArrowRight size={13} />
              </button>
            </div>
          )}

          {/* Campanhas */}
          <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Campanhas Ativas</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>Saúde = semáforo com base no CPL vs benchmarks B2B</p>
              </div>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{campaigns.length} no total</span>
            </div>
            {campaigns.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '12px' }}>Nenhuma campanha ainda.</p>
                <button onClick={() => navigate('/wizard')} style={{ background: CYAN, border: 'none', color: '#000', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Criar campanha
                </button>
              </div>
            ) : (
              <div>
                {campaigns.map((c) => {
                  const badge = STATUS_BADGE[c.status];
                  const health = getCampaignHealthDot(c.avg_cpa, c.avg_ctr);
                  return (
                    <div
                      key={c.id}
                      onClick={() => navigate('/campanhas')}
                      style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.15s', gap: '12px' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Health dot */}
                      <span title={`Saúde: ${health.label}`} style={{ fontSize: '16px', flexShrink: 0, cursor: 'help' }}>{health.dot}</span>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', color: badge.color, background: badge.bg, flexShrink: 0 }}>{badge.label}</span>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{PLATFORM_LABEL[c.platform] || c.platform}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexShrink: 0 }}>
                        {c.avg_ctr > 0 && (
                          <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '1px' }}>Taxa de Cliques (CTR)</p>
                            <p style={{ fontSize: '13px', fontWeight: 700, color: c.avg_ctr >= 2.5 ? '#10b981' : c.avg_ctr >= 1 ? '#f59e0b' : '#ef4444' }}>{Number(c.avg_ctr).toFixed(1)}%</p>
                          </div>
                        )}
                        {c.avg_roas > 0 && (
                          <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '1px' }}>Retorno sobre Gasto (ROAS)</p>
                            <p style={{ fontSize: '13px', fontWeight: 700, color: c.avg_roas >= 3 ? '#10b981' : c.avg_roas >= 2 ? '#f59e0b' : '#ef4444' }}>{Number(c.avg_roas).toFixed(1)}x</p>
                          </div>
                        )}
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>R$ {Number(c.total_spend).toLocaleString('pt-BR')}</p>
                          <p style={{ fontSize: '11px', color: c.avg_cpa > 150 ? '#ef4444' : c.avg_cpa > 60 ? '#f59e0b' : c.avg_cpa > 0 ? '#10b981' : 'rgba(255,255,255,0.3)' }}>
                            {c.avg_cpa > 0 ? `Custo por Lead: R$ ${Number(c.avg_cpa).toFixed(0)}` : 'Sem métricas'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Campanhas Pausadas */}
          {pausedCampaigns.length > 0 && (
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PauseCircle size={15} color="#f59e0b" />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Campanhas Pausadas</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>Recomendação de IA: reativar ou manter pausada?</p>
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                  {pausedCampaigns.length} pausada{pausedCampaigns.length > 1 ? 's' : ''}
                </span>
              </div>
              {pausedCampaigns.map((c) => {
                const vc = VERDICT_CONFIG[c.verdict];
                const health = getCampaignHealthDot(c.avg_cpa, c.avg_ctr);
                return (
                  <div key={c.id} style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span title={`Saúde: ${health.label}`} style={{ fontSize: '16px', marginTop: '1px', cursor: 'help' }}>{health.dot}</span>
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{c.name}</p>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{PLATFORM_LABEL[c.platform] || c.platform}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', color: vc.color, background: vc.bg, flexShrink: 0 }}>
                        {vc.label}
                      </span>
                    </div>
                    {c.total_spend > 0 ? (
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                          Custo por Lead (CPL):{' '}
                          <strong style={{ color: c.avg_cpa > 150 ? '#ef4444' : c.avg_cpa > 60 ? '#f59e0b' : '#10b981' }}>
                            R$ {c.avg_cpa.toFixed(0)}
                          </strong>
                        </span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                          Retorno sobre Gasto (ROAS):{' '}
                          <strong style={{ color: c.avg_roas >= 3 ? '#10b981' : c.avg_roas >= 2 ? '#f59e0b' : '#ef4444' }}>
                            {c.avg_roas.toFixed(1)}x
                          </strong>
                        </span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                          Leads Gerados: <strong style={{ color: '#fff' }}>{c.total_leads}</strong>
                        </span>
                      </div>
                    ) : (
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>Sem métricas registradas</p>
                    )}
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.55', borderLeft: `2px solid ${vc.color}40`, paddingLeft: '10px' }}>{c.verdict_reason}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna lateral */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Leads por dia</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '16px' }}>{range.from.split('-').reverse().join('/')} → {range.to.split('-').reverse().join('/')}</p>
            {weekly.length > 0 ? (
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={weekly}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CYAN} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="transparent" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="leads" stroke={CYAN} strokeWidth={2} fill="url(#g)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <TrendingUp size={24} color="rgba(255,255,255,0.15)" />
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>Gráfico aparece após sincronizar</p>
                </div>
              </div>
            )}
          </div>

          {/* Glossário rápido */}
          <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>Glossário Rápido</p>
            {[
              { abbr: 'CPL', full: 'Custo por Lead', desc: 'Quanto você paga por cada pessoa interessada no seu produto.' },
              { abbr: 'CTR', full: 'Taxa de Cliques', desc: 'De cada 100 pessoas que viram o anúncio, quantas clicaram.' },
              { abbr: 'CPC', full: 'Custo por Clique', desc: 'Quanto você paga cada vez que alguém clica no anúncio.' },
              { abbr: 'ROAS', full: 'Retorno sobre Gasto', desc: 'Para cada R$1 investido, quanto retornou em receita.' },
            ].map(({ abbr, full, desc }) => (
              <div key={abbr} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: CYAN }}>{abbr}</span>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{full}</span>
                </div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', lineHeight: '1.4' }}>{desc}</p>
              </div>
            ))}
          </div>

          {analysis && analysis.issues.length > 0 && (
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} color="#f59e0b" /> Problemas detectados
              </p>
              {analysis.issues.map((issue, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0, marginTop: '6px' }} />
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5' }}>{issue}</p>
                </div>
              ))}
            </div>
          )}

          {analysis && analysis.issues.length === 0 && (
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
              <CheckCircle size={28} color="#10b981" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Tudo saudável!</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Suas métricas estão dentro do esperado.</p>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
