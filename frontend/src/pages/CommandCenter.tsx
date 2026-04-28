import React, { useState, useMemo } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Bot,
  Zap,
  Target,
  BarChart2,
  ShieldCheck,
  PenTool,
  Brain,
  Clock,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react';

const COLORS = {
  primary: '#00B7B7',
  primaryDark: '#008A8A',
  primaryLight: '#E0F7F7',
  bg: '#F5F7FA',
  surface: '#FFFFFF',
  border: '#E5E9F0',
  borderStrong: '#D1D7E0',
  text: '#1A1F2E',
  textSoft: '#4A5568',
  textMuted: '#8B95A7',
  success: '#10B981',
  successLight: '#E8F8F2',
  warning: '#F59E0B',
  warningLight: '#FEF6E7',
  danger: '#EF4444',
  dangerLight: '#FEEBEB',
  info: '#3B82F6',
  infoLight: '#EBF2FE',
};

interface Recommendation {
  id: string;
  type: 'success' | 'critical' | 'warning';
  title: string;
  description: string;
  agent: string;
  confidence: number;
  impact: string;
  impactLabel: string;
}

interface Anomaly {
  id: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  time: string;
}

interface Decision {
  time: string;
  text: string;
  confidence: number;
}

interface Channel {
  name: string;
  alloc: number;
  roas: number;
  spend: number;
}

interface Agent {
  initials: string;
  name: string;
  role: string;
  status: 'ativo' | 'pensando' | 'agindo';
  icon: React.ReactNode;
  color: string;
}

const RECOMMENDATIONS: Recommendation[] = [
  {
    id: '1',
    type: 'success',
    title: 'Aumentar Lipoaspiração em 35%',
    description: 'ROAS de 3,2× sustentado por 14 dias. CPA estável em R$ 40. Audience com saturação de apenas 31%.',
    agent: 'Decision Agent',
    confidence: 94,
    impact: '+ R$ 2.400',
    impactLabel: 'lucro/mês',
  },
  {
    id: '2',
    type: 'critical',
    title: 'Encerrar Divórcio em 48 horas',
    description: 'ROAS de 1,8× abaixo do break-even. 3 testes de criativo falharam. Audience exausto.',
    agent: 'Strategy Agent',
    confidence: 87,
    impact: '– R$ 1.320',
    impactLabel: 'economia/sem.',
  },
  {
    id: '3',
    type: 'warning',
    title: 'Testar variações em Imobiliária',
    description: 'CTR de 2,8% bom, mas plateau detectado. 8 variações de headline prontas.',
    agent: 'Content Agent',
    confidence: 71,
    impact: '+ 12%',
    impactLabel: 'CTR potencial',
  },
];

const ANOMALIES: Anomaly[] = [
  { id: '1', level: 'critical', title: 'Spike de CPA em Divórcio', detail: 'CPA subiu 47% nas últimas 6h. Aumento de bid de competidor identificado.', time: '14:08' },
  { id: '2', level: 'warning', title: 'Queda de impressions em Lipoaspiração', detail: '23% menos impressions em 12h. Audience saturando, expanda lookalike.', time: '11:42' },
  { id: '3', level: 'info', title: 'Padrão sazonal detectado', detail: 'Conversões aumentam 34% nas terças entre 14h–17h. Budget realocado.', time: '09:15' },
];

const DECISIONS: Decision[] = [
  { time: '14:32', text: 'Realocou R$ 200 de YouTube para Google Search', confidence: 96 },
  { time: '13:18', text: 'Pausou criativo "Headline 4" em Lipoaspiração', confidence: 91 },
  { time: '12:45', text: 'Aumentou bid em palavras-chave de alta conversão', confidence: 88 },
  { time: '11:22', text: 'Mesclou ad sets com audience overlap detectado', confidence: 93 },
  { time: '10:07', text: 'Ativou variação de criativo gerada pelo Content Agent', confidence: 79 },
  { time: '09:33', text: 'Bloqueou anúncio por violação de política', confidence: 100 },
];

const CHANNELS: Channel[] = [
  { name: 'Meta Ads', alloc: 42, roas: 3.1, spend: 1815 },
  { name: 'Google Search', alloc: 35, roas: 3.4, spend: 1512 },
  { name: 'LinkedIn', alloc: 18, roas: 2.4, spend: 778 },
  { name: 'YouTube', alloc: 5, roas: 1.9, spend: 215 },
];

