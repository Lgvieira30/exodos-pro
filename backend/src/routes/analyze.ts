import { Router, Response } from 'express';
import { sql } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const analyzeRouter = Router();
analyzeRouter.use(requireAuth);

function getDateRange(req: any, defaultDays = 7) {
  const to = (req.query.to as string) || new Date().toISOString().split('T')[0];
  const from = (req.query.from as string) || (() => {
    const d = new Date(to);
    d.setDate(d.getDate() - defaultDays + 1);
    return d.toISOString().split('T')[0];
  })();
  return { from, to };
}

function diagnose(cpa: number, ctr: number, roas: number, cpc: number, spend: number, leads: number) {
  const issues: string[] = [];
  const actions: { priority: 'alta' | 'media' | 'baixa'; acao: string; motivo: string }[] = [];
  let score = 100;

  if (roas > 0) {
    if (roas < 1) {
      score -= 50; issues.push(`ROAS critico: ${roas.toFixed(1)}x (prejuizo)`);
      actions.push({ priority: 'alta', acao: 'Pause a campanha imediatamente', motivo: 'Cada R$1 investido retorna menos de R$1' });
    } else if (roas < 2) {
      score -= 30; issues.push(`ROAS baixo: ${roas.toFixed(1)}x`);
      actions.push({ priority: 'alta', acao: 'Revise o funil de conversao e a oferta', motivo: 'Retorno insuficiente para cobrir custos' });
    } else if (roas < 3) {
      score -= 10; issues.push(`ROAS pode melhorar: ${roas.toFixed(1)}x`);
      actions.push({ priority: 'media', acao: 'Otimize audiencia e escale com cautela', motivo: 'ROAS abaixo do ideal de 3x' });
    } else {
      actions.push({ priority: 'baixa', acao: `ROAS excelente (${roas.toFixed(1)}x) — escale o orcamento 20-30%`, motivo: 'Campanha gerando bom retorno' });
    }
  }

  if (cpa > 0) {
    if (cpa > 100) {
      score -= 40; issues.push(`CPA critico: R$${cpa.toFixed(0)} por lead`);
      actions.push({ priority: 'alta', acao: 'Pause os conjuntos mais caros', motivo: `CPA R$${cpa.toFixed(0)} muito acima do aceitavel` });
    } else if (cpa > 60) {
      score -= 20; issues.push(`CPA alto: R$${cpa.toFixed(0)} por lead`);
      actions.push({ priority: 'alta', acao: 'Revise landing page e formulario de captura', motivo: 'CPA elevado indica problema na conversao' });
    } else if (cpa > 40) {
      score -= 8;
      actions.push({ priority: 'media', acao: 'Teste novos criativos e publicos', motivo: 'CPA pode ser reduzido com otimizacao' });
    } else {
      actions.push({ priority: 'baixa', acao: `CPA otimo (R$${cpa.toFixed(0)}) — mantenha e monitore`, motivo: 'Custo por lead dentro do esperado' });
    }
  }

  if (ctr > 0) {
    if (ctr < 0.5) {
      score -= 30; issues.push(`CTR critico: ${ctr.toFixed(2)}%`);
      actions.push({ priority: 'alta', acao: 'Troque todos os criativos urgentemente', motivo: 'Menos de 0.5% clicam — criativo nao engaja' });
    } else if (ctr < 1) {
      score -= 15; issues.push(`CTR baixo: ${ctr.toFixed(2)}%`);
      actions.push({ priority: 'alta', acao: 'Teste pelo menos 3 novos criativos esta semana', motivo: 'CTR abaixo de 1% indica criativo fraco' });
    } else if (ctr < 1.5) {
      score -= 5;
      actions.push({ priority: 'media', acao: 'Teste variacao do criativo atual', motivo: 'CTR pode melhorar com ajustes de copy' });
    } else {
      actions.push({ priority: 'baixa', acao: `CTR saudavel (${ctr.toFixed(2)}%) — documente o criativo vencedor`, motivo: 'Criativo funcionando bem' });
    }
  }

  if (cpc > 0) {
    if (cpc > 8) {
      score -= 15; issues.push(`CPC elevado: R$${cpc.toFixed(2)}`);
      actions.push({ priority: 'media', acao: 'Melhore relevancia do anuncio', motivo: 'CPC alto consome orcamento sem retorno proporcional' });
    } else if (cpc > 4) {
      score -= 5;
      actions.push({ priority: 'baixa', acao: 'Monitore o CPC — pode indicar aumento de concorrencia', motivo: `CPC R$${cpc.toFixed(2)} na zona de atencao` });
    }
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const status = finalScore >= 75 ? 'saudavel' : finalScore >= 50 ? 'atencao' : 'critico';
  return { score: finalScore, status, issues, actions };
}

function adSetAction(score: number, adSet: any): { label: string; color: string; bg: string; detail: string } {
  if (score >= 75) return {
    label: 'Escalar',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
    detail: `ROAS ${Number(adSet.roas).toFixed(1)}x — aumente o orçamento em 20%.`,
  };
  if (score >= 55) return {
    label: 'Monitorar',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.1)',
    detail: 'Aguarde mais 3 dias antes de escalar.',
  };
  if (score >= 35) return {
    label: 'Revisar',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    detail: `CTR ${Number(adSet.ctr).toFixed(1)}% abaixo do ideal — teste novo criativo.`,
  };
  return {
    label: 'Pausar',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.1)',
    detail: `CPA R$${Number(adSet.cpa).toFixed(0)} crítico — pause e revise toda a estrutura.`,
  };
}

