import React, { useState } from 'react';
import {
  Sparkles, Brain, ShoppingCart, Pen, BarChart3, Shield, Cpu,
  ChevronRight, AlertTriangle, TrendingUp, CheckCircle, Clock,
  Zap, Play, RotateCcw, Eye,
} from 'lucide-react';

const TEAL = '#00B7B7';

interface Agent {
  id: string;
  name: string;
  role: string;
  icon: React.ElementType;
  color: string;
  status: 'active' | 'analyzing' | 'idle';
  lastAction: string;
  confidence: number;
  recommendation: string;
}

interface Decision {
  id: number;
  agent: string;
  action: string;
  impact: string;
  confidence: number;
  timestamp: string;
  status: 'executed' | 'pending' | 'rejected';
}

interface Anomaly {
  metric: string;
  change: string;
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
}

const AGENTS: Agent[] = [
  {
    id: 'strategy',
    name: 'Strategy Agent',
    role: 'Planejamento Estratégico',
    icon: Brain,
    color: '#a78bfa',
    status: 'active',
    lastAction: 'Analisando mix de canais Q2',
    confidence: 87,
    recommendation: 'Redistribuir 30% do budget do Google para Meta — CTR 2.1x maior no nicho atual.',
  },
  {
    id: 'mediaBuyer',
    name: 'Media Buyer',
    role: 'Otimização de Lances',
    icon: ShoppingCart,
    color: '#3b82f6',
    status: 'analyzing',
    lastAction: 'Ajustando lances por hora do dia',
    confidence: 92,
    recommendation: 'Aumentar lances 25% entre 19h-22h — conversão 1.8x maior nesse horário.',
  },
  {
    id: 'content',
    name: 'Content Agent',
    role: 'Criativos & Copy',
    icon: Pen,
    color: '#10b981',
    status: 'active',
    lastAction: 'Gerou 3 variações de headline',
    confidence: 78,
    recommendation: 'Testar headline com prova social ("+ de 500 clientes") — tende a aumentar CTR em 15-40%.',
  },
  {
    id: 'analytics',
    name: 'Analytics Agent',
    role: 'Análise de Dados',
    icon: BarChart3,
    color: '#f59e0b',
    status: 'active',
    lastAction: 'Detectou anomalia no CPA',
    confidence: 95,
    recommendation: 'CPA subiu 23% nas últimas 6h. Causa provável: aumento de concorrência no leilão. Recomendo pausar conjunto C.',
  },
  {
    id: 'compliance',
    name: 'Compliance Agent',
    role: 'Conformidade & Riscos',
    icon: Shield,
    color: '#ef4444',
    status: 'idle',
    lastAction: 'Verificou políticas Meta Ads',
    confidence: 99,
    recommendation: 'Todos os anúncios ativos estão em conformidade com as políticas da plataforma.',
  },
  {
    id: 'decision',
    name: 'Decision Agent',
    role: 'Coordenação & Decisões',
    icon: Cpu,
    color: TEAL,
    status: 'active',
    lastAction: 'Coordenando estratégia multi-canal',
    confidence: 89,
    recommendation: 'Prioridade 1: pausar conjunto C (CPA +23%). Prioridade 2: escalar conjunto A (+ROAS 4.2x).',
  },
];

const DECISIONS: Decision[] = [
  { id: 1, agent: 'Analytics Agent', action: 'Pausa Conjunto C — CPA +23%', impact: 'Economia estimada R$340/dia', confidence: 95, timestamp: 'Há 12 min', status: 'pending' },
  { id: 2, agent: 'Media Buyer', action: 'Lance +25% entre 19h-22h', impact: '+18 leads/semana estimado', confidence: 92, timestamp: 'Há 1h', status: 'executed' },
  { id: 3, agent: 'Strategy Agent', action: 'Redistribuição Meta ← Google (30%)', impact: '+R$1.200 ROAS estimado/mês', confidence: 87, timestamp: 'Há 2h', status: 'pending' },
  { id: 4, agent: 'Content Agent', action: 'Ativou variação B do criativo', impact: 'CTR +12% observado', confidence: 78, timestamp: 'Há 3h', status: 'executed' },
  { id: 5, agent: 'Compliance Agent', action: 'Aprovou novo criativo para veiculação', impact: 'Zero risco de suspensão', confidence: 99, timestamp: 'Há 4h', status: 'executed' },
];

