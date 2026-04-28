import React, { useState, useMemo } from 'react';

/* ============================================================
   ÊXODOS COMMAND CENTER — Editorial Performance
   Visual inspirado em relatório financeiro + revista de design.
   Sem cards coloridos. Hierarquia por tipografia, não cor.
   ============================================================ */

const COLORS = {
  paper: '#FBF8F1',
  paperDeep: '#F5F1E6',
  ink: '#0A0A0A',
  inkSoft: '#3A3A35',
  inkMuted: '#6B6B63',
  rule: 'rgba(10,10,10,0.18)',
  ruleStrong: '#0A0A0A',
  gold: '#8B6F2D',
  green: '#1F3A2D',
  red: '#8B1A1A',
};

const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif";
const SANS = "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', Menlo, monospace";

interface Recommendation {
  id: string;
  type: 'success' | 'critical' | 'watch';
  tag: string;
  headline: string;
  deck: string;
  agent: string;
  confidence: number;
  impact: { value: string; label: string };
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
}

interface Agent {
  initials: string;
  name: string;
  role: string;
  status: 'ativo' | 'pensando' | 'agindo';
}

const RECOMMENDATIONS: Recommendation[] = [
  {
    id: '1',
    type: 'success',
    tag: 'Escalar',
    headline: 'Aumentar Lipoaspiração em 35%',
    deck: 'ROAS de 3,2× sustentado por quatorze dias consecutivos. CPA estável em R$ 40. Audience com saturação de apenas 31% — espaço amplo para crescimento.',
    agent: 'Decision Agent',
    confidence: 94,
    impact: { value: '+ R$ 2.400', label: 'lucro/mês' },
  },
  {
    id: '2',
    type: 'critical',
    tag: 'Pausar',
    headline: 'Encerrar Divórcio em 48 horas',
    deck: 'ROAS de 1,8× abaixo do ponto de equilíbrio (2,0×). Três rotações de criativo falharam consecutivamente. Audience exausto.',
    agent: 'Strategy Agent',
    confidence: 87,
    impact: { value: '– R$ 1.320', label: 'economia/sem.' },
  },
  {
    id: '3',
    type: 'watch',
    tag: 'Observar',
    headline: 'Testar novas variações em Imobiliária',
    deck: 'CTR de 2,8% bom, porém plateau detectado. Content Agent gerou oito variações de headline prontas para teste A/B controlado.',
    agent: 'Content Agent',
    confidence: 71,
    impact: { value: '+ 12%', label: 'CTR potencial' },
  },
];

const ANOMALIES: Anomaly[] = [
  { id: '1', level: 'critical', title: 'Spike de CPA em Divórcio', detail: 'CPA subiu 47% nas últimas 6h. Causa provável: aumento de bid de competidor identificado.', time: '14:08' },
  { id: '2', level: 'warning', title: 'Queda de impressions em Lipoaspiração', detail: '23% menos impressions nas últimas 12h. Audience em saturação. Recomenda-se expandir lookalike de 1% para 3%.', time: '11:42' },
  { id: '3', level: 'info', title: 'Padrão sazonal detectado', detail: 'Conversões aumentam 34% nas terças entre 14h–17h. Sistema realocou 22% do budget para esse horário.', time: '09:15' },
];

const DECISIONS: Decision[] = [
  { time: '14:32', text: 'Realocou R$ 200 de YouTube para Google Search (CPA 3,4× melhor)', confidence: 96 },
  { time: '13:18', text: 'Pausou criativo "Headline 4" em Lipoaspiração (CTR 0,8% após 1.200 impressions)', confidence: 91 },
  { time: '12:45', text: 'Aumentou bid em palavras-chave de alta conversão (+18% impressions previsto)', confidence: 88 },
  { time: '11:22', text: 'Mesclou ad sets com audience overlap detectado para reduzir custo', confidence: 93 },
  { time: '10:07', text: 'Ativou variação de criativo gerada pelo Content Agent (CTR previsto 3,1%)', confidence: 79 },
  { time: '09:33', text: 'Bloqueou anúncio por violação de política', confidence: 100 },
  { time: '08:15', text: 'Expandiu lookalike audience de 1% para 2% (saturação detectada)', confidence: 85 },
];

const CHANNELS: Channel[] = [
  { name: 'Meta Ads', alloc: 42, roas: 3.1 },
  { name: 'Google Search', alloc: 35, roas: 3.4 },
  { name: 'LinkedIn', alloc: 18, roas: 2.4 },
  { name: 'YouTube', alloc: 5, roas: 1.9 },
];