// GET /api/analyze/dashboard?from=&to=
analyzeRouter.get('/dashboard', async (req: AuthRequest, res: Response) => {
  const { from, to } = getDateRange(req, 7);

  const [summary] = await sql`
    SELECT
      COALESCE(SUM(m.spend), 0)  AS total_spend,
      COALESCE(SUM(m.leads), 0)  AS total_leads,
      COALESCE(SUM(m.clicks), 0) AS total_clicks,
      COALESCE(SUM(m.impressions), 0) AS total_impressions,
      CASE WHEN SUM(m.leads) > 0 THEN SUM(m.spend) / SUM(m.leads) ELSE 0 END AS avg_cpa,
      CASE WHEN SUM(m.impressions) > 0 THEN (SUM(m.clicks)::float / SUM(m.impressions)) * 100 ELSE 0 END AS avg_ctr,
      CASE WHEN SUM(CASE WHEN m.roas > 0 THEN m.spend ELSE 0 END) > 0
        THEN SUM(m.spend * m.roas) / SUM(CASE WHEN m.roas > 0 THEN m.spend ELSE 0 END) ELSE 0 END AS avg_roas,
      CASE WHEN SUM(m.clicks) > 0 THEN SUM(m.spend) / SUM(m.clicks) ELSE 0 END AS avg_cpc
    FROM metrics m
    JOIN campaigns c ON c.id = m.campaign_id
    WHERE c.user_id = ${req.userId!} AND c.status IN ('active', 'paused')
      AND m.date >= ${from} AND m.date <= ${to}
  `;

  const result = diagnose(
    Number(summary.avg_cpa), Number(summary.avg_ctr),
    Number(summary.avg_roas), Number(summary.avg_cpc),
    Number(summary.total_spend), Number(summary.total_leads)
  );
  res.json({ success: true, data: result });
});

