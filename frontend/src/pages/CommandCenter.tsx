import React, { useState, useMemo } from 'react';
import {
  Brain,
  ShoppingCart,
  PenTool,
  BarChart3,
  ShieldCheck,
  Zap,
  AlertTriangle,
  TrendingUp,
  Activity,
  XCircle,
  Info,
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  initials: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  action: string;
  status: 'active' | 'thinking' | 'acting';
}

interface Recommendation {
  id: string;
  severity: 'success' | 'critical' | 'warning';
  action: string;
  detail: string;
  impact: string;
  confidence: number;
}

interface Anomaly {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
}

interface Decision {
  time: string;
  text: string;
  confidence: number;
}

interface ChannelMix {
  name: string;
  allocation: number;
  roas: number;
  color: string;
}

const AGENTS: Agent[] = [
  { id: 'strategy', name: 'Strategy Agent', initials: 'SA', icon: <Brain className="w-4 h-4" />, color: 'text-violet-200', bgColor: 'bg-violet-500/10', action: 'Analisando padrões de 47 campanhas históricas', status: 'thinking' },
  { id: 'media-buyer', name: 'Media Buyer Agent', initials: 'MB', icon: <ShoppingCart className="w-4 h-4" />, color: 'text-sky-200', bgColor: 'bg-sky-500/10', action: 'Realocando R$ 600 de LinkedIn → Google Search', status: 'acting' },
  { id: 'content', name: 'Content Agent', initials: 'CA', icon: <PenTool className="w-4 h-4" />, color: 'text-amber-200', bgColor: 'bg-amber-500/10', action: 'Gerou 8 variações de headline para teste A/B', status: 'active' },
  { id: 'analytics', name: 'Analytics Agent', initials: 'AA', icon: <BarChart3 className="w-4 h-4" />, color: 'text-emerald-200', bgColor: 'bg-emerald-500/10', action: '3 anomalias detectadas · padrão sazonal identificado', status: 'active' },
  { id: 'compliance', name: 'Compliance Agent', initials: 'CP', icon: <ShieldCheck className="w-4 h-4" />, color: 'text-rose-200', bgColor: 'bg-rose-500/10', action: 'Validou 12 criativos · bloqueou 1 por política', status: 'active' },
  { id: 'decision', name: 'Decision Agent', initials: 'DA', icon: <Zap className="w-4 h-4" />, color: 'text-stone-200', bgColor: 'bg-stone-500/10', action: 'Aguardando aprovação para escalar 2 campanhas', status: 'thinking' },
];

const RECOMMENDATIONS: Recommendation[] = [
  { id: '1', severity: 'success', action: 'Escale Lipoaspiração em 35%', detail: 'ROAS 3.2x sustentado por 14 dias. CPA R$ 40 estável. Audience saturação em 31% — espaço para crescer.', impact: '+R$ 2.400/mês lucro', confidence: 94 },
  { id: '2', severity: 'critical', action: 'Pause Divórcio em 48h', detail: 'ROAS 1.8x abaixo do break-even (2.0x). 3 testes de criativo falharam. Audience exausto.', impact: 'Economia: R$ 1.320/semana', confidence: 87 },
  { id: '3', severity: 'warning', action: 'Teste novo headline em Imobiliária', detail: 'CTR 2.8% bom mas plateau detectado. Variações geradas pelo Content Agent prontas.', impact: 'Potencial: +12% CTR', confidence: 71 },
];

const ANOMALIES: Anomaly[] = [
  { id: '1', type: 'critical', title: 'Spike de CPA em Divórcio', detail: 'CPA subiu 47% nas últimas 6h. Causa provável: aumento de bid competitor. Ação: pausar e reavaliar.' },
  { id: '2', type: 'warning', title: 'Queda de impressions em Lipoaspiração', detail: '23% menos impressions nas últimas 12h. Audience pode estar saturando. Recomendação: expandir lookalike de 1% para 3%.' },
  { id: '3', type: 'info', title: 'Padrão sazonal detectado', detail: 'Conversões aumentam 34% nas terças entre 14h-17h. Sistema realocou 22% do budget para esse horário automaticamente.' },
];

const DECISIONS: Decision[] = [
  { time: '14:32', text: 'Realocou R$ 200 de YouTube → Google Search (CPA 3.4x melhor)', confidence: 96 },
  { time: '13:18', text: 'Pausou criativo "Headline 4" em Lipoaspiração (CTR 0.8% após 1.200 impressions)', confidence: 91 },
  { time: '12:45', text: 'Aumentou bid em palavras-chave de alta conversão (+18% impressions previsto)', confidence: 88 },
  { time: '11:22', text: 'Detectou audience overlap entre 2 ad sets — mesclou para reduzir custo', confidence: 93 },
  { time: '10:07', text: 'Ativou variação de criativo gerada pelo Content Agent (CTR previsto 3.1%)', confidence: 79 },
  { time: '09:33', text: 'Bloqueou anúncio por violação de política (Compliance Agent flag)', confidence: 100 },
  { time: '08:15', text: 'Expandiu lookalike audience de 1% para 2% (saturação detectada)', confidence: 85 },
];

