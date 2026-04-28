import { Router, Response } from 'express';
import { sql } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const analyzeRouter = Router();
analyzeRouter.use(requireAuth);

function diagnose(cpa: number, ctr: number, roas: number, cpc: number, spend: number, leads: number) {
  const issues: string[] = [];
  const actions: { priority: 'alta' | 'media' | 'baixa'; acao: string; motivo: string }[] = [];
  let score = 100;

  // ROAS
  if (roas > 0) {
    if (roas < 1) {
      score -= 50; issues.push(`ROAS critico: ${roas.toFixed(1)}x (campanha gerando prejuizo)`);
      actions.push({ priority: 'alta', acao: 'Pause a campanha imediatamente', motivo: 'Cada R$1 investido retorna menos de R$1 — prejuizo garantido' });
    } else if (roas < 2) {
      score -= 30; issues.push(`ROAS baixo: ${roas.toFixed(1)}x`);
      actions.push({ priority: 'alta', acao: 'Revise o funil de conversao e a oferta', motivo: 'Retorno insuficiente para cobrir custos operacionais' });
    } else if (roas < 3) {
      score -= 10; issues.push(`ROAS pode melhorar: ${roas.toFixed(1)}x`);
      actions.push({ priority: 'media', acao: 'Otimize audiencia e tente escalar com cautela', motivo: 'ROAS abaixo do ideal de 3x' });
    } else {
      actions.push({ priority: 'baixa', acao: `ROAS excelente (${roas.toFixed(1)}x) — escale o orcamento 20-30%`, motivo: 'Campanha gerando bom retorno' });
    }
  }

  // CPA
  if (cpa > 0) {
    if (cpa > 100) {
      score -= 40; issues.push(`CPA critico: R$${cpa.toFixed(0)} por lead`);
      actions.push({ priority: 'alta', acao: 'Pause os conjuntos de anuncios mais caros', motivo: `Custo por lead R$${cpa.toFixed(0)} esta muito acima do aceitavel` });
    } else if (cpa > 60) {
      score -= 20; issues.push(`CPA alto: R$${cpa.toFixed(0)} por lead`);
      actions.push({ priority: 'alta', acao: 'Revise a landing page e o formulario de captura', motivo: 'CPA elevado indica problema na conversao' });
    } else if (cpa > 40) {
      score -= 8; issues.push(`CPA acima do ideal: R$${cpa.toFixed(0)}`);
      actions.push({ priority: 'media', acao: 'Teste novos criativos e publicos', motivo: 'CPA pode ser reduzido com otimizacao' });
    } else {
      actions.push({ priority: 'baixa', acao: `CPA otimo (R$${cpa.toFixed(0)}) — mantenha e monitore`, motivo: 'Custo por lead dentro do esperado' });
    }
  }

  // CTR
  if (ctr > 0) {
    if (ctr < 0.5) {
      score -= 30; issues.push(`CTR critico: ${ctr.toFixed(2)}%`);
      actions.push({ priority: 'alta', acao: 'Troque todos os criativos urgentemente', motivo: 'Menos de 0.5% dos usuarios clicam — criativo nao engaja' });
    } else if (ctr < 1) {
      score -= 15; issues.push(`CTR baixo: ${ctr.toFixed(2)}%`);
      actions.push({ priority: 'alta', acao: 'Teste pelo menos 3 novos criativos esta semana', motivo: 'CTR abaixo de 1% indica criativo fraco' });
    } else if (ctr < 1.5) {
      score -= 5;
      actions.push({ priority: 'media', acao: 'Teste variacao do criativo atual', motivo: 'CTR pode melhorar com pequenos ajustes de copy' });
    } else {
      actions.push({ priority: 'baixa', acao: `CTR saudavel (${ctr.toFixed(2)}%) — documente o criativo vencedor`, motivo: 'Criativo funcionando bem' });
    }
  }

  // CPC
  if (cpc > 0) {
    if (cpc > 8) {
      score -= 15; issues.push(`CPC elevado: R$${cpc.toFixed(2)}`);
      actions.push({ priority: 'media', acao: 'Melhore o Quality Score — use extensoes e landing page relevante', motivo: 'CPC alto consome orcamento sem proporcional retorno' });
    } else if (cpc > 4) {
      score -= 5;
      actions.push({ priority: 'baixa', acao: 'Monitore o CPC — pode indicar aumento de concorrencia', motivo: `CPC de R$${cpc.toFixed(2)} esta na zona de atencao` });
    }
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const status = finalScore >= 75 ? 'saudavel' : finalScore >= 50 ? 'atencao' : 'critico';

  return { score: finalScore, status, issues, actions };
}

analyzeRouter.get('/dashboard', async (req: AuthRequest, res: Response) => {
  const [summary] = await sql`
    SELECT
      COALESCE(AVG(m.cpa) FILTER (WHERE m.cpa > 0), 0) AS avg_cpa,
      COALESCE(AVG(m.ctr) FILTER (WHERE m.ctr > 0), 0) AS avg_ctr,
      COALESCE(AVG(m.roas) FILTER (WHERE m.roas > 0), 0) AS avg_roas,
      COALESCE(AVG(m.cpc) FILTER (WHERE m.cpc > 0), 0) AS avg_cpc,
      COALESCE(SUM(m.spend), 0) AS total_spend,
      COALESCE(SUM(m.leads), 0) AS total_leads
    FROM metrics m
    JOIN campaigns c ON c.id = m.campaign_id
    WHERE c.user_id = ${req.userId!} AND c.status = 'active'
      AND m.date >= NOW() - INTERVAL '7 days'
  `;

  const result = diagnose(
    Number(summary.avg_cpa), Number(summary.avg_ctr),
    Number(summary.avg_roas), Number(summary.avg_cpc),
    Number(summary.total_spend), Number(summary.total_leads)
  );

  res.json({ success: true, data: result });
});

analyzeRouter.get('/:campaignId', async (req: AuthRequest, res: Response) => {
  const [campaign] = await sql`
    SELECT id, name FROM campaigns WHERE id = ${req.params.campaignId} AND user_id = ${req.userId!}
  `;
  if (!campaign) {
    res.status(404).json({ success: false, error: { message: 'Campanha nao encontrada' } });
    return;
  }

  const [m] = await sql`
    SELECT
      COALESCE(AVG(cpa) FILTER (WHERE cpa > 0), 0) AS avg_cpa,
      COALESCE(AVG(ctr) FILTER (WHERE ctr > 0), 0) AS avg_ctr,
      COALESCE(AVG(roas) FILTER (WHERE roas > 0), 0) AS avg_roas,
      COALESCE(AVG(cpc) FILTER (WHERE cpc > 0), 0) AS avg_cpc,
      COALESCE(SUM(spend), 0) AS total_spend,
      COALESCE(SUM(leads), 0) AS total_leads
    FROM metrics WHERE campaign_id = ${req.params.campaignId}
      AND date >= NOW() - INTERVAL '7 days'
  `;

  const result = diagnose(
    Number(m.avg_cpa), Number(m.avg_ctr),
    Number(m.avg_roas), Number(m.avg_cpc),
    Number(m.total_spend), Number(m.total_leads)
  );

  res.json({ success: true, data: { campaign: campaign.name, ...result } });
});