// GET /api/analyze/paused
analyzeRouter.get('/paused', async (req: AuthRequest, res: Response) => {
  const rows = await sql`
    SELECT c.id, c.name, c.platform, c.updated_at AS paused_at,
      COALESCE(SUM(m.spend), 0) AS total_spend,
      COALESCE(SUM(m.leads), 0) AS total_leads,
      COALESCE(SUM(m.clicks), 0) AS total_clicks,
      COALESCE(SUM(m.impressions), 0) AS total_impressions,
      CASE WHEN SUM(m.leads) > 0 THEN SUM(m.spend) / SUM(m.leads) ELSE 0 END AS avg_cpa,
      CASE WHEN SUM(m.impressions) > 0 THEN (SUM(m.clicks)::float / SUM(m.impressions)) * 100 ELSE 0 END AS avg_ctr,
      CASE WHEN SUM(CASE WHEN m.roas > 0 THEN m.spend ELSE 0 END) > 0
        THEN SUM(m.spend * m.roas) / SUM(CASE WHEN m.roas > 0 THEN m.spend ELSE 0 END) ELSE 0 END AS avg_roas,
      CASE WHEN SUM(m.clicks) > 0 THEN SUM(m.spend) / SUM(m.clicks) ELSE 0 END AS avg_cpc
    FROM campaigns c
    LEFT JOIN metrics m ON m.campaign_id = c.id
    WHERE c.user_id = ${req.userId!} AND c.status = 'paused'
    GROUP BY c.id
    ORDER BY c.updated_at DESC
  `;

  const paused = rows.map((c: Record<string, unknown>) => {
    const avg_cpa = Number(c.avg_cpa);
    const avg_ctr = Number(c.avg_ctr);
    const avg_roas = Number(c.avg_roas);
    const avg_cpc = Number(c.avg_cpc);
    const total_spend = Number(c.total_spend);
    const total_leads = Number(c.total_leads);

    const analysis = diagnose(avg_cpa, avg_ctr, avg_roas, avg_cpc, total_spend, total_leads);

    let verdict: 'reativar' | 'reativar_com_cautela' | 'manter_pausada';
    let verdict_reason: string;

    if (total_spend === 0) {
      verdict = 'reativar_com_cautela';
      verdict_reason = 'Sem métricas suficientes. Teste com orçamento reduzido por 3 dias.';
    } else if (analysis.score >= 65) {
      verdict = 'reativar';
      verdict_reason = 'Métricas históricas saudáveis. Reative e monitore nos primeiros 3 dias.';
    } else if (analysis.score >= 40) {
      verdict = 'reativar_com_cautela';
      verdict_reason = `Corrija antes de reativar: ${analysis.issues[0] || 'otimize os criativos'}. Reative com orçamento 30% menor.`;
    } else {
      verdict = 'manter_pausada';
      verdict_reason = `${analysis.issues[0] || 'Múltiplos problemas críticos detectados'}. Reformule a estratégia antes de reativar.`;
    }

    return { id: c.id, name: c.name, platform: c.platform, paused_at: c.paused_at, avg_cpa, avg_roas, avg_ctr, total_spend, total_leads, ...analysis, verdict, verdict_reason };
  });

  res.json({ success: true, data: { paused } });
});

