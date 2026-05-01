import React, { useState, useEffect } from 'react';
import {
  GraduationCap, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Info, ChevronRight, Zap, Target, DollarSign,
  BarChart3, Activity, PauseCircle,
} from 'lucide-react';
import { metricsApi, analyzeApi } from '../lib/api';

const TEAL = '#00B7B7';

interface Metric {
  key: string;
  label: string;
  value: string;
  raw: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  explanation: string;
  recommendation: string;
  impact: string;
  icon: React.ElementType;
  benchmark: string;
}

function getStatus(key: string, value: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (key === 'cpa') {
    if (value <= 30) return 'excellent';
    if (value <= 50) return 'good';
    if (value <= 80) return 'warning';
    return 'critical';
  }
  if (key === 'roas') {
    if (value >= 5) return 'excellent';
    if (value >= 3) return 'good';
    if (value >= 2) return 'warning';
    return 'critical';
  }
  if (key === 'ctr') {
    if (value >= 3) return 'excellent';
    if (value >= 1.5) return 'good';
    if (value >= 0.8) return 'warning';
    return 'critical';
  }
  if (key === 'cpc') {
    if (value <= 1) return 'excellent';
    if (value <= 2.5) return 'good';
    if (value <= 5) return 'warning';
    return 'critical';
  }
  if (key === 'roi') {
    if (value >= 300) return 'excellent';
    if (value >= 150) return 'good';
    if (value >= 50) return 'warning';
    return 'critical';
  }
  return 'good';
}

function calcHealthScore(metrics: Metric[]): number {
  const weights: Record<string, number> = { roas: 30, cpa: 25, ctr: 20, cpc: 15, roi: 10 };
  const scores: Record<string, number> = { excellent: 100, good: 75, warning: 40, critical: 10 };
  let total = 0;
  let weightSum = 0;
  metrics.forEach((m) => {
    const w = weights[m.key] || 10;
    total += (scores[m.status] || 50) * w;
    weightSum += w;
  });
  return Math.round(total / weightSum);
}

function HealthGauge({ score }: { score: number }) {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const label = score >= 75 ? 'Excelente' : score >= 50 ? 'Atenção' : 'Crítico';
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ position: 'relative', width: '130px', height: '130px' }}>
        <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="65" cy="65" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <circle
            cx="65" cy="65" r="52" fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>{score}</span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '-2px' }}>/ 100</span>
        </div>
      </div>
      <span style={{ fontSize: '13px', fontWeight: 600, color }}>{label}</span>
    </div>
  );
}

const STATUS_CONFIG = {
  excellent: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', label: 'Excelente', icon: CheckCircle },
  good: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', label: 'Bom', icon: TrendingUp },
  warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', label: 'Atenção', icon: AlertTriangle },
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', label: 'Crítico', icon: TrendingDown },
};