const CHANNEL_MIX: ChannelMix[] = [
  { name: 'Meta Ads', allocation: 42, roas: 3.1, color: 'bg-sky-500/60' },
  { name: 'Google Search', allocation: 35, roas: 3.4, color: 'bg-emerald-500/60' },
  { name: 'LinkedIn', allocation: 18, roas: 2.4, color: 'bg-violet-500/60' },
  { name: 'YouTube', allocation: 5, roas: 1.9, color: 'bg-amber-500/60' },
];

const StatusBadge: React.FC<{ status: Agent['status'] }> = ({ status }) => {
  const config = {
    active: { label: 'ativo', className: 'bg-emerald-500/10 text-emerald-300/80 border-emerald-500/20' },
    thinking: { label: 'pensando', className: 'bg-violet-500/10 text-violet-300/80 border-violet-500/20' },
    acting: { label: 'agindo', className: 'bg-amber-500/10 text-amber-300/80 border-amber-500/20' },
  }[status];
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
};

const RecommendationCard: React.FC<{ rec: Recommendation }> = ({ rec }) => {
  const styles = {
    success: 'bg-emerald-500/[0.04] border-l-emerald-500/40',
    critical: 'bg-rose-500/[0.04] border-l-rose-500/40',
    warning: 'bg-amber-500/[0.04] border-l-amber-500/40',
  }[rec.severity];

  return (
    <div className={`p-3 rounded-lg border-l-2 mb-2 ${styles}`}>
      <p className="text-sm font-medium text-slate-100 mb-1">{rec.action}</p>
      <p className="text-xs text-slate-400 leading-relaxed mb-2">{rec.detail}</p>
      <div className="flex items-center justify-between text-[11px]">
        <span className="px-2 py-1 bg-slate-800/40 rounded text-slate-300">{rec.impact}</span>
        <span className="text-slate-500">confiança {rec.confidence}%</span>
      </div>
    </div>
  );
};

