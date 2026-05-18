import { Router, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { sql } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const aiRouter = Router();
aiRouter.use(requireAuth);

function getDateRange(req: any, defaultDays = 7) {
  const to = (req.query.to as string) || new Date().toISOString().split('T')[0];
  const from = (req.query.from as string) || (() => {
    const d = new Date(to);
    d.setDate(d.getDate() - defaultDays + 1);
    return d.toISOString().split('T')[0];
  })();
  return { from, to };
}

// POST /api/ai/professor  — análise IA completa com Claude
aiRouter.post('/professor', async (req: AuthRequest, res: Response) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      success: false,
      error: { message: 'ANTHROPIC_API_KEY não configurada. Adicione a variável de ambiente no Easypanel.' },
    });
    return;
  }

  const { from, to } = getDateRange(req, 30);

  // Fetch all data needed for the analysis
  const [overviewRow] = await sql`
    SELECT
      COALESCE(SUM(m.spend), 0)        AS total_spend,
      COALESCE(SUM(m.leads), 0)        AS total_leads,
      COALESCE(SUM(m.clicks), 0)       AS total_clicks,
      COALESCE(SUM(m.impressions), 0)  AS total_impressions,
      CASE WHEN SUM(m.leads) > 0 THEN SUM(m.spend)/SUM(m.leads) ELSE 0 END AS avg_cpa,
      CASE WHEN SUM(m.impressions) > 0 THEN (SUM(m.clicks)::float/SUM(m.impressions))*100 ELSE 0 END AS avg_ctr,
      CASE WHEN SUM(m.clicks) > 0 THEN SUM(m.spend)/SUM(m.clicks) ELSE 0 END AS avg_cpc
    FROM metrics m
    JOIN campaigns c ON c.id = m.campaign_id
    WHERE c.user_id = ${req.userId!} AND m.date >= ${from} AND m.date <= ${to}
  `;

  const campaigns = await sql`
    SELECT c.name, c.status,
      COALESCE(SUM(m.spend), 0)        AS spend,
      COALESCE(SUM(m.leads), 0)        AS leads,
      COALESCE(SUM(m.clicks), 0)       AS clicks,
      COALESCE(SUM(m.impressions), 0)  AS impressions,
      CASE WHEN SUM(m.leads) > 0 THEN SUM(m.spend)/SUM(m.leads) ELSE 0 END AS cpa,
      CASE WHEN SUM(m.impressions) > 0 THEN (SUM(m.clicks)::float/SUM(m.impressions))*100 ELSE 0 END AS ctr,
      CASE WHEN SUM(m.clicks) > 0 THEN SUM(m.spend)/SUM(m.clicks) ELSE 0 END AS cpc
    FROM campaigns c
    LEFT JOIN metrics m ON m.campaign_id = c.id AND m.date >= ${from} AND m.date <= ${to}
    WHERE c.user_id = ${req.userId!}
    GROUP BY c.id
    HAVING COALESCE(SUM(m.spend), 0) > 0
    ORDER BY SUM(m.spend) DESC
  `;

  const adSets = await sql`
    SELECT a.name, a.status, a.spend, a.leads, a.clicks, a.impressions,
           a.ctr, a.cpc, a.cpa, a.daily_budget,
           c.name AS campaign_name
    FROM ad_sets a
    JOIN campaigns c ON c.id = a.campaign_id
    WHERE c.user_id = ${req.userId!} AND a.spend > 0
    ORDER BY a.spend DESC
    LIMIT 20
  `;

  const dailyTrend = await sql`
    SELECT m.date::text, SUM(m.spend) AS spend, SUM(m.leads) AS leads,
           CASE WHEN SUM(m.impressions) > 0 THEN (SUM(m.clicks)::float/SUM(m.impressions))*100 ELSE 0 END AS ctr
    FROM metrics m
    JOIN campaigns c ON c.id = m.campaign_id
    WHERE c.user_id = ${req.userId!} AND m.date >= ${from} AND m.date <= ${to}
    GROUP BY m.date ORDER BY m.date
  `;

  if (Number(overviewRow.total_spend) === 0) {
    res.status(400).json({ success: false, error: { message: 'Sem dados no período selecionado. Sincronize o Meta Ads primeiro.' } });
    return;
  }

  const dataPayload = {
    periodo: `${from} até ${to}`,
    visao_geral: {
      gasto_total: `R$${Number(overviewRow.total_spend).toFixed(2)}`,
      leads_gerados: Number(overviewRow.total_leads),
      cliques: Number(overviewRow.total_clicks),
      impressoes: Number(overviewRow.total_impressions),
      cpa_medio: `R$${Number(overviewRow.avg_cpa).toFixed(2)}`,
      ctr_medio: `${Number(overviewRow.avg_ctr).toFixed(2)}%`,
      cpc_medio: `R$${Number(overviewRow.avg_cpc).toFixed(2)}`,
    },
    campanhas: campaigns.map((c: any) => ({
      nome: c.name,
      status: c.status,
      gasto: `R$${Number(c.spend).toFixed(2)}`,
      leads: Number(c.leads),
      cpa: `R$${Number(c.cpa).toFixed(2)}`,
      ctr: `${Number(c.ctr).toFixed(2)}%`,
      cpc: `R$${Number(c.cpc).toFixed(2)}`,
      cliques: Number(c.clicks),
      impressoes: Number(c.impressions),
    })),
    conjuntos_anuncios: adSets.map((a: any) => ({
      nome: a.name,
      campanha: a.campaign_name,
      status: a.status,
      orcamento_diario: `R$${Number(a.daily_budget).toFixed(0)}`,
      gasto: `R$${Number(a.spend).toFixed(2)}`,
      leads: Number(a.leads),
      cpa: `R$${Number(a.cpa).toFixed(2)}`,
      ctr: `${Number(a.ctr).toFixed(2)}%`,
      cpc: `R$${Number(a.cpc).toFixed(2)}`,
    })),
    tendencia_diaria: dailyTrend.map((d: any) => ({
      data: String(d.date).split('T')[0],
      gasto: `R$${Number(d.spend).toFixed(2)}`,
      leads: Number(d.leads),
      ctr: `${Number(d.ctr).toFixed(2)}%`,
    })),
  };

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    system: `Você é um especialista sênior em tráfego pago no Meta Ads com 12 anos de experiência no mercado brasileiro. Você analisa dados de campanhas e dá diagnósticos diretos, sem enrolação.

Você vai receber dados reais de campanhas Meta Ads e deve entregar uma análise estruturada em JSON com o seguinte formato EXATO (não inclua nada fora do JSON):

{
  "diagnostico_geral": "string — 2-3 frases diretas sobre o estado geral das campanhas",
  "nota_geral": number (0-100),
  "o_que_esta_funcionando": ["item1", "item2", "item3"],
  "o_que_nao_esta_funcionando": ["item1", "item2", "item3"],
  "acoes_prioritarias": [
    {
      "prioridade": "URGENTE|ALTA|MEDIA",
      "titulo": "string curto",
      "descricao": "string detalhada com passos concretos",
      "impacto_esperado": "string — o que muda se fizer isso",
      "campanha_ou_conjunto": "nome da campanha/conjunto ou 'Geral'"
    }
  ],
  "analise_por_campanha": [
    {
      "nome": "nome da campanha",
      "diagnostico": "string — diagnóstico direto",
      "recomendacao": "ESCALAR|OTIMIZAR|PAUSAR|MONITORAR",
      "motivo": "string — por que essa recomendação",
      "proximos_passos": ["passo1", "passo2"]
    }
  ],
  "analise_conjuntos": [
    {
      "nome": "nome do conjunto",
      "campanha": "nome da campanha",
      "situacao": "string",
      "acao": "ESCALAR|OTIMIZAR|PAUSAR",
      "motivo_rapido": "string — 1 frase direta"
    }
  ],
  "alerta_critico": "string ou null — se há algo urgente que precisa de ação imediata",
  "insight_oculto": "string — algo que os números revelam que não é óbvio à primeira vista",
  "meta_proximo_periodo": "string — o que focar nos próximos 7 dias para melhorar os resultados"
}

Seja direto, use linguagem brasileira de mercado, mencione os valores reais dos dados, compare com benchmarks do mercado (CTR bom: acima de 1.5%, CPA de lead aceitável: R$30-80 dependendo do nicho, CPC bom: R$2-5).`,

    messages: [
      {
        role: 'user',
        content: `Analise esses dados das minhas campanhas Meta Ads e me dê o diagnóstico completo:\n\n${JSON.stringify(dataPayload, null, 2)}`,
      },
    ],
  });

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '';

  let analysis: any;
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { diagnostico_geral: rawText };
  } catch {
    analysis = { diagnostico_geral: rawText };
  }

  res.json({
    success: true,
    data: {
      analysis,
      period: { from, to },
      input_summary: {
        campaigns: campaigns.length,
        ad_sets: adSets.length,
        total_spend: Number(overviewRow.total_spend),
        total_leads: Number(overviewRow.total_leads),
      },
    },
  });
});