// GET /api/analyze/summary?from=&to=  — resumo executivo com comparativo de período
analyzeRouter.get('/summary', async (req: AuthRequest, res: Response) => {
  const { from, to } = getDateRange(req, 30);

  const fromDate = new Date(from);
  const toDate = new Date(to);
  const periodDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;
  const prevToDate = new Date(fromDate);
  prevToDate.setDate(prevToDate.getDate() - 1);
  const prevFromDate = new Date(prevToDate);
  prevFromDate.setDate(prevFromDate.getDate() - periodDays + 1);
  const prevFrom = prevFromDate.toISOString().split('T')[0];
  const prevTo = prevToDate.toISOString().split('T')[0];

  const [cur] = await sql`
    SELECT
      COALESCE(SUM(m.spend), 0)       AS total_spend,
      COALESCE(SUM(m.leads), 0)       AS total_leads,
      COALESCE(SUM(m.clicks), 0)      AS total_clicks,
      COALESCE(SUM(m.impressions), 0) AS total_impressions,
      CASE WHEN SUM(m.leads) > 0 THEN SUM(m.spend) / SUM(m.leads) ELSE 0 END AS avg_cpa,
      CASE WHEN SUM(CASE WHEN m.roas > 0 THEN m.spend ELSE 0 END) > 0
        THEN SUM(m.spend * m.roas) / SUM(CASE WHEN m.roas > 0 THEN m.spend ELSE 0 END) ELSE 0 END AS avg_roas,
      CASE WHEN SUM(m.impressions) > 0 THEN (SUM(m.clicks)::float / SUM(m.impressions)) * 100 ELSE 0 END AS avg_ctr,
      CASE WHEN SUM(m.clicks) > 0 THEN SUM(m.spend) / SUM(m.clicks) ELSE 0 END AS avg_cpc,
      COUNT(DISTINCT m.campaign_id)   AS active_campaigns
    FROM metrics m
    JOIN campaigns c ON c.id = m.campaign_id
    WHERE c.user_id = ${req.userId!}
      AND m.date >= ${from} AND m.date <= ${to}
  `;

  const [prev] = await sql`
    SELECT
      COALESCE(SUM(m.spend), 0) AS total_spend,
      COALESCE(SUM(m.leads), 0) AS total_leads,
      CASE WHEN SUM(m.leads) > 0 THEN SUM(m.spend) / SUM(m.leads) ELSE 0 END AS avg_cpa,
      CASE WHEN SUM(CASE WHEN m.roas > 0 THEN m.spend ELSE 0 END) > 0
        THEN SUM(m.spend * m.roas) / SUM(CASE WHEN m.roas > 0 THEN m.spend ELSE 0 END) ELSE 0 END AS avg_roas
    FROM metrics m
    JOIN campaigns c ON c.id = m.campaign_id
    WHERE c.user_id = ${req.userId!}
      AND m.date >= ${prevFrom} AND m.date <= ${prevTo}
  `;

  const campaignRows = await sql`
    SELECT
      c.id, c.name, c.platform, c.status,
      COALESCE(SUM(m.spend), 0)       AS total_spend,
      COALESCE(SUM(m.leads), 0)       AS total_leads,
      COALESCE(SUM(m.clicks), 0)      AS total_clicks,
      COALESCE(SUM(m.impressions), 0) AS total_impressions,
      CASE WHEN SUM(m.leads) > 0 THEN SUM(m.spend) / SUM(m.leads) ELSE 0 END AS avg_cpa,
      CASE WHEN SUM(CASE WHEN m.roas > 0 THEN m.spend ELSE 0 END) > 0
        THEN SUM(m.spend * m.roas) / SUM(CASE WHEN m.roas > 0 THEN m.spend ELSE 0 END) ELSE 0 END AS avg_roas,
      CASE WHEN SUM(m.impressions) > 0 THEN (SUM(m.clicks)::float / SUM(m.impressions)) * 100 ELSE 0 END AS avg_ctr,
      CASE WHEN SUM(m.clicks) > 0 THEN SUM(m.spend) / SUM(m.clicks) ELSE 0 END AS avg_cpc
    FROM campaigns c
    LEFT JOIN metrics m ON m.campaign_id = c.id
      AND m.date >= ${from} AND m.date <= ${to}
    WHERE c.user_id = ${req.userId!}
    GROUP BY c.id
    HAVING COALESCE(SUM(m.spend), 0) > 0
    ORDER BY COALESCE(SUM(m.spend), 0) DESC
  `;

  const campaignResults = campaignRows.map((c: any) => {
    const { score, actions } = diagnose(
      Number(c.avg_cpa), Number(c.avg_ctr), Number(c.avg_roas),
      Number(c.avg_cpc), Number(c.total_spend), Number(c.total_leads)
    );
    return {
      id: c.id, name: c.name, platform: c.platform, status: c.status, score,
      total_spend: Number(c.total_spend), total_leads: Number(c.total_leads),
      avg_cpa: Number(c.avg_cpa), avg_roas: Number(c.avg_roas),
      avg_ctr: Number(c.avg_ctr), avg_cpc: Number(c.avg_cpc),
      top_action: actions[0] || null,
    };
  });

  const topActions: any[] = [];
  const prioMap: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
  for (const c of campaignResults) {
    if (c.top_action) topActions.push({ ...c.top_action, campaign_name: c.name, campaign_id: c.id, score: c.score });
  }
  topActions.sort((a, b) => (prioMap[a.priority] ?? 1) - (prioMap[b.priority] ?? 1));

  const today = new Date();
  const daysRemaining = Math.max(0, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate());
  const dailySpend = Number(cur.total_spend) / Math.max(1, periodDays);
  const dailyLeads = Number(cur.total_leads) / Math.max(1, periodDays);
  const overallScore = campaignResults.length > 0
    ? Math.round(campaignResults.reduce((s: number, c: any) => s + c.score, 0) / campaignResults.length) : 0;

  function pct(a: number, b: number): number | null { return b > 0 ? Math.round(((a - b) / b) * 100) : null; }

  res.json({
    success: true,
    data: {
      period: { from, to, days: periodDays, prev_from: prevFrom, prev_to: prevTo },
      overview: {
        health_score: overallScore,
        total_spend: Number(cur.total_spend),
        total_leads: Number(cur.total_leads),
        total_clicks: Number(cur.total_clicks),
        total_impressions: Number(cur.total_impressions),
        avg_cpa: Number(cur.avg_cpa),
        avg_roas: Number(cur.avg_roas),
        avg_ctr: Number(cur.avg_ctr),
        avg_cpc: Number(cur.avg_cpc),
        active_campaigns: Number(cur.active_campaigns),
      },
      comparison: {
        spend_change: pct(Number(cur.total_spend), Number(prev.total_spend)),
        leads_change: pct(Number(cur.total_leads), Number(prev.total_leads)),
        cpa_change: pct(Number(cur.avg_cpa), Number(prev.avg_cpa)),
        roas_change: pct(Number(cur.avg_roas), Number(prev.avg_roas)),
      },
      campaigns: campaignResults,
      top_actions: topActions.slice(0, 5),
      projection: {
        days_remaining: daysRemaining,
        projected_spend: Math.round(Number(cur.total_spend) + dailySpend * daysRemaining),
        projected_leads: Math.round(Number(cur.total_leads) + dailyLeads * daysRemaining),
        projected_cpa: dailyLeads > 0 ? Math.round(dailySpend / dailyLeads) : 0,
      },
    },
  });
});