const AnomalyRow: React.FC<{ anomaly: Anomaly }> = ({ anomaly }) => {
  const config = {
    critical: { bg: 'bg-rose-500/10', color: 'text-rose-300/80', icon: <XCircle className="w-3.5 h-3.5" /> },
    warning: { bg: 'bg-amber-500/10', color: 'text-amber-300/80', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    info: { bg: 'bg-sky-500/10', color: 'text-sky-300/80', icon: <Info className="w-3.5 h-3.5" /> },
  }[anomaly.type];

  return (
    <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg mb-2">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg} ${config.color}`}>
        {config.icon}
      </div>
      <div className="flex-1 text-xs leading-relaxed">
        <p className="font-medium text-slate-100 mb-1">{anomaly.title}</p>
        <p className="text-slate-400">{anomaly.detail}</p>
      </div>
    </div>
  );
};

export default function CommandCenter() {
  const [budget, setBudget] = useState(450);

  const scenario = useMemo(() => {
    const leads = budget / 40;
    const conversions = leads * 0.24;
    const revenue = conversions * 500;
    const profit = revenue - budget;
    return {
      leads: leads.toFixed(1).replace('.', ','),
      conversions: conversions.toFixed(1).replace('.', ','),
      revenue: Math.round(revenue),
      profit: Math.round(profit),
    };
  }, [budget]);

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/60">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100 flex items-center gap-2">
              <Activity className="w-6 h-6 text-emerald-400/70" />
              ÊXODOS Command Center
            </h1>
            <p className="text-sm text-slate-500 mt-1">Sistema autônomo de gestão de campanhas</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400/70 animate-pulse" />
            6 agentes ativos · análise contínua
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-800/60">
            <p className="text-xs text-slate-500 mb-1">Budget total</p>
            <p className="text-2xl font-semibold text-slate-100">R$ 4.320</p>
            <p className="text-xs text-emerald-400/70 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +R$ 600 realocado hoje
            </p>
          </div>
          <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-800/60">
            <p className="text-xs text-slate-500 mb-1">ROAS médio</p>
            <p className="text-2xl font-semibold text-slate-100">2.83x</p>
            <p className="text-xs text-emerald-400/70 mt-1">↑ 0.4x vs ontem</p>
          </div>
          <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-800/60">
            <p className="text-xs text-slate-500 mb-1">Decisões hoje</p>
            <p className="text-2xl font-semibold text-slate-100">17</p>
            <p className="text-xs text-slate-500 mt-1">14 autônomas · 3 revisão</p>
          </div>
          <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-800/60">
            <p className="text-xs text-slate-500 mb-1">Lucro projetado</p>
            <p className="text-2xl font-semibold text-slate-100">R$ 8.890</p>
            <p className="text-xs text-emerald-400/70 mt-1">+18% via IA</p>
          </div>
        </div>

        {/* Agentes */}
        <div className="mb-8">
          <h2 className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-3">
            Agentes especializados em ação
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AGENTS.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center gap-3 p-3 bg-slate-900/40 rounded-lg border border-slate-800/60"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${agent.bgColor} ${agent.color}`}>
                  {agent.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-100">{agent.name}</p>
                  <p className="text-xs text-slate-500 truncate">{agent.action}</p>
                </div>
                <StatusBadge status={agent.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Recomendações + Simulador */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div>
            <h2 className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-3">
              Recomendações prescritivas
            </h2>
            {RECOMMENDATIONS.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </div>
          <div>
            <h2 className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-3">
              Simulador de cenários
            </h2>
            <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-800/60">
              <p className="text-xs text-slate-500 mb-4">Ajuste o budget e veja a previsão</p>

              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs text-slate-500 min-w-[100px]">Budget diário</span>
                <input
                  type="range"
                  min={100}
                  max={1000}
                  step={50}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="flex-1 accent-emerald-500/60"
                />
                <span className="text-sm font-medium text-slate-100 min-w-[80px] text-right">
                  R$ {budget.toLocaleString('pt-BR')}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-3 py-2 bg-slate-950/40 rounded">
                  <span className="text-xs text-slate-500">Leads previstos</span>
                  <span className="text-sm font-medium text-slate-100">{scenario.leads}</span>
                </div>
                <div className="flex justify-between items-center px-3 py-2 bg-slate-950/40 rounded">
                  <span className="text-xs text-slate-500">Conversões esperadas</span>
                  <span className="text-sm font-medium text-slate-100">{scenario.conversions}</span>
                </div>
                <div className="flex justify-between items-center px-3 py-2 bg-slate-950/40 rounded">
                  <span className="text-xs text-slate-500">Receita estimada</span>
                  <span className="text-sm font-medium text-slate-100">
                    R$ {scenario.revenue.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between items-center px-3 py-2 bg-emerald-500/[0.06] rounded border border-emerald-500/20">
                  <span className="text-xs text-emerald-300/80">Lucro líquido</span>
                  <span className="text-sm font-semibold text-emerald-300/90">
                    R$ {scenario.profit.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Marketing Mix */}
        <div className="mb-8">
          <h2 className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-3">
            Marketing Mix Modeling — alocação ótima de canal
          </h2>
          <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-800/60">
            {CHANNEL_MIX.map((channel) => (
              <div key={channel.name} className="flex items-center gap-3 py-2.5 border-b border-slate-800/40 last:border-b-0">
                <span className="text-sm font-medium text-slate-100 min-w-[100px]">{channel.name}</span>
                <div className="flex-1 h-6 bg-slate-950/40 rounded overflow-hidden">
                  <div
                    className={`h-full ${channel.color} flex items-center px-2 text-[11px] font-medium text-slate-100`}
                    style={{ width: `${channel.allocation}%` }}
                  >
                    {channel.allocation}%
                  </div>
                </div>
                <span className="text-xs text-slate-500 min-w-[80px] text-right">ROAS {channel.roas}x</span>
              </div>
            ))}
            <p className="text-xs text-slate-400 mt-3 p-3 bg-slate-950/40 rounded leading-relaxed">
              <span className="text-sky-300/80 font-medium">Recomendação do Media Buyer Agent: </span>
              aumentar Google Search para 45%, reduzir YouTube para 0%. Lucro projetado: +R$ 720/semana.
            </p>
          </div>
        </div>

        {/* Anomalias */}
        <div className="mb-8">
          <h2 className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-3">
            Anomalias detectadas em tempo real
          </h2>
          <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-800/60">
            {ANOMALIES.map((anomaly) => (
              <AnomalyRow key={anomaly.id} anomaly={anomaly} />
            ))}
          </div>
        </div>

        {/* Histórico */}
        <div>
          <h2 className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-3">
            Histórico de decisões autônomas
          </h2>
          <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-800/60">
            <div className="max-h-64 overflow-y-auto">
              {DECISIONS.map((decision, i) => (
                <div
                  key={i}
                  className="flex gap-3 py-2.5 text-xs border-b border-slate-800/40 last:border-b-0"
                >
                  <span className="text-slate-600 font-mono min-w-[50px]">{decision.time}</span>
                  <span className="flex-1 text-slate-400 leading-relaxed">
                    {decision.text}
                    <span className="ml-2 inline-block px-1.5 py-0.5 bg-sky-500/10 text-sky-300/80 text-[10px] rounded font-medium">
                      {decision.confidence}%
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
