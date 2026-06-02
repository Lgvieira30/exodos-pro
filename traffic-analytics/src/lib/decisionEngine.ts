import type { Decision, Confidence, AggregatedRow } from '@/types/dashboard';

interface DecisionInput {
  leads: number;
  won: number;
  lost: number;
  open: number;
  cost: number;
  cplReal: number;
  closeRate: number;
  targetCpl?: number;
}

interface DecisionOutput {
  decision: Decision;
  confidence: Confidence;
  decisionColor: string;
  decisionReason: string;
}

const DECISION_COLORS: Record<Decision, string> = {
  Escalar: '#16a34a',
  Observar: '#ca8a04',
  Revisar: '#dc2626',
  Cortar: '#991b1b',
  'Pouco dado': '#6b7280',
};

const DECISION_BG: Record<Decision, string> = {
  Escalar: '#dcfce7',
  Observar: '#fef9c3',
  Revisar: '#fee2e2',
  Cortar: '#fecaca',
  'Pouco dado': '#f3f4f6',
};

export function decisionEngine(input: DecisionInput): DecisionOutput {
  const { leads, won, closeRate, cplReal, targetCpl } = input;

  const confidence: Confidence =
    leads >= 20 ? 'Alta' : leads >= 5 ? 'Média' : 'Baixa';

  if (leads < 3) {
    return {
      decision: 'Pouco dado',
      confidence,
      decisionColor: DECISION_COLORS['Pouco dado'],
      decisionReason: `Apenas ${leads} lead${leads !== 1 ? 's' : ''} — aguardar volume`,
    };
  }

  const aboveCpl = targetCpl ? cplReal > targetCpl * 1.3 : false;
  const belowCpl = targetCpl ? cplReal < targetCpl * 0.8 : false;

  if (leads >= 20 && closeRate < 5) {
    return {
      decision: 'Cortar',
      confidence,
      decisionColor: DECISION_COLORS['Cortar'],
      decisionReason: `${leads} leads, apenas ${won} fechamentos (${closeRate.toFixed(0)}% de fechamento) — baixíssima qualidade`,
    };
  }

  if (leads >= 5 && closeRate >= 30 && (!aboveCpl || belowCpl)) {
    return {
      decision: 'Escalar',
      confidence,
      decisionColor: DECISION_COLORS['Escalar'],
      decisionReason: `${closeRate.toFixed(0)}% de fechamento com ${leads} leads — boa eficiência${belowCpl ? ', CPL abaixo da meta' : ''}`,
    };
  }

  if (leads >= 5 && closeRate >= 15 && closeRate < 30) {
    return {
      decision: 'Observar',
      confidence,
      decisionColor: DECISION_COLORS['Observar'],
      decisionReason: `${closeRate.toFixed(0)}% de fechamento — potencial em desenvolvimento`,
    };
  }

  if (leads >= 5 && closeRate < 15) {
    return {
      decision: 'Revisar',
      confidence,
      decisionColor: DECISION_COLORS['Revisar'],
      decisionReason: `${closeRate.toFixed(0)}% de fechamento${aboveCpl ? ' e CPL acima da meta' : ''} — qualidade do lead a revisar`,
    };
  }

  return {
    decision: 'Observar',
    confidence,
    decisionColor: DECISION_COLORS['Observar'],
    decisionReason: `${leads} leads, ${closeRate.toFixed(0)}% fechamento — volume insuficiente para decisão`,
  };
}

export function applyDecision(row: Omit<AggregatedRow, 'confidence' | 'decision' | 'decisionColor' | 'decisionReason'>, targetCpl?: number): AggregatedRow {
  const result = decisionEngine({
    leads: row.leads,
    won: row.won,
    lost: row.lost,
    open: row.open,
    cost: row.cost,
    cplReal: row.cplReal,
    closeRate: row.closeRate,
    targetCpl,
  });

  return { ...row, ...result };
}

export { DECISION_BG, DECISION_COLORS };