const AGENTS: Agent[] = [
  { initials: 'SA', name: 'Strategy Agent', role: 'Analisa padrões de 47 campanhas', status: 'pensando', icon: <Brain size={14} />, color: '#8B5CF6' },
  { initials: 'MB', name: 'Media Buyer Agent', role: 'Realocando budget entre canais', status: 'agindo', icon: <Target size={14} />, color: '#3B82F6' },
  { initials: 'CA', name: 'Content Agent', role: '8 variações de headline geradas', status: 'ativo', icon: <PenTool size={14} />, color: '#F59E0B' },
  { initials: 'AA', name: 'Analytics Agent', role: '3 anomalias detectadas hoje', status: 'ativo', icon: <BarChart2 size={14} />, color: '#10B981' },
  { initials: 'CP', name: 'Compliance Agent', role: '12 criativos validados', status: 'ativo', icon: <ShieldCheck size={14} />, color: '#EC4899' },
  { initials: 'DA', name: 'Decision Agent', role: 'Aguarda aprovação para escalar', status: 'pensando', icon: <Zap size={14} />, color: '#00B7B7' },
];

/* ─────────── Helpers ─────────── */

function Card({ children, padding = '24px', style = {} }: { children: React.ReactNode; padding?: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      padding,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function Badge({ type, children }: { type: 'success' | 'critical' | 'warning' | 'info' | 'primary'; children: React.ReactNode }) {
  const palette = {
    success: { bg: COLORS.successLight, color: COLORS.success },
    critical: { bg: COLORS.dangerLight, color: COLORS.danger },
    warning: { bg: COLORS.warningLight, color: COLORS.warning },
    info: { bg: COLORS.infoLight, color: COLORS.info },
    primary: { bg: COLORS.primaryLight, color: COLORS.primaryDark },
  }[type];

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '11px',
      fontWeight: 600,
      padding: '3px 8px',
      borderRadius: '4px',
      background: palette.bg,
      color: palette.color,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: COLORS.text, margin: '0 0 2px' }}>{title}</h2>
        {subtitle && <p style={{ fontSize: '13px', color: COLORS.textMuted, margin: 0 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ─────────── Main ─────────── */

export default function CommandCenter() {
  const [budget, setBudget] = useState(450);

  const scenario = useMemo(() => {
    const leads = budget / 40;
    const conv = leads * 0.24;
    const rev = conv * 500;
    const profit = rev - budget;
    return {
      leads: leads.toFixed(1).replace('.', ','),
      conv: conv.toFixed(1).replace('.', ','),
      rev: Math.round(rev).toLocaleString('pt-BR'),
      profit: Math.round(profit).toLocaleString('pt-BR'),
      profitPositive: profit > 0,
    };
  }, [budget]);

  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.bg,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      color: COLORS.text,
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* TOP HEADER */}
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px', color: COLORS.text, letterSpacing: '-0.3px' }}>
              Command Center
            </h1>
            <p style={{ fontSize: '14px', color: COLORS.textSoft, margin: 0 }}>
              Sistema autônomo de gestão de campanhas · 6 agentes ativos
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: COLORS.successLight,
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: COLORS.success,
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                background: COLORS.success,
                borderRadius: '50%',
                animation: 'pulse 2s infinite',
              }} />
              Sistema operando
            </span>
          </div>
        </div>

        {/* MÉTRICAS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}>
          {[
            { label: 'Budget total', value: 'R$ 4.320', delta: '+R$ 600 realocados', up: true, icon: <Activity size={16} /> },
            { label: 'ROAS médio', value: '2,83×', delta: '+0,4 vs ontem', up: true, icon: <TrendingUp size={16} /> },
            { label: 'Decisões hoje', value: '17', delta: '14 autônomas', up: null, icon: <Bot size={16} /> },
            { label: 'Lucro projetado', value: 'R$ 8.890', delta: '+18% via IA', up: true, icon: <Sparkles size={16} /> },
          ].map((m, i) => (
            <Card key={i} padding="20px">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: COLORS.textMuted, fontWeight: 500 }}>{m.label}</span>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: COLORS.primaryLight,
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: COLORS.primary,
                }}>
                  {m.icon}
                </div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '6px', letterSpacing: '-0.5px' }}>
                {m.value}
              </div>
              <div style={{
                fontSize: '12px',
                color: m.up === true ? COLORS.success : m.up === false ? COLORS.danger : COLORS.textMuted,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 500,
              }}>
                {m.up === true && <ArrowUpRight size={12} />}
                {m.delta}
              </div>
            </Card>
          ))}
        </div>

        {/* RECOMENDAÇÕES + SIMULADOR */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', marginBottom: '32px' }}>
          <Card padding="0">
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}` }}>
              <SectionHeader
                title="Recomendações prescritivas"
                subtitle="Ações sugeridas pelos agentes IA"
              />
            </div>
            <div>
              {RECOMMENDATIONS.map((rec, i) => (
                <div key={rec.id} style={{
                  padding: '20px 24px',
                  borderBottom: i === RECOMMENDATIONS.length - 1 ? 'none' : `1px solid ${COLORS.border}`,
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.bg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: rec.type === 'success' ? COLORS.successLight : rec.type === 'critical' ? COLORS.dangerLight : COLORS.warningLight,
                    color: rec.type === 'success' ? COLORS.success : rec.type === 'critical' ? COLORS.danger : COLORS.warning,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {rec.type === 'success' ? <CheckCircle2 size={18} /> : rec.type === 'critical' ? <AlertCircle size={18} /> : <Clock size={18} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: COLORS.text }}>
                        {rec.title}
                      </h3>
                    </div>
                    <p style={{ fontSize: '13px', color: COLORS.textSoft, margin: '0 0 8px', lineHeight: 1.5 }}>
                      {rec.description}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <Badge type="primary">{rec.agent}</Badge>
                      <span style={{ fontSize: '12px', color: COLORS.textMuted }}>
                        Confiança {rec.confidence}%
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: rec.type === 'critical' ? COLORS.danger : COLORS.success, lineHeight: 1.2 }}>
                      {rec.impact}
                    </div>
                    <div style={{ fontSize: '11px', color: COLORS.textMuted, marginTop: '2px' }}>
                      {rec.impactLabel}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="0">
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}` }}>
              <SectionHeader title="Simulador de cenário" subtitle="Projeção em tempo real" />
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: COLORS.textSoft }}>Budget diário</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: COLORS.primary, letterSpacing: '-0.3px' }}>
                    R$ {budget.toLocaleString('pt-BR')}
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={1000}
                  step={50}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: COLORS.primary,
                    height: '4px',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: COLORS.textMuted, marginTop: '4px' }}>
                  <span>R$ 100</span>
                  <span>R$ 1.000</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Leads previstos', value: scenario.leads },
                  { label: 'Conversões esperadas', value: scenario.conv },
                  { label: 'Receita estimada', value: 'R$ ' + scenario.rev },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: COLORS.textSoft }}>{s.label}</span>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{s.value}</span>
                  </div>
                ))}
                <div style={{
                  marginTop: '8px',
                  padding: '12px 16px',
                  background: scenario.profitPositive ? COLORS.successLight : COLORS.dangerLight,
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: scenario.profitPositive ? COLORS.success : COLORS.danger }}>
                    Lucro líquido
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: scenario.profitPositive ? COLORS.success : COLORS.danger, letterSpacing: '-0.3px' }}>
                    R$ {scenario.profit}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* MIX DE CANAIS */}
        <Card padding="0" style={{ marginBottom: '32px' }}>
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}` }}>
            <SectionHeader
              title="Mix de canais"
              subtitle="Performance por plataforma"
              action={
                <button style={{
                  fontSize: '13px',
                  color: COLORS.primary,
                  background: 'transparent',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  Ver detalhes <ChevronRight size={14} />
                </button>
              }
            />
          </div>
          <div style={{ padding: '8px 0' }}>
            {CHANNELS.map((ch, i) => (
              <div key={ch.name} style={{
                padding: '16px 24px',
                borderBottom: i === CHANNELS.length - 1 ? 'none' : `1px solid ${COLORS.border}`,
                display: 'grid',
                gridTemplateColumns: '1fr 2fr auto auto',
                gap: '20px',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>{ch.name}</div>
                  <div style={{ fontSize: '12px', color: COLORS.textMuted }}>R$ {ch.spend.toLocaleString('pt-BR')}</div>
                </div>
                <div>
                  <div style={{ height: '8px', background: COLORS.bg, borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${ch.alloc}%`,
                      background: ch.roas >= 3 ? COLORS.success : ch.roas >= 2 ? COLORS.primary : COLORS.warning,
                      borderRadius: '4px',
                    }} />
                  </div>
                  <div style={{ fontSize: '11px', color: COLORS.textMuted, marginTop: '4px' }}>{ch.alloc}% do budget</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: ch.roas >= 3 ? COLORS.success : ch.roas >= 2 ? COLORS.text : COLORS.warning }}>
                    {ch.roas.toFixed(1).replace('.', ',')}×
                  </div>
                  <div style={{ fontSize: '11px', color: COLORS.textMuted }}>ROAS</div>
                </div>
                <Badge type={ch.roas >= 3 ? 'success' : ch.roas >= 2 ? 'info' : 'warning'}>
                  {ch.roas >= 3 ? 'Escalar' : ch.roas >= 2 ? 'Manter' : 'Revisar'}
                </Badge>
              </div>
            ))}
          </div>
          <div style={{
            padding: '16px 24px',
            background: COLORS.primaryLight,
            borderTop: `1px solid ${COLORS.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: COLORS.primary,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0,
            }}>
              <Sparkles size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.primaryDark, marginBottom: '2px' }}>
                Sugestão do Media Buyer Agent
              </div>
              <div style={{ fontSize: '13px', color: COLORS.text }}>
                Aumentar Google Search para 45% e zerar YouTube. Lucro projetado: <strong>+R$ 720/semana</strong>
              </div>
            </div>
            <button style={{
              padding: '8px 14px',
              background: COLORS.primary,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}>
              Aplicar sugestão
            </button>
          </div>
        </Card>

        {/* AGENTES + ANOMALIAS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
          <Card padding="0">
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}` }}>
              <SectionHeader title="Agentes em ação" subtitle="Status em tempo real" />
            </div>
            <div>
              {AGENTS.map((agent, i) => (
                <div key={agent.initials} style={{
                  padding: '14px 24px',
                  borderBottom: i === AGENTS.length - 1 ? 'none' : `1px solid ${COLORS.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: agent.color + '15',
                    color: agent.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {agent.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{agent.name}</div>
                    <div style={{ fontSize: '12px', color: COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {agent.role}
                    </div>
                  </div>
                  <Badge type={agent.status === 'agindo' ? 'warning' : agent.status === 'pensando' ? 'info' : 'success'}>
                    {agent.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="0">
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}` }}>
              <SectionHeader title="Anomalias detectadas" subtitle="Alertas em tempo real" />
            </div>
            <div>
              {ANOMALIES.map((a, i) => (
                <div key={a.id} style={{
                  padding: '16px 24px',
                  borderBottom: i === ANOMALIES.length - 1 ? 'none' : `1px solid ${COLORS.border}`,
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: a.level === 'critical' ? COLORS.dangerLight : a.level === 'warning' ? COLORS.warningLight : COLORS.infoLight,
                    color: a.level === 'critical' ? COLORS.danger : a.level === 'warning' ? COLORS.warning : COLORS.info,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <AlertCircle size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{a.title}</span>
                      <span style={{ fontSize: '11px', color: COLORS.textMuted, whiteSpace: 'nowrap' }}>{a.time}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: COLORS.textSoft, margin: 0, lineHeight: 1.5 }}>{a.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* HISTÓRICO */}
        <Card padding="0">
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}` }}>
            <SectionHeader title="Histórico de decisões" subtitle="Últimas ações executadas autonomamente" />
          </div>
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {DECISIONS.map((d, i) => (
              <div key={i} style={{
                padding: '12px 24px',
                borderBottom: i === DECISIONS.length - 1 ? 'none' : `1px solid ${COLORS.border}`,
                display: 'grid',
                gridTemplateColumns: '60px 1fr auto',
                gap: '16px',
                alignItems: 'center',
                fontSize: '13px',
              }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  color: COLORS.textMuted,
                  fontWeight: 500,
                }}>
                  {d.time}
                </span>
                <span style={{ color: COLORS.textSoft }}>{d.text}</span>
                <span style={{
                  fontWeight: 600,
                  color: d.confidence >= 90 ? COLORS.success : d.confidence >= 80 ? COLORS.primary : COLORS.warning,
                  fontSize: '13px',
                }}>
                  {d.confidence}%
                </span>
              </div>
            ))}
          </div>
        </Card>

      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (max-width: 768px) {
          .grid-2-col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
