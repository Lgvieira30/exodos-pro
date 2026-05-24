import { Router, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const campaignGeneratorRouter = Router();
campaignGeneratorRouter.use(requireAuth);

const SYSTEM_PROMPT = `Você é um especialista sênior em Google Ads com foco em campanhas B2B de alta performance.
Sua tarefa é gerar campanhas completas e prontas para subir no Google Ads Editor.

REGRAS OBRIGATÓRIAS:
- Títulos RSA: máximo 30 caracteres cada (Google limita isso, é rígido)
- Descrições RSA: máximo 90 caracteres cada
- Gere exatamente 15 títulos e 4 descrições por grupo de anúncio
- Palavras-chave com tipo de correspondência: "exact", "phrase" ou "broad"
- Gere negativos relevantes para evitar cliques irrelevantes
- Tom: gestor falando com gestor — direto, sem jargão de agência
- Sem emoji nos anúncios
- Use números reais e específicos quando disponíveis (R$ valor, % real, anos de mercado)
- Cada grupo de anúncio deve ter tema único e keywords alinhadas

TEMPLATE MÔNACO (use quando segmento for "monaco-frota"):
ICP: gestores de frota B2B, 100+ veículos, transportadoras, locadoras, distribuidoras
Ângulos P1 (saturação zero): passivo oculto, CNH corresponsabilidade
Ângulos P2: R$ 925k economizados em 3 meses, R$ 4,6M em débitos encontrados, 45 dias antes do Detran
Cases: Cimed (-82% tempo captação), Heineken, Cargill, Philip Morris (9 anos), Copel
Dores: multa NIC (dobra valor), CADIN, SNE perdido, motorista CNH vencida, passivo oculto
CTA: "Solicite o diagnóstico gratuito"
Prova: 27 anos, 180 mil veículos, 5 unidades

RETORNE APENAS JSON VÁLIDO, sem markdown, sem texto antes ou depois, no formato exato:
{
  "campaign_name": "string",
  "objective": "string",
  "bidding_strategy": "string",
  "budget_recommendation": {
    "total_monthly": number,
    "distribution_notes": "string"
  },
  "ad_groups": [
    {
      "name": "string",
      "theme": "string",
      "keywords": [
        { "term": "string", "match_type": "exact|phrase|broad" }
      ],
      "negative_keywords": ["string"],
      "headlines": ["string x15 - max 30 chars cada"],
      "descriptions": ["string x4 - max 90 chars cada"],
      "sitelinks": [
        { "title": "string", "description1": "string", "description2": "string" }
      ]
    }
  ],
  "export_tips": "string"
}`;

campaignGeneratorRouter.post('/', async (req: AuthRequest, res: Response) => {
  const {
    empresa,
    segmento,
    produto,
    objetivo,
    diferenciais,
    provas_sociais,
    budget_mensal,
    regiao,
    cta,
    publico_alvo,
  } = req.body;

  if (!empresa || !produto || !objetivo) {
    res.status(400).json({ success: false, error: { message: 'empresa, produto e objetivo são obrigatórios' } });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ success: false, error: { message: 'ANTHROPIC_API_KEY não configurada no servidor' } });
    return;
  }

  try {
    const client = new Anthropic({ apiKey });

    const userPrompt = `Gere uma campanha Google Ads completa para:

EMPRESA: ${empresa}
SEGMENTO: ${segmento || 'geral'}
PRODUTO/SERVIÇO: ${produto}
OBJETIVO DA CAMPANHA: ${objetivo}
PÚBLICO-ALVO: ${publico_alvo || 'gestores e decisores B2B'}
DIFERENCIAIS: ${diferenciais || 'não informado'}
PROVAS SOCIAIS / CASES: ${provas_sociais || 'não informado'}
BUDGET MENSAL: ${budget_mensal ? `R$ ${budget_mensal}` : 'não informado'}
REGIÃO: ${regiao || 'Brasil'}
CTA PRINCIPAL: ${cta || 'Fale com especialista'}

${segmento === 'monaco-frota' ? 'Use o template Mônaco com todos os ângulos, hooks e provas do contexto.' : 'Crie baseado nas informações fornecidas.'}

Gere de 4 a 6 grupos de anúncio cobrindo diferentes intenções de busca.
Retorne APENAS o JSON, sem nenhum texto extra.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '';

    let campaign;
    try {
      campaign = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta da IA não contém JSON válido');
      }
      campaign = JSON.parse(jsonMatch[0]);
    }

    res.json({ success: true, data: { campaign } });
  } catch (err: any) {
    console.error('[campaign-generator] ERRO:', err.message);
    res.status(500).json({ success: false, error: { message: err.message || 'Erro ao gerar campanha' } });
  }
});