// GET /api/analyze/deep/:campaignId?from=&to=  — análise cirúrgica por campanha
analyzeRouter.get('/deep/:campaignId', async (req: AuthRequest, res: Response) => {
  const { from, to } = getDateRange(req, 7);

  const [campaign] = await sql`
    SELECT id, name, platform FROM campaigns
    WHERE id = ${req.params.campaignId} AND user_id = ${req.userId!}
  `;
  if (!campaign) {
    res.status(404).json({ success: false, error: { message: 'Campanha não encontrada' } });
    return;
  }

  // Aggregated summary for the period
  const [summary] = await sql`
    SELECT
      COALESCE(SUM(spend), 0)                              AS total_spend,
      COALESCE(SUM(leads), 0)                              AS total_leads,
      COALESCE(SUM(clicks), 0)                             AS total_clicks,
      COALESCE(SUM(impressions), 0)                        AS total_impressions,
      COALESCE(SUM(conversions), 0)                        AS total_conversions,
      COALESCE(AVG(cpa)  FILTER (WHERE cpa  > 0), 0)      AS avg_cpa,
      COALESCE(AVG(roas) FILTER (WHERE roas > 0), 0)      AS avg_roas,
      COALESCE(AVG(ctr)  FILTER (WHERE ctr  > 0), 0)      AS avg_ctr,
      COALESCE(AVG(cpc)  FILTER (WHERE cpc  > 0), 0)      AS avg_cpc
    FROM metrics
    WHERE campaign_id = ${req.params.campaignId}
      AND date >= ${from} AND date <= ${to}
  `;

  // Daily breakdown for chart
  const daily = await sql`
    SELECT
      date::text,
      TO_CHAR(date, 'DD/MM') AS label,
      spend, leads, clicks, impressions, cpa, ctr, cpc, roas
    FROM metrics
    WHERE campaign_id = ${req.params.campaignId}
      AND date >= ${from} AND date <= ${to}
    ORDER BY date
  `;

  // Ad sets with diagnostic
  const adSets = await sql`
    SELECT * FROM ad_sets
    WHERE campaign_id = ${req.params.campaignId} AND user_id = ${req.userId!}
    ORDER BY spend DESC
  `;

  const adSetsWithRec = adSets.map((as: any) => {
    const { score } = diagnose(Number(as.cpa), Number(as.ctr), Number(as.roas), Number(as.cpc), Number(as.spend), Number(as.leads));
    const action = adSetAction(score, as);
    return { ...as, score, action };
  });

  // Funnel
  const impressions = Number(summary.total_impressions);
  const clicks = Number(summary.total_clicks);
  const leads = Number(summary.total_leads);
  const conversions = Number(summary.total_conversions);
  const ctrActual = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const clickToLeadRate = clicks > 0 ? (leads / clicks) * 100 : 0;
  const revenueEst = Number(summary.avg_roas) > 0 ? Number(summary.total_spend) * Number(summary.avg_roas) : 0;

  // Monthly projection
  const days = Math.max(1, daily.length || 1);
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(0, daysInMonth - today.getDate());
  const dailySpend = Number(summary.total_spend) / days;
  const dailyLeads = Number(summary.total_leads) / days;

  const analysis = diagnose(
    Number(summary.avg_cpa), Number(summary.avg_ctr),
    Number(summary.avg_roas), Number(summary.avg_cpc),
    Number(summary.total_spend), Number(summary.total_leads)
  );

  res.json({
    success: true,
    data: {
      campaign: { id: campaign.id, name: campaign.name, platform: campaign.platform },
      period: { from, to, days },
      summary: {
        spend: Number(summary.total_spend),
        leads,
        clicks,
        impressions,
        conversions,
        cpa: Number(summary.avg_cpa),
        roas: Number(summary.avg_roas),
        ctr: Number(summary.avg_ctr),
        cpc: Number(summary.avg_cpc),
      },
      funnel: { impressions, ctr: ctrActual, clicks, clickToLeadRate, leads, conversions, revenueEst },
      daily,
      adSets: adSetsWithRec,
      analysis,
      projection: {
        daysRemaining,
        projectedTotalSpend: Number(summary.total_spend) + dailySpend * daysRemaining,
        projectedTotalLeads: Number(summary.total_leads) + Math.round(dailyLeads * daysRemaining),
        projectedCpa: Number(summary.avg_cpa),
      },
    },
  });
});