const AGENTS: Agent[] = [
  { initials: 'SA', name: 'Strategy Agent', role: 'Analisa padrões de 47 campanhas históricas', status: 'pensando' },
  { initials: 'MB', name: 'Media Buyer Agent', role: 'Realocando R$ 600 entre canais', status: 'agindo' },
  { initials: 'CA', name: 'Content Agent', role: 'Oito variações de headline geradas', status: 'ativo' },
  { initials: 'AA', name: 'Analytics Agent', role: 'Três anomalias detectadas hoje', status: 'ativo' },
  { initials: 'CP', name: 'Compliance Agent', role: 'Doze criativos validados, um bloqueado', status: 'ativo' },
  { initials: 'DA', name: 'Decision Agent', role: 'Aguarda aprovação para escalar duas campanhas', status: 'pensando' },
];

/* ---------- Helpers ---------- */

function Tag({ type, children }: { type: 'success' | 'critical' | 'watch'; children: React.ReactNode }) {
  const color =
    type === 'success' ? COLORS.green
    : type === 'critical' ? COLORS.red
    : COLORS.gold;

  return (
    <span style={{
      display: 'inline-block',
      fontSize: '9px',
      textTransform: 'uppercase',
      letterSpacing: '1.8px',
      padding: '3px 9px',
      border: `0.5px solid ${color}`,
      color,
      fontWeight: 500,
      fontFamily: SANS,
      marginBottom: '10px',
    }}>
      {children}
    </span>
  );
}

function SectionLabel({ children, num }: { children: React.ReactNode; num?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '20px' }}>
      {num && (
        <span style={{
          fontFamily: SERIF,
          fontSize: '13px',
          fontStyle: 'italic',
          color: COLORS.gold,
          fontWeight: 400,
        }}>
          §{num}
        </span>
      )}
      <p style={{
        fontFamily: SANS,
        fontSize: '10px',
        textTransform: 'uppercase',
        letterSpacing: '2.5px',
        color: COLORS.inkMuted,
        fontWeight: 500,
        margin: 0,
      }}>
        {children}
      </p>
    </div>
  );
}