const ANOMALIES: Anomaly[] = [
  { metric: 'CPA', change: '+23% nas últimas 6h', severity: 'high', suggestion: 'Pausar conjunto C imediatamente' },
  { metric: 'CTR Mobile', change: '-18% vs semana passada', severity: 'medium', suggestion: 'Testar novo criativo para mobile' },
  { metric: 'Impressões', change: '+45% hoje', severity: 'low', suggestion: 'Monitorar CPM — possível aumento de concorrência' },
];

const STATUS_COLORS = {
  active: { color: '#10b981', label: 'Ativo' },
  analyzing: { color: '#f59e0b', label: 'Analisando' },
  idle: { color: '#64748b', label: 'Em espera' },
};

function AgentCard({ agent, selected, onClick }: { agent: Agent; selected: boolean; onClick: () => void }) {
  const Icon = agent.icon;
  const sc = STATUS_COLORS[agent.status];

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? `${agent.color}12` : 'rgba(15,23,42,0.8)',
        border: `1px solid ${selected ? agent.color + '50' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '14px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: `${agent.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={agent.color} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: sc.color, animation: agent.status === 'active' ? 'pulse 2s infinite' : 'none' }} />
          <span style={{ fontSize: '10px', color: sc.color, fontWeight: 600 }}>{sc.label}</span>
        </div>
      </div>
      <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{agent.name}</p>
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>{agent.role}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{agent.lastAction}</p>
        <span style={{ fontSize: '11px', fontWeight: 700, color: agent.color }}>{agent.confidence}%</span>
      </div>
      <div style={{ marginTop: '8px', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ height: '100%', borderRadius: '2px', background: agent.color, width: `${agent.confidence}%`, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

function DecisionRow({ decision }: { decision: Decision }) {
  const statusConfig = {
    executed: { color: '#10b981', label: 'Executado', icon: CheckCircle },
    pending: { color: '#f59e0b', label: 'Pendente', icon: Clock },
    rejected: { color: '#ef4444', label: 'Rejeitado', icon: AlertTriangle },
  };
  const sc = statusConfig[decision.status];
  const StatusIcon = sc.icon;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${sc.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <StatusIcon size={15} color={sc.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{decision.action}</p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{decision.agent} · {decision.impact}</p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: TEAL }}>{decision.confidence}%</p>
        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{decision.timestamp}</p>
      </div>
    </div>
  );
}

function ScenarioSimulator() {
  const [budget, setBudget] = useState(3000);

  const leads = Math.round(budget / 47);
  const revenue = Math.round(budget * 3.4);
  const profit = revenue - budget;

  return (
    <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Play size={15} color={TEAL} />
        <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Simulador de Cenários</p>
      </div>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>Ajuste o orçamento mensal e veja o impacto projetado.</p>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Orçamento mensal</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>R$ {budget.toLocaleString('pt-BR')}</span>
        </div>
        <input
          type="range"
          min={500}
          max={20000}
          step={500}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          style={{ width: '100%', accentColor: TEAL, cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>R$ 500</span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>R$ 20.000</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        {[
          { label: 'Leads est.', value: leads.toLocaleString(), color: '#3b82f6' },
          { label: 'Receita est.', value: `R$ ${revenue.toLocaleString('pt-BR')}`, color: '#10b981' },
          { label: 'Lucro est.', value: `R$ ${profit.toLocaleString('pt-BR')}`, color: profit > 0 ? '#10b981' : '#ef4444' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center', padding: '12px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>{label}</p>
            <p style={{ fontSize: '14px', fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', background: `${TEAL}10`, border: `1px solid ${TEAL}25` }}>
        <p style={{ fontSize: '11px', color: TEAL }}>
          Com base no seu CPA atual (R$47) e ROAS (3.4x) — projeção usando métricas reais das suas campanhas.
        </p>
      </div>
    </div>
  );
}

export default function CommandCenter() {
  const [selectedAgent, setSelectedAgent] = useState<string>('decision');
  const activeAgent = AGENTS.find((a) => a.id === selectedAgent) || AGENTS[5];

  return (
    <div style={{ minHeight: '100vh', background: '#000', padding: '32px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${TEAL}20`, border: `1px solid ${TEAL}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} color={TEAL} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>Command Center</h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>6 agentes IA trabalhando em paralelo para otimizar suas campanhas</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          {[
            { label: `${AGENTS.filter(a => a.status === 'active').length} ativos`, color: '#10b981' },
            { label: `${AGENTS.filter(a => a.status === 'analyzing').length} analisando`, color: '#f59e0b' },
            { label: `${DECISIONS.filter(d => d.status === 'pending').length} decisões pendentes`, color: TEAL },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', background: `${color}10`, border: `1px solid ${color}30` }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: color }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Agents grid */}
          <div>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Agentes Especializados</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {AGENTS.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  selected={selectedAgent === agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                />
              ))}
            </div>
          </div>

          {/* Selected agent recommendation */}
          <div style={{
            background: `${activeAgent.color}10`,
            border: `1px solid ${activeAgent.color}30`,
            borderRadius: '16px',
            padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <activeAgent.icon size={16} color={activeAgent.color} />
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{activeAgent.name}</p>
                <span style={{ fontSize: '11px', color: activeAgent.color, fontWeight: 700 }}>{activeAgent.confidence}% confiança</span>
              </div>
              <button style={{
                padding: '6px 14px', borderRadius: '8px', border: 'none',
                background: activeAgent.color, color: '#000',
                fontSize: '11px', fontWeight: 700, cursor: 'pointer',
              }}>
                Executar
              </button>
            </div>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.6' }}>
              {activeAgent.recommendation}
            </p>
          </div>

          {/* Anomaly detection */}
          <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Eye size={15} color='#f59e0b' />
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Anomaly Detection</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ANOMALIES.map((a) => {
                const sev = a.severity === 'high' ? '#ef4444' : a.severity === 'medium' ? '#f59e0b' : '#64748b';
                return (
                  <div key={a.metric} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: `${sev}08`, border: `1px solid ${sev}20` }}>
                    <AlertTriangle size={14} color={sev} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{a.metric}: <span style={{ color: sev }}>{a.change}</span></p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{a.suggestion}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <ScenarioSimulator />

          {/* Decision history */}
          <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <RotateCcw size={14} color='rgba(255,255,255,0.5)' />
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Histórico de Decisões</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {DECISIONS.map((d) => <DecisionRow key={d.id} decision={d} />)}
            </div>
          </div>

          {/* Marketing Mix */}
          <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <TrendingUp size={14} color={TEAL} />
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Marketing Mix Modeling</p>
            </div>
            {[
              { channel: 'Meta Ads', share: 55, roas: '3.8x', color: '#3b82f6' },
              { channel: 'Google Ads', share: 30, roas: '2.9x', color: '#f59e0b' },
              { channel: 'Orgânico', share: 15, roas: '∞', color: '#10b981' },
            ].map(({ channel, share, roas, color }) => (
              <div key={channel} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{channel}</span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{share}%</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color }}>{roas}</span>
                  </div>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)' }}>
                  <div style={{ height: '100%', borderRadius: '3px', background: color, width: `${share}%`, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', background: `${TEAL}08`, border: `1px solid ${TEAL}20` }}>
              <p style={{ fontSize: '11px', color: TEAL }}>
                Recomendação: aumentar Meta para 65% — ROAS 31% superior ao Google neste nicho.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