// GET /api/analyze/:campaignId?from=&to=
analyzeRouter.get('/:campaignId', async (req: AuthRequest, res: Response) => {
  const [campaign] = await sql`
    SELECT id, name FROM campaigns WHERE id = ${req.params.campaignId} AND user_id = ${req.userId!}
  `;
  if (!campaign) {
    res.status(404).json({ success: false, error: { message: 'Campanha não encontrada' } });
    return;
  }

  const { from, to } = getDateRange(req, 7);

  const [m] = await sql`
    SELECT
      COALESCE(AVG(cpa)  FILTER (WHERE cpa  > 0), 0) AS avg_cpa,
      COALESCE(AVG(ctr)  FILTER (WHERE ctr  > 0), 0) AS avg_ctr,
      COALESCE(AVG(roas) FILTER (WHERE roas > 0), 0) AS avg_roas,
      COALESCE(AVG(cpc)  FILTER (WHERE cpc  > 0), 0) AS avg_cpc,
      COALESCE(SUM(spend), 0) AS total_spend,
      COALESCE(SUM(leads), 0) AS total_leads
    FROM metrics WHERE campaign_id = ${req.params.campaignId}
      AND date >= ${from} AND date <= ${to}
  `;

  const result = diagnose(
    Number(m.avg_cpa), Number(m.avg_ctr),
    Number(m.avg_roas), Number(m.avg_cpc),
    Number(m.total_spend), Number(m.total_leads)
  );
  res.json({ success: true, data: { campaign: campaign.name, ...result } });
});