/* ---------- Main ---------- */

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
      background: COLORS.paper,
      color: COLORS.ink,
      fontFamily: SANS,
      lineHeight: 1.5,
      padding: '40px 24px 80px',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* MASTHEAD */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          paddingBottom: '14px',
          borderBottom: `1.5px solid ${COLORS.ruleStrong}`,
          marginBottom: '36px',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{
            fontFamily: SERIF,
            fontSize: '32px',
            fontWeight: 500,
            letterSpacing: '-0.8px',
            lineHeight: 1,
          }}>
            <span style={{ color: COLORS.gold }}>Ê</span>xodos
            <span style={{ fontStyle: 'italic', fontWeight: 400, color: COLORS.inkSoft, fontSize: '24px', marginLeft: '8px' }}>
              · command
            </span>
          </div>
          <div style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: COLORS.inkMuted,
            fontWeight: 500,
          }}>
            28 abr 2026 · ed. matinal · <span style={{ color: COLORS.green }}>● 6 agentes ativos</span>
          </div>
        </header>

        {/* LEDE */}
        <p style={{
          fontFamily: SERIF,
          fontSize: '21px',
          lineHeight: 1.55,
          fontWeight: 400,
          maxWidth: '640px',
          margin: '0 0 48px',
          color: COLORS.inkSoft,
          letterSpacing: '-0.2px',
        }}>
          Seis agentes operam suas campanhas neste momento. Dezessete decisões foram tomadas hoje, quatorze de forma autônoma.{' '}
          <span style={{ color: COLORS.gold, fontStyle: 'italic' }}>
            Lucro projetado para o mês: R$ 8.890
          </span>{' '}
          — dezoito por cento acima da operação manual.
        </p>

        {/* INDICADORES */}
        <SectionLabel num="01">Indicadores em tempo real</SectionLabel>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1px',
          background: COLORS.ruleStrong,
          marginBottom: '56px',
          border: `0.5px solid ${COLORS.ruleStrong}`,
        }}>
          {[
            { label: 'Budget total', value: '4.320', delta: '+ 600 realocados', up: true },
            { label: 'ROAS médio', value: '2,83×', delta: '+ 0,4 vs ontem', up: true },
            { label: 'Decisões hoje', value: '17', delta: '14 autônomas', up: null },
            { label: 'Lucro projetado', value: '8.890', delta: '+ 18% via IA', up: true },
          ].map((m, i) => (
            <div key={i} style={{ background: COLORS.paper, padding: '20px 18px 18px' }}>
              <p style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1.8px',
                color: COLORS.inkMuted,
                margin: '0 0 10px',
                fontWeight: 500,
              }}>
                {m.label}
              </p>
              <p style={{
                fontFamily: SERIF,
                fontSize: '36px',
                fontWeight: 500,
                letterSpacing: '-1.2px',
                lineHeight: 1,
                margin: 0,
                color: COLORS.ink,
              }}>
                {m.value}
              </p>
              <p style={{
                fontSize: '11px',
                color: m.up === true ? COLORS.green : m.up === false ? COLORS.red : COLORS.inkMuted,
                margin: '8px 0 0',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {m.delta}
              </p>
            </div>
          ))}
        </div>

        {/* RECOMENDAÇÕES */}
        <SectionLabel num="02">Recomendações prescritivas</SectionLabel>
        <div style={{ marginBottom: '56px' }}>
          {RECOMMENDATIONS.map((rec, i) => (
            <article key={rec.id} style={{
              padding: '24px 0',
              borderTop: i === 0 ? `1.5px solid ${COLORS.ruleStrong}` : `0.5px solid ${COLORS.rule}`,
              borderBottom: i === RECOMMENDATIONS.length - 1 ? `1.5px solid ${COLORS.ruleStrong}` : 'none',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr auto',
                gap: '20px',
                alignItems: 'baseline',
              }}>
                <div style={{
                  fontFamily: SERIF,
                  fontSize: '38px',
                  fontWeight: 400,
                  color: '#C7C2B5',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {String(i + 1).padStart(2, '0')}
                </div>

                <div>
                  <Tag type={rec.type}>{rec.tag}</Tag>
                  <h3 style={{
                    fontFamily: SERIF,
                    fontSize: '23px',
                    fontWeight: 500,
                    letterSpacing: '-0.5px',
                    lineHeight: 1.25,
                    margin: '0 0 8px',
                    color: COLORS.ink,
                  }}>
                    {rec.headline}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: COLORS.inkSoft,
                    lineHeight: 1.6,
                    margin: '0 0 10px',
                    maxWidth: '560px',
                  }}>
                    {rec.deck}
                  </p>
                  <p style={{
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    color: COLORS.gold,
                    fontWeight: 500,
                    margin: 0,
                  }}>
                    {rec.agent} · confiança {rec.confidence}%
                  </p>
                </div>

                <div style={{
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                }}>
                  <div style={{
                    fontFamily: SERIF,
                    fontSize: '18px',
                    fontWeight: 500,
                    color: COLORS.ink,
                    lineHeight: 1.1,
                  }}>
                    {rec.impact.value}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    color: COLORS.inkMuted,
                    marginTop: '4px',
                  }}>
                    {rec.impact.label}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* SIMULADOR */}
        <SectionLabel num="03">Simulador de cenário</SectionLabel>
        <div style={{
          padding: '28px 0',
          borderTop: `1.5px solid ${COLORS.ruleStrong}`,
          borderBottom: `1.5px solid ${COLORS.ruleStrong}`,
          marginBottom: '56px',
        }}>
          <p style={{
            fontFamily: SERIF,
            fontSize: '17px',
            fontStyle: 'italic',
            color: COLORS.inkSoft,
            margin: '0 0 24px',
            maxWidth: '500px',
            lineHeight: 1.5,
          }}>
            Ajuste o orçamento diário e observe a projeção em tempo real.
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '32px',
            paddingBottom: '20px',
            borderBottom: `0.5px solid ${COLORS.rule}`,
          }}>
            <span style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '1.8px',
              color: COLORS.inkMuted,
              minWidth: '110px',
              fontWeight: 500,
            }}>
              Budget diário
            </span>
            <input
              type="range"
              min={100}
              max={1000}
              step={50}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              style={{
                flex: 1,
                accentColor: COLORS.gold,
                height: '4px',
              }}
            />
            <span style={{
              fontFamily: SERIF,
              fontSize: '24px',
              fontWeight: 500,
              minWidth: '120px',
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.5px',
            }}>
              R$ {budget.toLocaleString('pt-BR')}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '24px',
          }}>
            {[
              { label: 'Leads previstos', value: scenario.leads, accent: false },
              { label: 'Conversões esperadas', value: scenario.conv, accent: false },
              { label: 'Receita estimada', value: 'R$ ' + scenario.rev, accent: false },
              { label: 'Lucro líquido', value: 'R$ ' + scenario.profit, accent: true },
            ].map((m, i) => (
              <div key={i}>
                <p style={{
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '1.8px',
                  color: COLORS.inkMuted,
                  margin: '0 0 8px',
                  fontWeight: 500,
                }}>
                  {m.label}
                </p>
                <p style={{
                  fontFamily: SERIF,
                  fontSize: '24px',
                  fontWeight: 500,
                  letterSpacing: '-0.5px',
                  margin: 0,
                  fontVariantNumeric: 'tabular-nums',
                  color: m.accent ? (scenario.profitPositive ? COLORS.green : COLORS.red) : COLORS.ink,
                }}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* MIX DE CANAIS */}
        <SectionLabel num="04">Composição do mix de canais</SectionLabel>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '56px',
          fontVariantNumeric: 'tabular-nums',
        }}>
          <thead>
            <tr style={{ borderTop: `1.5px solid ${COLORS.ruleStrong}`, borderBottom: `0.5px solid ${COLORS.rule}` }}>
              <th style={{
                textAlign: 'left',
                padding: '12px 0',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1.8px',
                color: COLORS.inkMuted,
                fontWeight: 500,
              }}>Canal</th>
              <th style={{
                textAlign: 'right',
                padding: '12px 0',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1.8px',
                color: COLORS.inkMuted,
                fontWeight: 500,
              }}>Alocação</th>
              <th style={{
                textAlign: 'right',
                padding: '12px 0',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1.8px',
                color: COLORS.inkMuted,
                fontWeight: 500,
              }}>ROAS</th>
              <th style={{
                textAlign: 'right',
                padding: '12px 0',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1.8px',
                color: COLORS.inkMuted,
                fontWeight: 500,
              }}>Performance</th>
            </tr>
          </thead>
          <tbody>
            {CHANNELS.map((ch, i) => (
              <tr key={ch.name} style={{
                borderBottom: i === CHANNELS.length - 1 ? `1.5px solid ${COLORS.ruleStrong}` : `0.5px solid ${COLORS.rule}`,
              }}>
                <td style={{
                  padding: '16px 0',
                  fontFamily: SERIF,
                  fontSize: '17px',
                  fontWeight: 500,
                }}>
                  {ch.name}
                </td>
                <td style={{
                  textAlign: 'right',
                  padding: '16px 0',
                  fontSize: '14px',
                }}>
                  {ch.alloc}%
                </td>
                <td style={{
                  textAlign: 'right',
                  padding: '16px 0',
                  fontFamily: SERIF,
                  fontSize: '17px',
                  fontWeight: 500,
                  color: ch.roas >= 3 ? COLORS.green : ch.roas >= 2 ? COLORS.ink : COLORS.red,
                }}>
                  {ch.roas.toFixed(1).replace('.', ',')}×
                </td>
                <td style={{ textAlign: 'right', padding: '16px 0' }}>
                  <span style={{
                    display: 'inline-block',
                    width: `${ch.alloc * 1.5}px`,
                    height: '2px',
                    background: COLORS.ink,
                    verticalAlign: 'middle',
                  }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{
          fontFamily: SERIF,
          fontSize: '15px',
          fontStyle: 'italic',
          color: COLORS.inkSoft,
          margin: '-32px 0 56px',
          paddingLeft: '20px',
          borderLeft: `1.5px solid ${COLORS.gold}`,
          maxWidth: '600px',
          lineHeight: 1.6,
        }}>
          O Media Buyer Agent recomenda aumentar Google Search para 45% e zerar YouTube. Lucro projetado adicional: <span style={{ color: COLORS.gold, fontWeight: 500 }}>+ R$ 720 por semana</span>.
        </p>

        {/* AGENTES */}
        <SectionLabel num="05">Equipe de agentes</SectionLabel>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0',
          marginBottom: '56px',
          borderTop: `1.5px solid ${COLORS.ruleStrong}`,
          borderBottom: `1.5px solid ${COLORS.ruleStrong}`,
        }}>
          {AGENTS.map((agent, i) => (
            <div key={agent.initials} style={{
              padding: '18px 20px 18px 0',
              paddingLeft: i % 2 === 1 ? '24px' : 0,
              borderTop: i >= 2 ? `0.5px solid ${COLORS.rule}` : 'none',
              borderLeft: i % 2 === 1 ? `0.5px solid ${COLORS.rule}` : 'none',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
            }}>
              <div style={{
                fontFamily: SERIF,
                fontSize: '20px',
                fontWeight: 500,
                color: COLORS.gold,
                fontStyle: 'italic',
                minWidth: '32px',
                lineHeight: 1.2,
              }}>
                {agent.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    margin: 0,
                    color: COLORS.ink,
                  }}>
                    {agent.name}
                  </p>
                  <span style={{
                    fontSize: '9px',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    color: agent.status === 'agindo' ? COLORS.gold : agent.status === 'pensando' ? COLORS.inkMuted : COLORS.green,
                    fontWeight: 500,
                  }}>
                    {agent.status === 'agindo' ? '● agindo' : agent.status === 'pensando' ? '○ pensando' : '● ativo'}
                  </span>
                </div>
                <p style={{
                  fontSize: '13px',
                  color: COLORS.inkSoft,
                  margin: 0,
                  lineHeight: 1.5,
                }}>
                  {agent.role}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ANOMALIAS */}
        <SectionLabel num="06">Anomalias detectadas</SectionLabel>
        <div style={{ marginBottom: '56px' }}>
          {ANOMALIES.map((a, i) => (
            <div key={a.id} style={{
              padding: '18px 0',
              borderTop: i === 0 ? `1.5px solid ${COLORS.ruleStrong}` : `0.5px solid ${COLORS.rule}`,
              borderBottom: i === ANOMALIES.length - 1 ? `1.5px solid ${COLORS.ruleStrong}` : 'none',
              display: 'grid',
              gridTemplateColumns: '60px 1fr auto',
              gap: '20px',
              alignItems: 'baseline',
            }}>
              <span style={{
                fontFamily: MONO,
                fontSize: '12px',
                color: COLORS.inkMuted,
              }}>
                {a.time}
              </span>
              <div>
                <p style={{
                  fontFamily: SERIF,
                  fontSize: '17px',
                  fontWeight: 500,
                  margin: '0 0 4px',
                  color: a.level === 'critical' ? COLORS.red : a.level === 'warning' ? COLORS.gold : COLORS.ink,
                }}>
                  {a.title}
                </p>
                <p style={{
                  fontSize: '13px',
                  color: COLORS.inkSoft,
                  margin: 0,
                  lineHeight: 1.55,
                }}>
                  {a.detail}
                </p>
              </div>
              <span style={{
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '1.8px',
                color: a.level === 'critical' ? COLORS.red : a.level === 'warning' ? COLORS.gold : COLORS.inkMuted,
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}>
                {a.level === 'critical' ? '— crítico' : a.level === 'warning' ? '— atenção' : '— info'}
              </span>
            </div>
          ))}
        </div>

        {/* HISTÓRICO */}
        <SectionLabel num="07">Histórico de decisões autônomas</SectionLabel>
        <div style={{
          borderTop: `1.5px solid ${COLORS.ruleStrong}`,
          borderBottom: `1.5px solid ${COLORS.ruleStrong}`,
          maxHeight: '320px',
          overflowY: 'auto',
        }}>
          {DECISIONS.map((d, i) => (
            <div key={i} style={{
              padding: '14px 0',
              borderTop: i === 0 ? 'none' : `0.5px solid ${COLORS.rule}`,
              display: 'grid',
              gridTemplateColumns: '60px 1fr auto',
              gap: '20px',
              alignItems: 'baseline',
            }}>
              <span style={{
                fontFamily: MONO,
                fontSize: '12px',
                color: COLORS.inkMuted,
              }}>
                {d.time}
              </span>
              <p style={{
                fontSize: '13px',
                color: COLORS.inkSoft,
                margin: 0,
                lineHeight: 1.55,
              }}>
                {d.text}
              </p>
              <span style={{
                fontFamily: SERIF,
                fontSize: '14px',
                fontWeight: 500,
                color: d.confidence >= 90 ? COLORS.green : d.confidence >= 80 ? COLORS.ink : COLORS.gold,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {d.confidence}%
              </span>
            </div>
          ))}
        </div>

        {/* COLOFON */}
        <footer style={{
          marginTop: '64px',
          paddingTop: '20px',
          borderTop: `0.5px solid ${COLORS.rule}`,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          color: COLORS.inkMuted,
          fontWeight: 500,
        }}>
          <span>Êxodos · sistema autônomo de tráfego pago</span>
          <span style={{ color: COLORS.gold }}>versão editorial · 2026</span>
        </footer>

      </div>
    </div>
  );
}