function MetricCard({ metric, expanded, onToggle }: { metric: Metric; expanded: boolean; onToggle: () => void }) {
  const cfg = STATUS_CONFIG[metric.status];
  const Icon = metric.icon;

  return (
    <div
      onClick={onToggle}
      style={{
        background: 'rgba(15,23,42,0.8)',
        border: `1px solid ${expanded ? TEAL + '40' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '16px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: expanded ? '16px' : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={18} color={cfg.color} />
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>{metric.label}</p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>{metric.value}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '11px', fontWeight: 600, padding: '4px 10px',
            borderRadius: '20px', background: cfg.bg, color: cfg.color,
          }}>
            {cfg.label}
          </span>
          <ChevronRight size={16} color="rgba(255,255,255,0.3)" style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Info size={12} /> O QUE SIGNIFICA
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>{metric.explanation}</p>
          </div>
          <div style={{ padding: '12px', borderRadius: '10px', background: cfg.bg, border: `1px solid ${cfg.border}` }}>
            <p style={{ fontSize: '11px', color: cfg.color, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={12} /> RECOMENDAÇÃO
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>{metric.recommendation}</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Benchmark do setor</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{metric.benchmark}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Impacto estimado</p>
              <p style={{ fontSize: '12px', color: cfg.color, fontWeight: 600 }}>{metric.impact}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PausedCampaign {
  id: string; name: string; platform: string;
  avg_cpa: number; avg_roas: number; avg_ctr: number;
  total_spend: number; total_leads: number; score: number;
  issues: string[];
  verdict: 'reativar' | 'reativar_com_cautela' | 'manter_pausada';
  verdict_reason: string;
}

const VERDICT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  reativar:             { label: 'Reativar',            color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  reativar_com_cautela: { label: 'Revisar e Reativar',  color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  manter_pausada:       { label: 'Manter Pausada',      color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)' },
};

const PLATFORM_LABEL: Record<string, string> = {
  meta: 'Meta Ads', google: 'Google Ads', linkedin: 'LinkedIn',
};

export default function Professor() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthScore, setHealthScore] = useState(0);
  const [usingMock, setUsingMock] = useState(false);
  const [activeTab, setActiveTab] = useState<'geral' | 'pausadas'>('geral');
  const [pausedCampaigns, setPausedCampaigns] = useState<PausedCampaign[]>([]);

  useEffect(() => {
    Promise.all([
      metricsApi.dashboard().catch(() => null),
      analyzeApi.paused().catch(() => null),
    ]).then(([metricsRes, pausedRes]) => {
      const s = metricsRes?.data?.summary;
      if (s && (s.spend > 0 || s.leads > 0)) {
        const roi = s.roas > 0 ? (s.roas - 1) * 100 : 0;
        buildMetrics(s.cpa || 0, s.roas || 0, s.ctr || 0, s.cpc || 0, roi);
      } else {
        buildMetrics(47, 3.4, 1.8, 2.1, 240);
        setUsingMock(true);
      }
      if (pausedRes?.data?.paused) setPausedCampaigns(pausedRes.data.paused);
    }).finally(() => setLoading(false));
  }, []);

  function buildMetrics(cpa: number, roas: number, ctr: number, cpc: number, roi: number) {
    const raw: Metric[] = [
      {
        key: 'roas', label: 'ROAS', value: roas > 0 ? `${roas.toFixed(1)}x` : '--', raw: roas,
        status: getStatus('roas', roas), icon: TrendingUp,
        explanation: roas > 0
          ? `Seu ROAS de ${roas.toFixed(1)}x significa que para cada R$1 investido em anúncios, você está recuperando R$${roas.toFixed(2)} em receita. ${roas >= 3 ? 'Isso indica que a campanha está gerando retorno real acima do custo.' : roas >= 1 ? 'O retorno cobre o investimento, mas ainda há espaço para otimizar.' : 'Atenção: o retorno está abaixo do investido, o que representa prejuízo líquido.'} O algoritmo do Meta usa o ROAS como principal sinal para aprender com quem converte — campanha com ROAS alto recebe distribuição maior automaticamente.`
          : 'Sem dados de ROAS ainda. O valor aparece após a primeira conversão registrada nas métricas.',
        recommendation: roas >= 5
          ? `ROAS excepcional! Escale agressivamente — aumente o orçamento 30-50% por semana sem mexer na segmentação. Documente tudo: criativo, copy, público e oferta.`
          : roas >= 3
          ? `Bom ROAS. Escale com cautela: aumente o orçamento 20% a cada 3-4 dias. Duplique os conjuntos de anúncio que puxam mais resultado e pause os de menor performance.`
          : roas >= 2
          ? `ROAS abaixo do ideal para escalar. Revise sua oferta e a página de destino. Teste criativos novos com ângulos diferentes. Não aumente orçamento antes de melhorar o ROAS.`
          : roas > 0
          ? `ROAS crítico — cada R$1 investido retorna menos de R$2. Pause conjuntos com pior desempenho, revise o público-alvo e mude o criativo. Considere revisar a oferta ou o preço do produto.`
          : `Configure o pixel de conversão e aguarde os primeiros dados de ROAS para análise.`,
        impact: roas >= 3 ? 'Escalar 20% → +20% de resultado proporcional' : 'Dobrar o ROAS é possível revisando criativo e funil',
        benchmark: 'Bom: 3x+ | Excelente: 5x+ | Escalar com segurança: 4x+',
      },
      {
        key: 'cpa', label: 'CPA (Custo por Aquisição)', value: cpa > 0 ? `R$ ${cpa.toFixed(2)}` : '--', raw: cpa,
        status: getStatus('cpa', cpa), icon: Target,
        explanation: cpa > 0
          ? `Você está pagando R$${cpa.toFixed(2)} para adquirir cada lead ou cliente. Esse valor é calculado dividindo todo o investimento pelo número de conversões no período. ${cpa <= 50 ? `Com R$1.000 de orçamento, você consegue aproximadamente ${Math.round(1000 / cpa)} conversões.` : `Com R$1.000 de orçamento, você consegue apenas ${Math.round(1000 / cpa)} conversões — revise o funil para aumentar esse volume.`} O CPA ideal depende do valor que cada cliente gera para o seu negócio.`
          : 'Sem conversões registradas ainda. Configure o pixel e aguarde os primeiros dados.',
        recommendation: cpa <= 30
          ? `CPA excelente! Escale o orçamento com confiança. Mantenha o mesmo criativo, público e landing page — qualquer mudança pode prejudicar o resultado.`
          : cpa <= 50
          ? `CPA sob controle. Pause anúncios que ultrapassam R$${(cpa * 1.5).toFixed(0)} (1.5x o atual) e redirecione o budget para os melhores performers.`
          : cpa <= 80
          ? `CPA elevado. Revise sua landing page: headline, prova social, CTA e velocidade de carregamento. Um formulário mais simples pode reduzir o CPA em até 30%.`
          : `CPA crítico. Pause a campanha e revise toda a estrutura: segmentação, criativo, landing page e oferta. O problema pode estar em qualquer etapa do funil.`,
        impact: cpa <= 50 ? 'Reduzir 10% no CPA = 10% mais leads com mesmo orçamento' : `Reduzir para R$50 = ${cpa > 0 ? Math.round((cpa / 50 - 1) * 100) : 0}% mais leads`,
        benchmark: 'Excelente: < R$30 | Bom: R$30-50 | Atenção: R$50-80 | Crítico: > R$80',
      },
      {
        key: 'ctr', label: 'CTR (Taxa de Cliques)', value: ctr > 0 ? `${ctr.toFixed(2)}%` : '--', raw: ctr,
        status: getStatus('ctr', ctr), icon: Activity,
        explanation: ctr > 0
          ? `De cada 1.000 pessoas que viram seu anúncio, ${Math.round(ctr * 10)} clicaram (CTR de ${ctr.toFixed(2)}%). O CTR mede a força do seu criativo e a relevância da mensagem para o público. ${ctr >= 2 ? 'Um CTR acima de 2% indica que o anúncio ressoa bem com a audiência.' : ctr >= 1 ? 'CTR razoável, mas há espaço para melhorar o criativo e aumentar os cliques sem aumentar o custo.' : 'CTR baixo significa que o criativo não está gerando interesse suficiente — isso também encarece o CPC, pois o algoritmo penaliza anúncios pouco clicados.'}`
          : 'Sem dados de CTR ainda. Aparece após as primeiras impressões registradas.',
        recommendation: ctr >= 3
          ? `CTR excelente! O criativo está funcionando muito bem. Salve esse criativo como referência e teste variações pequenas (headline, cor do botão) para melhorar ainda mais.`
          : ctr >= 1.5
          ? `CTR saudável. Teste 2-3 variações do criativo atual mudando só um elemento por vez: headline, imagem ou CTA. Qual versão gera mais cliques com mesmo orçamento?`
          : ctr >= 0.8
          ? `CTR abaixo do ideal. O anúncio não está gerando curiosidade suficiente. Teste: (1) criativo em vídeo vs imagem, (2) headline com pergunta ou número, (3) público mais específico.`
          : `CTR crítico — menos de 1 em cada 125 pessoas clica. Mude completamente o criativo: formato, ângulo de comunicação e CTA. Teste com um público menor e mais qualificado.`,
        impact: ctr < 1.5 ? `Dobrar o CTR pode reduzir o CPC em até 40%` : 'CTR alto = algoritmo favorece seu anúncio no leilão',
        benchmark: 'Bom: 1.5%+ | Excelente: 3%+ | Crítico: < 0.8%',
      },
      {
        key: 'cpc', label: 'CPC (Custo por Clique)', value: cpc > 0 ? `R$ ${cpc.toFixed(2)}` : '--', raw: cpc,
        status: getStatus('cpc', cpc), icon: DollarSign,
        explanation: cpc > 0
          ? `Cada clique no seu anúncio está custando R$${cpc.toFixed(2)}. Esse valor é determinado pelo leilão do Meta: quanto mais anunciantes disputam o mesmo público, mais caro fica. ${cpc <= 2.5 ? 'CPC competitivo para o mercado brasileiro.' : 'CPC acima do ideal — pode indicar alta concorrência no seu segmento ou anúncio com baixo score de relevância.'} O CPC está diretamente ligado ao CTR: criativo mais clicado = CPC menor, pois o algoritmo premia anúncios com alta taxa de engajamento.`
          : 'Sem dados de CPC ainda.',
        recommendation: cpc <= 1
          ? `CPC excelente! Seu anúncio está sendo premiado pelo algoritmo. Escale o orçamento — o CPC tende a subir pouco quando a campanha está otimizada.`
          : cpc <= 2.5
          ? `CPC competitivo. Para reduzir ainda mais: melhore o CTR com criativos mais atrativos e segmente para públicos com maior intenção de compra (remarketing, LAL de compradores).`
          : cpc <= 5
          ? `CPC elevado. Revise: (1) o público está amplo demais? (2) o criativo tem CTR baixo? (3) há muita sobreposição de audiências entre conjuntos? Menos competição interna reduz o CPC.`
          : `CPC muito alto. Pause e restructure a campanha. Considere segmentos menos disputados ou formatos diferentes (Stories, Reels) que costumam ter CPC menor.`,
        impact: cpc > 2.5 ? `Reduzir o CPC para R$2 = ${cpc > 0 ? Math.round((cpc / 2 - 1) * 100) : 0}% mais cliques com mesmo orçamento` : 'CPC baixo = mais cliques pelo mesmo investimento',
        benchmark: 'Excelente: < R$1 | Bom: R$1-2.50 | Atenção: R$2.50-5 | Crítico: > R$5',
      },
      {
        key: 'roi', label: 'ROI (Retorno sobre Investimento)', value: roi > 0 ? `${roi.toFixed(0)}%` : '--', raw: roi,
        status: getStatus('roi', roi), icon: BarChart3,
        explanation: roi > 0
          ? `Seu ROI de ${roi.toFixed(0)}% significa que para cada R$100 investidos em anúncios, você obteve R$${(100 + roi).toFixed(0)} de retorno bruto — ou seja, R$${roi.toFixed(0)} de lucro antes de descontar outros custos operacionais. ${roi >= 150 ? 'Um ROI acima de 150% indica que a operação está gerando valor real.' : roi >= 50 ? 'ROI positivo, mas ainda há espaço para escalar com mais eficiência.' : 'ROI baixo — o retorno mal cobre o investimento. Revise a estrutura de custos e o funil de conversão.'} Lembre que o ROI considera apenas o retorno direto dos anúncios; o LTV (valor do cliente ao longo do tempo) pode tornar um ROI aparentemente baixo muito mais lucrativo.`
          : 'ROI aparece após os primeiros dados de receita e conversão.',
        recommendation: roi >= 300
          ? `ROI excepcional! Escale com tudo. Documente a estratégia completa (criativo, público, oferta, landing page) e replique em outros produtos ou segmentos.`
          : roi >= 150
          ? `ROI saudável. Foco em aumentar o volume de leads mantendo o custo: escale o orçamento 20% por semana e monitore se o CPA se mantém estável.`
          : roi >= 50
          ? `ROI positivo mas pode melhorar. Analise qual etapa do funil perde mais leads: do clique para o lead, ou do lead para a venda? Cada 10% de melhoria na conversão pode dobrar o ROI.`
          : `ROI abaixo do esperado. Revise: (1) o ticket médio do produto vs o CPA, (2) a taxa de fechamento dos leads, (3) se os leads gerados têm o perfil certo do seu cliente ideal.`,
        impact: roi >= 150 ? 'Replique a estratégia em novos mercados ou produtos' : 'Cada 10% de melhoria na taxa de conversão aumenta o ROI proporcionalmente',
        benchmark: 'Positivo: > 0% | Bom: 150%+ | Excelente: 300%+',
      },
    ];
    setMetrics(raw);
    setHealthScore(calcHealthScore(raw));
    setExpandedKey(raw[0].key);
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${TEAL}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const criticalCount = metrics.filter((m) => m.status === 'critical').length;
  const warningCount = metrics.filter((m) => m.status === 'warning').length;

  return (
    <div className="page-pad" style={{ minHeight: '100vh', background: '#000', padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${TEAL}20`, border: `1px solid ${TEAL}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={20} color={TEAL} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>Professor IA</h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Análise inteligente das suas métricas de tráfego pago</p>
          </div>
        </div>
        {usingMock && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#f59e0b', padding: '6px 12px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', marginTop: '8px' }}>
            <AlertTriangle size={13} />
            Exibindo análise com dados de demonstração — adicione métricas reais para ver sua análise personalizada.
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '20px', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
          {(['geral', 'pausadas'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '7px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
                background: activeTab === tab ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.4)',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {tab === 'pausadas' && <PauseCircle size={13} />}
              {tab === 'geral' ? 'Visao Geral' : `Pausadas${pausedCampaigns.length > 0 ? ` (${pausedCampaigns.length})` : ''}`}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'pausadas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pausedCampaigns.length === 0 ? (
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
              <PauseCircle size={32} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>Nenhuma campanha pausada.</p>
            </div>
          ) : pausedCampaigns.map((c) => {
            const vc = VERDICT_CONFIG[c.verdict];
            return (
              <div key={c.id} style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${vc.border}`, borderRadius: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{c.name}</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{PLATFORM_LABEL[c.platform] || c.platform}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '12px', color: vc.color, background: vc.bg }}>
                      {vc.label}
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Score: {c.score}/100</span>
                  </div>
                </div>

                {c.total_spend > 0 && (
                  <div style={{ display: 'flex', gap: '20px', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', marginBottom: '12px' }}>
                    <div>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>CPA</p>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: c.avg_cpa > 60 ? '#ef4444' : '#10b981' }}>R$ {c.avg_cpa.toFixed(0)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>ROAS</p>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: c.avg_roas >= 3 ? '#10b981' : c.avg_roas >= 2 ? '#f59e0b' : '#ef4444' }}>{c.avg_roas.toFixed(1)}x</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>CTR</p>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: c.avg_ctr >= 1.5 ? '#10b981' : '#f59e0b' }}>{c.avg_ctr.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>Leads</p>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{c.total_leads}</p>
                    </div>
                  </div>
                )}

                <div style={{ padding: '12px', borderRadius: '10px', background: vc.bg, border: `1px solid ${vc.border}` }}>
                  <p style={{ fontSize: '11px', color: vc.color, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Zap size={12} /> RECOMENDACAO DA IA
                  </p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>{c.verdict_reason}</p>
                </div>

                {c.issues.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {c.issues.map((issue, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ef4444', flexShrink: 0, marginTop: '6px' }} />
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{issue}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid-professor" style={{ display: activeTab === 'pausadas' ? 'none' : 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {metrics.map((metric) => (
            <MetricCard key={metric.key} metric={metric} expanded={expandedKey === metric.key} onToggle={() => setExpandedKey(expandedKey === metric.key ? null : metric.key)} />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Score de Saúde</p>
            <HealthGauge score={healthScore} />
            <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Métricas críticas</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: criticalCount > 0 ? '#ef4444' : '#10b981' }}>{criticalCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Precisam atenção</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: warningCount > 0 ? '#f59e0b' : '#10b981' }}>{warningCount}</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>Diagnóstico Rápido</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {metrics.map((m) => {
                const cfg = STATUS_CONFIG[m.status];
                return (
                  <div key={m.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{m.label.split(' ')[0]}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.color }} />
                      <span style={{ fontSize: '11px', color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: `${TEAL}10`, border: `1px solid ${TEAL}30`, borderRadius: '16px', padding: '20px' }}>
            <p style={{ fontSize: '12px', color: TEAL, fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={13} /> PRÓXIMO PASSO
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>
              {criticalCount > 0
                ? `Foque nas ${criticalCount} métrica(s) crítica(s) primeiro. Clique em cada cartão para ver a recomendação.`
                : warningCount > 0
                ? `Suas campanhas estão razoáveis. Otimize as ${warningCount} métrica(s) em atenção para chegar ao próximo nível.`
                : 'Excelente! Métricas saudáveis. Agora escale — aumente o orçamento 20% nos melhores conjuntos.'
              }
            </p>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
