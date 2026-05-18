import { Router, Response } from 'express';
import { sql } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const aiRouter = Router();
aiRouter.use(requireAuth);

// ─── Benchmarks Meta Ads B2B ──────────────────────────────────────────────────
const BM = {
  ctr: { bom: 2.5, medio: 1.0 },   // %
  cpc: { bom: 5,   medio: 15  },   // R$
  cpa: { bom: 60,  medio: 150 },   // R$ — CPL Meta B2B retargeting/lookalike
};

type Prioridade    = 'URGENTE' | 'ALTA' | 'MEDIA';
type Recomendacao  = 'ESCALAR' | 'OTIMIZAR' | 'PAUSAR' | 'MONITORAR';

interface AcaoPrioritaria {
  prioridade: Prioridade;
  titulo: string;
  descricao: string;
  impacto_esperado: string;
  campanha_ou_conjunto: string;
}

interface AnaliseCampanha {
  nome: string;
  diagnostico: string;
  recomendacao: Recomendacao;
  motivo: string;
  proximos_passos: string[];
}

interface AnaliseConjunto {
  nome: string;
  campanha: string;
  situacao: string;
  acao: 'ESCALAR' | 'OTIMIZAR' | 'PAUSAR';
  motivo_rapido: string;
}

interface AnalysisResult {
  diagnostico_geral: string;
  nota_geral: number;
  o_que_esta_funcionando: string[];
  o_que_nao_esta_funcionando: string[];
  acoes_prioritarias: AcaoPrioritaria[];
  analise_por_campanha: AnaliseCampanha[];
  analise_conjuntos: AnaliseConjunto[];
  alerta_critico: string | null;
  insight_oculto: string;
  meta_proximo_periodo: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseBRL(v: string | number): number {
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace('R$', '').replace(',', '.')) || 0;
}
function parsePct(v: string | number): number {
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace('%', '').replace(',', '.')) || 0;
}
function fmt(n: number): string { return `R$${n.toFixed(2)}`; }

function scoreMetric(value: number, bom: number, medio: number, higherIsBetter: boolean): number {
  if (higherIsBetter) {
    if (value >= bom)   return 100;
    if (value >= medio) return 55 + ((value - medio) / (bom - medio)) * 45;
    if (value > 0)      return (value / medio) * 55;
    return 0;
  } else {
    if (value === 0)    return 50;
    if (value <= bom)   return 100;
    if (value <= medio) return 100 - ((value - bom) / (medio - bom)) * 45;
    return Math.max(0, 55 - ((value - medio) / medio) * 55);
  }
}

function labelCtr(ctr: number): string {
  if (ctr >= BM.ctr.bom)   return 'excelente';
  if (ctr >= BM.ctr.medio) return 'aceitável';
  if (ctr > 0)              return 'baixo';
  return 'sem dados';
}
function labelCpa(cpa: number): string {
  if (cpa === 0)            return 'sem conversão';
  if (cpa <= BM.cpa.bom)   return 'ótimo';
  if (cpa <= BM.cpa.medio) return 'aceitável';
  return 'alto';
}
function labelCpc(cpc: number): string {
  if (cpc === 0)            return 'sem dados';
  if (cpc <= BM.cpc.bom)   return 'bom';
  if (cpc <= BM.cpc.medio) return 'médio';
  return 'caro';
}

// ─── Motor de análise baseado em regras ───────────────────────────────────────
function buildAnalysis(payload: any): AnalysisResult {
  const vg        = payload.visao_geral;
  const campanhas: any[] = payload.campanhas        || [];
  const conjuntos: any[] = payload.conjuntos_anuncios || [];
  const tendencia: any[] = payload.tendencia_diaria  || [];
  const periodo: string  = payload.periodo           || '';

  const spend   = parseBRL(vg.gasto_total);
  const leads   = Number(vg.leads_gerados);
  const cliques = Number(vg.cliques);
  const impress = Number(vg.impressoes);
  const cpa     = parseBRL(vg.cpa_medio);
  const ctr     = parsePct(vg.ctr_medio);
  const cpc     = parseBRL(vg.cpc_medio);

  const taxaConv = cliques > 0 ? (leads / cliques) * 100 : 0;
  const cpm      = impress > 0 ? (spend / impress) * 1000 : 0;

  // ── Nota geral ─────────────────────────────────────────────────────────────
  const sCtr = scoreMetric(ctr, BM.ctr.bom, BM.ctr.medio, true);
  const sCpa = scoreMetric(cpa, BM.cpa.bom, BM.cpa.medio, false);
  const sCpc = scoreMetric(cpc, BM.cpc.bom, BM.cpc.medio, false);
  const nota_geral = Math.round(sCpa * 0.5 + sCtr * 0.3 + sCpc * 0.2);

  // ── Diagnóstico geral ─────────────────────────────────────────────────────
  const notaEmoji   = nota_geral >= 80 ? '🟢' : nota_geral >= 55 ? '🟡' : '🔴';
  const notaTexto   = nota_geral >= 80 ? 'boa' : nota_geral >= 55 ? 'regular' : 'crítica';
  const ctrLabel    = labelCtr(ctr);
  const cpaLabel    = labelCpa(cpa);
  const cpcLabel    = labelCpc(cpc);

  let diagnostico_geral: string;

  if (leads === 0 && spend > 0) {
    diagnostico_geral =
      `${notaEmoji} Situação crítica: você gastou ${fmt(spend)} no período ${periodo} e não gerou nenhum lead. ` +
      `Isso significa que o dinheiro saiu mas ninguém preencheu formulário ou entrou em contato. ` +
      `O CTR está em ${vg.ctr_medio} — isso quer dizer que de cada 100 pessoas que viram o anúncio, ` +
      `${ctr.toFixed(1)} clicaram. ${ctr < BM.ctr.medio ? 'Esse número é baixo — o criativo não está chamando atenção suficiente.' : 'O número de cliques está OK.'} ` +
      `O problema pode estar na página que o cliente cai depois de clicar (landing page), no pixel que registra o lead, ` +
      `ou nos criativos. Antes de gastar mais, é preciso descobrir onde o funil está quebrado.`;
  } else if (leads > 0) {
    const diaStr = tendencia.length > 0 ? ` ao longo de ${tendencia.length} dias` : '';
    diagnostico_geral =
      `${notaEmoji} Performance ${notaTexto} no período ${periodo}. ` +
      `Você investiu ${fmt(spend)}${diaStr} e gerou ${leads} lead${leads !== 1 ? 's' : ''} ` +
      `(pessoa${leads !== 1 ? 's' : ''} que demonstrou interesse no serviço). ` +
      `O custo por lead foi de ${fmt(cpa)} — isso está ${cpaLabel} segundo os benchmarks de mercado ` +
      `(bom abaixo de ${fmt(BM.cpa.bom)}, aceitável até ${fmt(BM.cpa.medio)}). ` +
      `O CTR de ${vg.ctr_medio} (porcentagem de pessoas que clicaram no anúncio) está ${ctrLabel} ` +
      `— benchmark bom é acima de ${BM.ctr.bom}%. ` +
      `${taxaConv > 0 ? `De cada 100 cliques, ${taxaConv.toFixed(1)} viraram lead, o que representa uma taxa de conversão de ${taxaConv.toFixed(1)}% (boa acima de 5% no B2B).` : ''} ` +
      `${nota_geral >= 65 ? 'O funil está funcionando — o foco agora é otimizar e escalar o que está dando resultado.' : 'Há espaço importante para melhoria antes de aumentar o investimento.'}`;
  } else {
    diagnostico_geral =
      `${notaEmoji} Nenhum dado de gasto encontrado no período ${periodo}. ` +
      `Verifique se as campanhas estão ativas e se a sincronização foi feita corretamente na página de Diagnóstico.`;
  }

  // ── O que está funcionando ─────────────────────────────────────────────────
  const funcionando: string[] = [];

  if (ctr >= BM.ctr.bom) {
    funcionando.push(
      `CTR de ${vg.ctr_medio} — EXCELENTE. Isso significa que de cada 100 pessoas que viram o anúncio, ` +
      `${ctr.toFixed(1)} clicaram. O benchmark bom é acima de ${BM.ctr.bom}%. ` +
      `Seus criativos estão chamando atenção e gerando curiosidade.`
    );
  } else if (ctr >= BM.ctr.medio) {
    funcionando.push(
      `CTR de ${vg.ctr_medio} — dentro do aceitável (benchmark: acima de ${BM.ctr.medio}%). ` +
      `O anúncio está gerando cliques, mas ainda tem espaço para melhorar o visual e o texto de abertura.`
    );
  }

  if (cpa > 0 && cpa <= BM.cpa.bom) {
    funcionando.push(
      `Custo por lead de ${fmt(cpa)} — ÓTIMO. Você está pagando menos de ${fmt(BM.cpa.bom)} por cada ` +
      `pessoa interessada. No mercado B2B, isso é considerado excelente. ` +
      `Se 20% dos leads virarem clientes, cada novo cliente está custando aproximadamente ${fmt(cpa * 5)} em mídia.`
    );
  }

  if (cpc <= BM.cpc.bom) {
    funcionando.push(
      `Custo por clique (CPC) de ${fmt(cpc)} — dentro do ideal para Meta Ads B2B. ` +
      `Isso significa que cada visita ao seu site está custando ${fmt(cpc)}, ` +
      `o que indica que os anúncios têm boa relevância para a audiência.`
    );
  }

  if (leads >= 5) {
    funcionando.push(
      `Volume de ${leads} leads no período — funil ativo e gerando resultados. ` +
      `Com a taxa de conversão de 20% da Mônaco, isso representa potencial de ` +
      `${Math.floor(leads * 0.2)} novos clientes se todos forem bem trabalhados pelo comercial.`
    );
  } else if (leads > 0) {
    funcionando.push(
      `${leads} lead${leads > 1 ? 's' : ''} gerado${leads > 1 ? 's' : ''} no período — o funil está funcionando. ` +
      `Volume ainda pequeno para tirar conclusões definitivas, mas já há resultado.`
    );
  }

  const campAtivas = campanhas.filter((c: any) => (c.status || '').toUpperCase() === 'ACTIVE');
  if (campAtivas.length > 0) {
    funcionando.push(
      `${campAtivas.length} campanha${campAtivas.length > 1 ? 's' : ''} ativa${campAtivas.length > 1 ? 's' : ''} ` +
      `com investimento registrado — estrutura de campanhas funcionando.`
    );
  }

  // Tendência de melhora
  if (tendencia.length >= 6) {
    const metade  = Math.floor(tendencia.length / 2);
    const primeira = tendencia.slice(0, metade);
    const segunda  = tendencia.slice(metade);
    const avgCtr1  = primeira.reduce((s: number, d: any) => s + parsePct(d.ctr), 0) / primeira.length;
    const avgCtr2  = segunda.reduce((s: number, d: any) => s + parsePct(d.ctr), 0) / segunda.length;
    if (avgCtr2 > avgCtr1 * 1.15) {
      funcionando.push(
        `Tendência positiva: o CTR melhorou na segunda metade do período (de ${avgCtr1.toFixed(2)}% para ${avgCtr2.toFixed(2)}%). ` +
        `Isso indica que o algoritmo do Meta está aprendendo e entregando o anúncio para pessoas mais propensas a clicar.`
      );
    }
  }

  if (funcionando.length === 0) {
    funcionando.push('Dados sincronizados e disponíveis para análise. Rode a sincronização para obter mais dados e uma análise mais precisa.');
  }

  // ── O que não está funcionando ─────────────────────────────────────────────
  const naoFuncionando: string[] = [];

  if (ctr < BM.ctr.medio) {
    naoFuncionando.push(
      `CTR de ${vg.ctr_meio || vg.ctr_medio} — BAIXO. De cada 100 pessoas que viram o anúncio, menos de ${BM.ctr.medio} clicaram. ` +
      `O benchmark mínimo aceitável é ${BM.ctr.medio}%. Isso geralmente significa que o criativo (imagem, vídeo ou texto) ` +
      `não está chamando atenção suficiente. O problema está no "gancho" — os primeiros 3 segundos do vídeo ` +
      `ou a imagem principal não estão parando o scroll.`
    );
  } else if (ctr < BM.ctr.bom) {
    naoFuncionando.push(
      `CTR de ${vg.ctr_medio} — aceitável mas abaixo do ideal de ${BM.ctr.bom}%. ` +
      `Há espaço para melhorar o visual e o texto de abertura dos anúncios para atrair mais cliques ` +
      `sem aumentar o investimento.`
    );
  }

  if (cpa > BM.cpa.medio) {
    naoFuncionando.push(
      `Custo por lead de ${fmt(cpa)} — ALTO. Você está pagando ${fmt(cpa)} por cada pessoa interessada, ` +
      `quando o mercado B2B Meta Ads considera ${fmt(BM.cpa.medio)} o limite aceitável. ` +
      `Isso pode significar que: (1) a página de destino não está convertendo bem os cliques em leads, ` +
      `(2) a audiência está muito ampla e atraindo pessoas fora do perfil, ` +
      `ou (3) o criativo está gerando cliques de curiosidade e não de interesse real.`
    );
  } else if (cpa > BM.cpa.bom && leads > 0) {
    naoFuncionando.push(
      `Custo por lead de ${fmt(cpa)} — aceitável mas acima do ideal de ${fmt(BM.cpa.bom)}. ` +
      `Com ajustes na landing page e na qualidade da audiência, é possível reduzir esse custo ` +
      `e gerar mais leads com o mesmo investimento.`
    );
  }

  if (cpc > BM.cpc.medio) {
    naoFuncionando.push(
      `Custo por clique (CPC) de ${fmt(cpc)} — CARO. Cada visita ao seu site está custando ${fmt(cpc)}, ` +
      `acima do ideal de ${fmt(BM.cpc.bom)} a ${fmt(BM.cpc.medio)}. ` +
      `CPC alto geralmente indica que a audiência está saturada (viu o anúncio muitas vezes) ` +
      `ou que o criativo tem baixa relevância para as pessoas que estão vendo.`
    );
  }

  const campSemLead = campanhas.filter((c: any) => Number(c.leads) === 0 && parseBRL(c.gasto) > 50);
  if (campSemLead.length > 0) {
    const nomes = campSemLead.map((c: any) => `"${c.nome}"`).join(', ');
    const totalGasto = campSemLead.reduce((s: number, c: any) => s + parseBRL(c.gasto), 0);
    naoFuncionando.push(
      `${nomes} — ${fmt(totalGasto)} gastos sem nenhum lead gerado. ` +
      `Isso é dinheiro que saiu sem retorno. A campanha está rodando, os anúncios aparecem, ` +
      `mas ninguém está clicando no botão final de contato. ` +
      `Pode ser problema técnico (formulário quebrado) ou criativo completamente desalinhado.`
    );
  }

  if (leads === 0 && spend > 0) {
    naoFuncionando.push(
      `Zero leads no período com ${fmt(spend)} investidos — o funil de conversão está quebrado em algum ponto. ` +
      `É preciso testar manualmente: abrir o site no celular, clicar no anúncio e tentar preencher o formulário. ` +
      `Muitas vezes o problema é simples: formulário não envia, página não carrega no celular, ou o botão não está visível.`
    );
  }

  if (taxaConv > 0 && taxaConv < 2) {
    naoFuncionando.push(
      `Taxa de conversão de ${taxaConv.toFixed(1)}% (de clique para lead) — abaixo do esperado para B2B (acima de 5%). ` +
      `Isso significa que de cada 100 pessoas que clicaram, menos de ${Math.ceil(taxaConv * 1)} viraram lead. ` +
      `O problema está na página de destino: ela precisa ser mais convincente, carregar mais rápido ` +
      `e ter o formulário bem visível logo no início.`
    );
  }

  if (naoFuncionando.length === 0) {
    naoFuncionando.push('Nenhum problema crítico identificado. Continue monitorando diariamente e testando novos criativos.');
  }

  // ── Ações prioritárias ─────────────────────────────────────────────────────
  const acoes: AcaoPrioritaria[] = [];

  // URGENTE: zero leads com gasto
  if (leads === 0 && spend > 0) {
    acoes.push({
      prioridade: 'URGENTE',
      titulo: 'Encontrar o gargalo — zero leads com dinheiro sendo gasto',
      descricao:
        `Antes de qualquer coisa, você precisa descobrir ONDE o processo está quebrando. Faça isso agora:\n` +
        `1️⃣ Pegue o celular, abra o Instagram ou Facebook e tente ver seus próprios anúncios (ou peça para alguém de fora testar).\n` +
        `2️⃣ Clique no anúncio e veja se a página abre rápido (deve abrir em menos de 3 segundos no celular).\n` +
        `3️⃣ Tente preencher o formulário até o final — o botão "Enviar" funciona? Aparece confirmação?\n` +
        `4️⃣ No Meta Ads Manager, vá em "Gerenciador de Eventos" e verifique se o evento "Lead" está disparando.\n` +
        `5️⃣ Se tudo estiver funcionando, o problema é que o criativo ou o texto do anúncio não está convencendo as pessoas a agir — mude o botão de "Saiba Mais" para "Fale com Especialista" ou "Quero Reduzir Multas".`,
      impacto_esperado:
        `Identificar e corrigir o gargalo pode transformar ${fmt(spend)} de investimento mensal em ` +
        `leads reais sem precisar aumentar o orçamento.`,
      campanha_ou_conjunto: 'Geral — todas as campanhas',
    });
  }

  // URGENTE: campanhas com gasto e zero leads
  campSemLead.forEach((c: any) => {
    acoes.push({
      prioridade: 'URGENTE',
      titulo: `Pausar ou corrigir "${c.nome}" — gasto sem resultado`,
      descricao:
        `A campanha "${c.nome}" gastou ${c.gasto} e não gerou nenhum lead. Isso é prioridade máxima:\n` +
        `1️⃣ PAUSE a campanha agora para não continuar gastando sem retorno.\n` +
        `2️⃣ Verifique se a landing page (página de destino) está funcionando — abra o link do anúncio no celular.\n` +
        `3️⃣ Confira no Meta Events Manager se o pixel de conversão está registrando os leads corretamente.\n` +
        `4️⃣ Revise o criativo: o texto está falando diretamente para o gestor de frotas? Está claro o que ele vai ganhar clicando?\n` +
        `5️⃣ Antes de reativar, corrija pelo menos um problema identificado nos passos acima.`,
      impacto_esperado:
        `Parar o desperdício imediato de budget e, após correção, converter esse mesmo investimento em leads qualificados.`,
      campanha_ou_conjunto: c.nome,
    });
  });

  // URGENTE ou ALTA: CTR muito baixo
  if (ctr < BM.ctr.medio) {
    acoes.push({
      prioridade: campSemLead.length > 0 ? 'ALTA' : 'URGENTE',
      titulo: 'Mudar o criativo — anúncio não está chamando atenção',
      descricao:
        `O CTR de ${vg.ctr_medio} indica que os anúncios aparecem para as pessoas, mas elas não estão clicando. ` +
        `O problema está nos primeiros 3 segundos do vídeo ou na imagem principal. Para corrigir:\n` +
        `1️⃣ Troque a primeira cena do vídeo por algo que choque: ex. "Sua empresa sabe quantas multas acumulou esse mês?" com texto em tela grande.\n` +
        `2️⃣ Teste uma imagem com um número impactante: "R$ 40.000 em multas sem tratamento. Isso aconteceu com um cliente nosso."\n` +
        `3️⃣ NÃO mude a audiência, o orçamento nem o botão ainda — só mude o criativo. Uma variável por vez.\n` +
        `4️⃣ Rode cada versão por pelo menos 7 dias ou até atingir 1.000 impressões antes de julgar.\n` +
        `5️⃣ Benchmark: CTR acima de ${BM.ctr.bom}% é o que procuramos. Você está em ${vg.ctr_medio}.`,
      impacto_esperado:
        `Dobrar o CTR significa dobrar o número de visitas ao site sem aumentar o investimento — ` +
        `e consequentemente mais leads com o mesmo orçamento.`,
      campanha_ou_conjunto: 'Geral',
    });
  } else if (ctr < BM.ctr.bom) {
    acoes.push({
      prioridade: 'ALTA',
      titulo: 'Testar novos ganchos de criativo para elevar o CTR',
      descricao:
        `O CTR de ${vg.ctr_medio} está aceitável, mas ainda há espaço para melhorar. Teste estes ângulos:\n` +
        `1️⃣ Ângulo de PROBLEMA: "Você só descobre que o motorista perdeu a CNH quando a operação para."\n` +
        `2️⃣ Ângulo de NÚMERO: "180.000 veículos gerenciados. Zero passivo documental."\n` +
        `3️⃣ Ângulo de ECONOMIA: "40% de desconto em multas de frota via SNE. Sua empresa está aproveitando?"\n` +
        `4️⃣ Teste 1 versão por semana, mantenha tudo igual exceto o visual/texto inicial.\n` +
        `5️⃣ O vencedor (maior CTR) vira o padrão e você testa o próximo.`,
      impacto_esperado:
        `Elevar o CTR de ${vg.ctr_medio} para acima de ${BM.ctr.bom}% pode reduzir o custo por lead em até 40%.`,
      campanha_ou_conjunto: 'Geral',
    });
  }

  // ALTA ou URGENTE: CPA alto
  if (cpa > BM.cpa.medio && leads > 0) {
    acoes.push({
      prioridade: 'URGENTE',
      titulo: `CPL de ${fmt(cpa)} — custo por lead está caro, auditoria urgente`,
      descricao:
        `Você está pagando ${fmt(cpa)} por cada lead, acima do limite aceitável de ${fmt(BM.cpa.medio)}. ` +
        `Para descobrir onde está o problema, siga essa ordem:\n` +
        `1️⃣ ENGAJAMENTO: O CTR está bom (acima de ${BM.ctr.medio}%)? Se não → problema no criativo, comece por aí.\n` +
        `2️⃣ CHEGADA: As pessoas estão chegando no site? Se o CTR está bom mas o CPL está alto → problema na landing page.\n` +
        `3️⃣ CONVERSÃO: A página está convertendo? Abra no celular e tente preencher o formulário. ` +
        `Formulário com mais de 4 campos → cada campo extra reduz conversão em ~10%.\n` +
        `4️⃣ AUDIÊNCIA: Está excluindo os clientes atuais da segmentação? Estão rodando audiences de retargeting (quem visitou o site)?`,
      impacto_esperado:
        `Reduzir o CPL de ${fmt(cpa)} para abaixo de ${fmt(BM.cpa.bom)} pode triplicar o número de leads ` +
        `sem aumentar o orçamento.`,
      campanha_ou_conjunto: 'Geral',
    });
  } else if (cpa > BM.cpa.bom && leads > 0) {
    acoes.push({
      prioridade: 'ALTA',
      titulo: `Otimizar CPL — está aceitável (${fmt(cpa)}) mas pode ser melhorado`,
      descricao:
        `O custo de ${fmt(cpa)} por lead está dentro do aceitável, mas dá para baixar. Tente:\n` +
        `1️⃣ Revise a landing page: o texto da página está alinhado com o que o anúncio prometeu? ` +
        `Ex: se o anúncio fala em "40% de desconto em multas", a página deve reforçar exatamente isso no título.\n` +
        `2️⃣ Reduza os campos do formulário para no máximo 4: Nome, Empresa, WhatsApp e "Quantos veículos sua empresa possui?".\n` +
        `3️⃣ Adicione prova social na página: "27 anos de mercado | 180.000 veículos gerenciados".\n` +
        `4️⃣ Verifique se a exclusão de clientes atuais está ativa na segmentação.`,
      impacto_esperado:
        `Reduzir o CPL para abaixo de ${fmt(BM.cpa.bom)} pode aumentar o volume de leads em 50-100% ` +
        `com o mesmo investimento mensal.`,
      campanha_ou_conjunto: 'Geral',
    });
  }

  // MEDIA: escalar melhor campanha
  const melhoresCamp = campanhas
    .filter((c: any) => Number(c.leads) >= 3 && parseBRL(c.cpa) > 0 && parseBRL(c.cpa) <= BM.cpa.bom)
    .sort((a: any, b: any) => Number(b.leads) - Number(a.leads));

  if (melhoresCamp.length > 0 && acoes.length < 5) {
    const best = melhoresCamp[0];
    acoes.push({
      prioridade: 'MEDIA',
      titulo: `Escalar "${best.nome}" — melhor campanha do período`,
      descricao:
        `"${best.nome}" gerou ${best.leads} leads com CPL de ${best.cpa} — está performando acima do esperado. ` +
        `Para escalar sem perder a eficiência:\n` +
        `1️⃣ Aumente o orçamento em no máximo 20% (não mais do que isso de uma vez).\n` +
        `2️⃣ Espere 5-7 dias antes do próximo aumento — o algoritmo do Meta precisa desse tempo para se adaptar.\n` +
        `3️⃣ NÃO mude criativos, audiência ou configurações enquanto estiver escalando.\n` +
        `4️⃣ Se o CPL subir mais de 30% após o aumento, volte ao orçamento anterior e espere mais.\n` +
        `5️⃣ Crie uma audiência "lookalike" (parecida) com os leads dessa campanha para ampliar o alcance qualificado.`,
      impacto_esperado:
        `Aumentar o investimento gradualmente na campanha mais eficiente é a forma mais segura de ` +
        `crescer o volume de leads qualificados mantendo o CPL abaixo de ${fmt(BM.cpa.bom)}.`,
      campanha_ou_conjunto: best.nome,
    });
  }

  // MEDIA: qualificação de leads
  if (leads > 0 && acoes.length < 6) {
    acoes.push({
      prioridade: 'MEDIA',
      titulo: 'Qualificar melhor os leads — filtrar empresa com frota real',
      descricao:
        `Para garantir que os leads são empresas com frota de verdade (10+ veículos), ` +
        `e não pessoas físicas ou empresas pequenas demais:\n` +
        `1️⃣ Adicione na landing page (página de destino): "Atendemos empresas com frota a partir de 10 veículos".\n` +
        `2️⃣ Inclua no formulário uma pergunta: "Quantos veículos sua empresa possui?" com opções: ` +
        `Menos de 10 / 10 a 50 / 50 a 200 / Mais de 200.\n` +
        `3️⃣ No texto do anúncio, deixe claro que é um serviço B2B: "Gestão documental para frotas corporativas".\n` +
        `4️⃣ Isso reduz o volume total de leads mas aumenta a qualidade — e como a Mônaco já converte 20%, ` +
        `10 leads qualificados valem mais do que 30 leads ruins.`,
      impacto_esperado:
        `Leads mais qualificados = menos tempo perdido pelo comercial + maior taxa de fechamento. ` +
        `Com 20% de conversão, 10 leads qualificados/mês = 2 novos clientes/mês.`,
      campanha_ou_conjunto: 'Geral',
    });
  }

  // ── Análise por campanha ──────────────────────────────────────────────────
  const analise_por_campanha: AnaliseCampanha[] = campanhas.map((c: any) => {
    const cSpend = parseBRL(c.gasto);
    const cLeads = Number(c.leads);
    const cCpa   = parseBRL(c.cpa);
    const cCtr   = parsePct(c.ctr);
    const cCpc   = parseBRL(c.cpc);
    const cConv  = parsePct(c.ctr) > 0 && Number(c.cliques) > 0
      ? (cLeads / Number(c.cliques)) * 100 : 0;

    let recomendacao: Recomendacao;
    let diagnostico: string;
    let motivo: string;
    const proximos_passos: string[] = [];

    if (cSpend > 30 && cLeads === 0) {
      recomendacao = 'PAUSAR';
      diagnostico =
        `💸 ${c.gasto} gastos e ZERO leads. CTR de ${c.ctr} — ` +
        `${cCtr < BM.ctr.medio ? 'o anúncio não está gerando cliques suficientes' : 'cliques chegando mas ninguém converte'}.`;
      motivo =
        `Investimento sem retorno precisa ser pausado imediatamente para estancar o desperdício. ` +
        `${cCtr < BM.ctr.medio
          ? 'O baixo CTR indica que o criativo não chama atenção — o problema está no anúncio em si.'
          : 'O CTR está OK, mas nenhum clique virou lead — o problema está na página de destino ou no formulário.'}`;
      proximos_passos.push('PAUSAR a campanha agora para não continuar gastando sem retorno');
      proximos_passos.push('Testar manualmente: abrir o anúncio no celular e tentar preencher o formulário');
      proximos_passos.push('Verificar no Meta Events Manager se o evento "Lead" está disparando corretamente');
      proximos_passos.push(cCtr < BM.ctr.medio
        ? 'Criar nova versão do criativo com gancho de dor mais direto antes de reativar'
        : 'Revisar a landing page — carregar rápido? Formulário funciona? CTA visível sem rolar?'
      );
    } else if (cCpa > 0 && cCpa <= BM.cpa.bom && cLeads >= 3) {
      recomendacao = 'ESCALAR';
      diagnostico =
        `🚀 Melhor desempenho: ${cLeads} leads com CPL de ${c.cpa} — abaixo do benchmark de ${fmt(BM.cpa.bom)}. ` +
        `CTR de ${c.ctr} e CPC de ${c.cpc}. Campanha validada para escalonamento.`;
      motivo =
        `CPL de ${c.cpa} está na zona excelente (abaixo de ${fmt(BM.cpa.bom)}) com volume suficiente ` +
        `para confirmar que o resultado é consistente e não foi sorte. É hora de aumentar o investimento com cuidado.`;
      proximos_passos.push(`Aumentar o orçamento em 20% e aguardar 5-7 dias antes do próximo aumento`);
      proximos_passos.push('Criar audiência lookalike 1% baseada nos leads desta campanha');
      proximos_passos.push('Não mexer em criativos, audiência ou configurações durante o escalonamento');
      proximos_passos.push('Se CPL subir mais de 30% após o aumento, voltar ao orçamento anterior');
    } else if (cCtr < BM.ctr.medio && cSpend > 20) {
      recomendacao = 'OTIMIZAR';
      diagnostico =
        `⚠️ CTR de ${c.ctr} — muito abaixo do mínimo de ${BM.ctr.medio}%. ` +
        `De cada 100 pessoas que viram o anúncio, menos de ${BM.ctr.medio} clicaram. O criativo não está chamando atenção.`;
      motivo =
        `CTR baixo é o sintoma mais claro de criativo inadequado. O anúncio está aparecendo para as pessoas certas, ` +
        `mas não está parando o scroll — o problema está nos primeiros 3 segundos do vídeo ou na imagem principal.`;
      proximos_passos.push('Criar nova versão do criativo — foque em mudar APENAS os primeiros 3 segundos ou a imagem principal');
      proximos_passos.push('Testar gancho de dor: "Sua empresa sabe quantas multas acumulou esse mês?"');
      proximos_passos.push('Testar gancho de número: "40% de desconto em multas via SNE"');
      proximos_passos.push('Não alterar audiência, orçamento ou botão até resolver o CTR');
      proximos_passos.push(`Meta: atingir CTR acima de ${BM.ctr.medio}% antes de qualquer outra mudança`);
    } else if (cCpa > BM.cpa.bom && cCpa <= BM.cpa.medio && cLeads > 0) {
      recomendacao = 'OTIMIZAR';
      diagnostico =
        `⚙️ ${cLeads} lead${cLeads > 1 ? 's' : ''} com CPL de ${c.cpa} — aceitável mas acima do ideal de ${fmt(BM.cpa.bom)}. ` +
        `CTR de ${c.ctr}${cCtr >= BM.ctr.medio ? ' (OK)' : ' (precisa melhorar)'}, CPC de ${c.cpc}.`;
      motivo =
        `CPL entre ${fmt(BM.cpa.bom)} e ${fmt(BM.cpa.medio)} é aceitável mas há espaço de melhoria. ` +
        `Com a taxa de conversão de 20% da Mônaco, um lead está custando ${fmt(cCpa)} e representa ` +
        `20% de chance de fechar negócio — se o ticket for alto, pode compensar.`;
      proximos_passos.push('Revisar a landing page: título alinhado com o anúncio? Formulário com menos de 4 campos?');
      proximos_passos.push('Adicionar prova social na LP: "27 anos | 180.000 veículos gerenciados"');
      proximos_passos.push('Verificar se clientes atuais estão excluídos da segmentação');
      proximos_passos.push(`Testar audiência de retargeting (visitantes dos últimos 14 dias do site)`);
    } else if (cCpa > BM.cpa.medio && cLeads > 0) {
      recomendacao = 'OTIMIZAR';
      diagnostico =
        `🔴 CPL de ${c.cpa} — ACIMA do limite aceitável de ${fmt(BM.cpa.medio)}. ` +
        `${cLeads} lead${cLeads > 1 ? 's' : ''} gerado${cLeads > 1 ? 's' : ''} mas a um custo que precisa ser reduzido urgente.`;
      motivo =
        `CPL acima de ${fmt(BM.cpa.medio)} indica problema em pelo menos um nível do funil: ` +
        `criativo (CTR baixo?), landing page (poucas conversões?), ou audiência (pessoas erradas clicando?). ` +
        `Não aumente o budget desta campanha até resolver o gargalo.`;
      proximos_passos.push('Diagnosticar por nível: CTR → taxa de clique-para-sessão → taxa de conversão da LP');
      proximos_passos.push('Se CTR < 1%: trocar criativo primeiro');
      proximos_passos.push('Se CTR OK mas CPL alto: o problema é a landing page — revisar urgente');
      proximos_passos.push('Pausar conjuntos de anúncios com gasto > R$50 e zero leads nesta campanha');
    } else {
      recomendacao = 'MONITORAR';
      diagnostico =
        cLeads > 0
          ? `⏳ ${cLeads} lead${cLeads > 1 ? 's' : ''} gerado${cLeads > 1 ? 's' : ''} com CPL de ${c.cpa} — volume ainda pequeno para decisão definitiva.`
          : `⏳ Gasto de ${c.gasto} em andamento — aguardando volume mínimo de dados para análise.`;
      motivo =
        `Volume de dados insuficiente para decidir entre escalar ou pausar. ` +
        `O mínimo recomendado é 50 leads por campanha antes de tirar conclusões definitivas. ` +
        `Abaixo disso, os resultados podem ser aleatórios e não representar o real potencial da campanha.`;
      proximos_passos.push('Aguardar pelo menos 50 leads antes de tomar decisão de escala ou pausa');
      proximos_passos.push('Monitorar CPL e CTR diariamente');
      proximos_passos.push('Se CPL subir muito acima de R$150, revisar criativo e LP antes de continuar');
    }

    return { nome: c.nome, diagnostico, recomendacao, motivo, proximos_passos };
  });

  // ── Análise de conjuntos ──────────────────────────────────────────────────
  const analise_conjuntos: AnaliseConjunto[] = conjuntos.slice(0, 10).map((a: any) => {
    const aSpend = parseBRL(a.gasto);
    const aLeads = Number(a.leads);
    const aCpa   = parseBRL(a.cpa);
    const aCtr   = parsePct(a.ctr);

    let acao: 'ESCALAR' | 'OTIMIZAR' | 'PAUSAR';
    let situacao: string;
    let motivo_rapido: string;

    if (aSpend > 30 && aLeads === 0) {
      acao = 'PAUSAR';
      situacao = `${fmt(aSpend)} gastos, 0 leads`;
      motivo_rapido = `Pause agora — está consumindo budget sem gerar resultado. Revise criativo ou LP antes de reativar.`;
    } else if (aCpa > 0 && aCpa <= BM.cpa.bom && aLeads >= 3) {
      acao = 'ESCALAR';
      situacao = `${aLeads} leads, CPL ${fmt(aCpa)} — ótimo`;
      motivo_rapido = `CPL abaixo de ${fmt(BM.cpa.bom)} com bom volume — aumentar budget 20% e monitorar.`;
    } else if (aCtr < BM.ctr.medio && aSpend > 15) {
      acao = 'OTIMIZAR';
      situacao = `CTR de ${aCtr.toFixed(2)}% — criativo não engaja`;
      motivo_rapido = `Troque o criativo (imagem/vídeo) antes de qualquer outra mudança — CTR abaixo de ${BM.ctr.medio}%.`;
    } else if (aCpa > BM.cpa.medio && aLeads > 0) {
      acao = 'OTIMIZAR';
      situacao = `${aLeads} leads, CPL ${fmt(aCpa)} — caro`;
      motivo_rapido = `CPL acima de ${fmt(BM.cpa.medio)} — revisar landing page e segmentação antes de continuar.`;
    } else {
      acao = 'OTIMIZAR';
      situacao = aLeads > 0 ? `${aLeads} lead(s), CPL ${fmt(aCpa)}` : `${fmt(aSpend)} investidos`;
      motivo_rapido = `Monitorar — volume insuficiente para decisão definitiva. Aguardar mais dados.`;
    }

    return { nome: a.nome, campanha: a.campanha, situacao, acao, motivo_rapido };
  });

  // ── Alerta crítico ─────────────────────────────────────────────────────────
  let alerta_critico: string | null = null;
  if (leads === 0 && spend > 100) {
    alerta_critico =
      `🚨 ATENÇÃO MÁXIMA: ${fmt(spend)} gastos no período sem nenhum lead gerado. ` +
      `Isso precisa ser investigado HOJE antes de continuar investindo. ` +
      `Verifique: (1) pixel de lead no Meta Events Manager, (2) formulário da landing page no celular, ` +
      `(3) se a página de destino está carregando corretamente.`;
  } else if (campSemLead.length > 0) {
    const totalDesperd = campSemLead.reduce((s: number, c: any) => s + parseBRL(c.gasto), 0);
    if (totalDesperd > 150) {
      alerta_critico =
        `🚨 ${fmt(totalDesperd)} investidos em ${campSemLead.length} campanha${campSemLead.length > 1 ? 's' : ''} ` +
        `sem nenhum lead: ${campSemLead.map((c: any) => c.nome).join(', ')}. ` +
        `Pause essas campanhas imediatamente enquanto investiga o problema.`;
    }
  } else if (cpa > BM.cpa.medio * 2 && leads > 0) {
    alerta_critico =
      `⚠️ CPL de ${fmt(cpa)} está ${(cpa / BM.cpa.medio).toFixed(1)}x acima do limite aceitável. ` +
      `Não aumente o orçamento agora — primeiro resolva o gargalo no funil.`;
  }

  // ── Insight oculto ─────────────────────────────────────────────────────────
  let insight_oculto: string;

  const diasComLead = tendencia.filter((d: any) => Number(d.leads) > 0).length;
  const totalDias   = tendencia.length;

  if (ctr > BM.ctr.bom && cpa > BM.cpa.medio && leads > 0) {
    insight_oculto =
      `Paradoxo importante: seu CTR de ${vg.ctr_medio} está ótimo (as pessoas estão clicando bastante), ` +
      `mas o CPL de ${fmt(cpa)} está alto. Isso revela que o problema NÃO É o anúncio — é a página de destino. ` +
      `As pessoas clicam, chegam na página, mas não preenchem o formulário. ` +
      `Soluções: carregar mais rápido, formulário mais curto, texto mais convincente, botão mais visível.`;
  } else if (ctr < BM.ctr.medio && leads > 0 && taxaConv > 5) {
    insight_oculto =
      `Dado não óbvio: apesar do CTR baixo (${vg.ctr_medio}), quem chega na sua página CONVERTE bem ` +
      `(${taxaConv.toFixed(1)}% de conversão de clique para lead). ` +
      `Isso significa que sua landing page está ótima — o gargalo está no anúncio. ` +
      `Se você melhorar o CTR para ${BM.ctr.bom}%, os leads podem crescer proporcionalmente ` +
      `sem precisar mexer em mais nada no funil.`;
  } else if (totalDias > 0 && diasComLead < totalDias * 0.4 && leads > 0) {
    insight_oculto =
      `Os leads estão muito concentrados: apenas ${diasComLead} de ${totalDias} dias geraram conversões ` +
      `(${Math.round((diasComLead / totalDias) * 100)}% dos dias). ` +
      `Isso pode indicar que o algoritmo do Meta ainda não estabilizou, ` +
      `ou que existe um padrão de dia/hora — vale investigar quais dias converteram melhor ` +
      `e considerar programação de anúncios para esses períodos.`;
  } else if (campanhas.length > 1) {
    const sorted    = [...campanhas].filter((c: any) => Number(c.leads) > 0)
                        .sort((a: any, b: any) => parseBRL(a.cpa) - parseBRL(b.cpa));
    const melhor    = sorted[0];
    const pior      = sorted[sorted.length - 1];
    if (melhor && pior && melhor.nome !== pior.nome) {
      const ratio = parseBRL(pior.cpa) / parseBRL(melhor.cpa);
      insight_oculto =
        `Diferença expressiva entre campanhas: "${melhor.nome}" está gerando leads a ${melhor.cpa}, ` +
        `enquanto "${pior.nome}" custa ${pior.cpa} por lead — ${ratio.toFixed(1)}x mais caro. ` +
        `Se você mover todo o budget para a campanha mais eficiente, pode aumentar o volume de leads ` +
        `em até ${Math.round((ratio - 1) * 100)}% sem gastar um real a mais.`;
    } else {
      insight_oculto =
        `Com ${leads} lead${leads !== 1 ? 's' : ''} gerado${leads !== 1 ? 's' : ''} e taxa de conversão de 20%, ` +
        `cada lead qualificado representa potencial de receita. ` +
        `O principal alavancador de crescimento agora é o VOLUME de entrada no funil — ` +
        `mais leads qualificados = mais clientes, sem precisar mudar o processo comercial.`;
    }
  } else {
    insight_oculto =
      `Com taxa de conversão de 20% e ${leads} lead${leads !== 1 ? 's' : ''} no período, ` +
      `a Mônaco tem potencial de fechar ${Math.round(leads * 0.2)} novo${Math.round(leads * 0.2) !== 1 ? 's' : ''} ` +
      `cliente${Math.round(leads * 0.2) !== 1 ? 's' : ''} só com esses dados. ` +
      `O principal alavancador não é a taxa de conversão — é o volume de entrada no funil. ` +
      `Dobrar o volume de leads qualificados dobra o número de clientes.`;
  }

  // ── Meta próximo período ─────────────────────────────────────────────────
  let meta_proximo_periodo: string;

  if (leads === 0 && spend > 0) {
    meta_proximo_periodo =
      `🎯 SEMANA QUE VEM — foco total em diagnóstico técnico:\n` +
      `1. Testar manualmente cada campanha ativa (clicar no anúncio, preencher formulário)\n` +
      `2. Verificar pixel de lead no Meta Events Manager\n` +
      `3. Pausar campanhas com gasto e zero conversão\n` +
      `4. Criar uma nova versão de criativo com gancho direto antes de reativar\n` +
      `Meta: gerar o primeiro lead. Sem isso, não há como otimizar nada.`;
  } else if (nota_geral < 40) {
    meta_proximo_periodo =
      `🎯 SEMANA QUE VEM — corrigir o funil:\n` +
      `1. Trocar criativo nas campanhas com CTR abaixo de ${BM.ctr.medio}%\n` +
      `2. Revisar landing page: velocidade + formulário + CTA\n` +
      `3. Pausar conjuntos com gasto > R$50 e zero leads\n` +
      `4. Meta: reduzir CPL de ${fmt(cpa)} para abaixo de ${fmt(BM.cpa.medio)}\n` +
      `5. NÃO aumentar budget até o CPL estar dentro do aceitável`;
  } else if (nota_geral < 65) {
    meta_proximo_periodo =
      `🎯 SEMANA QUE VEM — otimizar e testar:\n` +
      `1. Testar 1 novo criativo com ângulo diferente (dor, prova social ou desconto)\n` +
      `2. Revisar LP: adicionar "para empresas com 10+ veículos" e reduzir campos do formulário\n` +
      `3. Criar audiência de retargeting se ainda não existir\n` +
      `4. Meta: elevar CTR para acima de ${BM.ctr.medio}% e CPL abaixo de ${fmt(BM.cpa.bom)}\n` +
      `5. Aumentar budget apenas na campanha com melhor CPL`;
  } else if (nota_geral < 85) {
    meta_proximo_periodo =
      `🎯 SEMANA QUE VEM — escalar com cuidado:\n` +
      `1. Aumentar budget 20% nas campanhas com CPL abaixo de ${fmt(BM.cpa.bom)}\n` +
      `2. Criar lookalike 1% da base de leads atuais\n` +
      `3. Testar 1 novo criativo para manter a base criativa fresca\n` +
      `4. Meta: aumentar volume de leads em 30% mantendo CPL abaixo de ${fmt(BM.cpa.bom)}\n` +
      `5. Monitorar CPL diariamente após o aumento de budget`;
  } else {
    meta_proximo_periodo =
      `🎯 SEMANA QUE VEM — expansão e novos canais:\n` +
      `1. Aumentar budget 20-30% nas campanhas mais eficientes\n` +
      `2. Testar lookalike 2% para ampliar audiência qualificada\n` +
      `3. Avaliar LinkedIn Ads para atingir Gerentes de Frota e Logística diretamente\n` +
      `4. Criar vídeo de depoimento de cliente para usar em remarketing\n` +
      `5. Meta: dobrar volume de leads mantendo CPL — a máquina está funcionando, agora é escala`;
  }

  // ── Diagnóstico geral ─────────────────────────────────────────────────────
  const notaEmoji2  = nota_geral >= 80 ? '🟢' : nota_geral >= 55 ? '🟡' : '🔴';

  if (leads === 0 && spend > 0) {
    diagnostico_geral =
      `${notaEmoji2} SITUAÇÃO CRÍTICA | Período: ${periodo}\n\n` +
      `Você investiu ${fmt(spend)} e não gerou nenhum lead. Isso significa que o dinheiro saiu mas ` +
      `nenhum cliente em potencial preencheu formulário ou entrou em contato.\n\n` +
      `📊 Seus números: CTR ${vg.ctr_medio} ${ctr < BM.ctr.medio ? '(baixo — anúncio não chama atenção)' : '(OK)'} | ` +
      `CPC ${vg.cpc_medio} ${cpc > BM.cpc.medio ? '(caro)' : '(OK)'} | ` +
      `${impress > 0 ? `${impress.toLocaleString('pt-BR')} impressões` : 'sem impressões registradas'}\n\n` +
      `O problema pode estar em 3 lugares: (1) o criativo não convence as pessoas a clicar, ` +
      `(2) a página de destino não funciona no celular ou não converte, ou ` +
      `(3) o pixel de rastreamento não está registrando os leads corretamente. ` +
      `Investigar isso é a prioridade número 1.`;
  } else if (leads > 0) {
    diagnostico_geral =
      `${notaEmoji2} Nota ${nota_geral}/100 | Período: ${periodo}\n\n` +
      `Você investiu ${fmt(spend)} e gerou ${leads} lead${leads !== 1 ? 's' : ''} ` +
      `(pessoa${leads !== 1 ? 's' : ''} que demonstrou interesse no serviço da Mônaco). ` +
      `Com a taxa de conversão de 20%, isso representa potencial de ` +
      `${Math.max(1, Math.round(leads * 0.2))} novo${Math.round(leads * 0.2) !== 1 ? 's' : ''} cliente${Math.round(leads * 0.2) !== 1 ? 's' : ''}.\n\n` +
      `📊 Seus números vs. benchmark do mercado:\n` +
      `• Custo por lead: ${fmt(cpa)} → ${cpa <= BM.cpa.bom ? `✅ Ótimo (abaixo de ${fmt(BM.cpa.bom)})` : cpa <= BM.cpa.medio ? `⚠️ Aceitável (abaixo de ${fmt(BM.cpa.medio)})` : `❌ Alto (acima de ${fmt(BM.cpa.medio)})`}\n` +
      `• CTR (% que clicou): ${vg.ctr_medio} → ${ctr >= BM.ctr.bom ? `✅ Excelente (acima de ${BM.ctr.bom}%)` : ctr >= BM.ctr.medio ? `⚠️ Aceitável (acima de ${BM.ctr.medio}%)` : `❌ Baixo (abaixo de ${BM.ctr.medio}%)`}\n` +
      `• Custo por clique: ${vg.cpc_medio} → ${cpc <= BM.cpc.bom ? `✅ Bom (abaixo de ${fmt(BM.cpc.bom)})` : cpc <= BM.cpc.medio ? `⚠️ Médio` : `❌ Caro (acima de ${fmt(BM.cpc.medio)})`}\n` +
      `${taxaConv > 0 ? `• Conversão (clique→lead): ${taxaConv.toFixed(1)}% → ${taxaConv >= 5 ? '✅ Boa (acima de 5%)' : taxaConv >= 2 ? '⚠️ Média' : '❌ Baixa (abaixo de 2%)'}\n` : ''}` +
      `\n${nota_geral >= 65 ? 'O funil está funcionando. Foco em otimizar e escalar gradualmente o que já está gerando resultado.' : 'Há oportunidades claras de melhoria — veja as ações prioritárias abaixo.'}`;
  } else {
    diagnostico_geral = `Nenhum dado de gasto encontrado no período ${periodo}. Verifique se as campanhas estão ativas e execute a sincronização em Diagnóstico.`;
  }

  return {
    diagnostico_geral,
    nota_geral,
    o_que_esta_funcionando: funcionando.slice(0, 5),
    o_que_nao_esta_funcionando: naoFuncionando.slice(0, 5),
    acoes_prioritarias: acoes.slice(0, 6),
    analise_por_campanha,
    analise_conjuntos,
    alerta_critico,
    insight_oculto,
    meta_proximo_periodo,
  };
}

// ─── Helpers de data / fetch ──────────────────────────────────────────────────
function getDateRange(req: any, defaultDays = 30) {
  const to = (req.query.to as string) || new Date().toISOString().split('T')[0];
  const from = (req.query.from as string) || (() => {
    const d = new Date(to);
    d.setDate(d.getDate() - defaultDays + 1);
    return d.toISOString().split('T')[0];
  })();
  return { from, to };
}

aiRouter.post('/professor', async (req: AuthRequest, res: Response) => {
  try {
    const { from: reqFrom, to: reqTo } = getDateRange(req, 30);

    async function fetchForRange(f: string, t: string) {
      const [overview] = await sql`
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
        WHERE c.user_id = ${req.userId!} AND m.date >= ${f} AND m.date <= ${t}
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
        LEFT JOIN metrics m ON m.campaign_id = c.id AND m.date >= ${f} AND m.date <= ${t}
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
        WHERE c.user_id = ${req.userId!} AND m.date >= ${f} AND m.date <= ${t}
        GROUP BY m.date ORDER BY m.date
      `;

      return { overview, campaigns, adSets, dailyTrend };
    }

    let { overview, campaigns, adSets, dailyTrend } = await fetchForRange(reqFrom, reqTo);
    let finalFrom = reqFrom;
    let finalTo   = reqTo;

    if (Number(overview.total_spend) === 0) {
      const [anyData] = await sql`
        SELECT MIN(m.date)::text AS oldest, MAX(m.date)::text AS newest
        FROM metrics m JOIN campaigns c ON c.id = m.campaign_id
        WHERE c.user_id = ${req.userId!}
      `;
      if (!anyData?.oldest) {
        res.status(400).json({
          success: false,
          error: { message: 'Nenhum dado encontrado. Vá em Diagnóstico e clique em "Sincronizar Agora" primeiro.' },
        });
        return;
      }
      finalFrom = String(anyData.oldest).split('T')[0];
      finalTo   = String(anyData.newest).split('T')[0];

      const refetched = await fetchForRange(finalFrom, finalTo);
      overview   = refetched.overview;
      campaigns  = refetched.campaigns;
      adSets     = refetched.adSets;
      dailyTrend = refetched.dailyTrend;
    }

    const dataPayload = {
      periodo: `${finalFrom} até ${finalTo}`,
      visao_geral: {
        gasto_total:   `R$${Number(overview.total_spend).toFixed(2)}`,
        leads_gerados:  Number(overview.total_leads),
        cliques:        Number(overview.total_clicks),
        impressoes:     Number(overview.total_impressions),
        cpa_medio:     `R$${Number(overview.avg_cpa).toFixed(2)}`,
        ctr_medio:     `${Number(overview.avg_ctr).toFixed(2)}%`,
        cpc_medio:     `R$${Number(overview.avg_cpc).toFixed(2)}`,
      },
      campanhas: campaigns.map((c: any) => ({
        nome:       c.name,
        status:     c.status,
        gasto:     `R$${Number(c.spend).toFixed(2)}`,
        leads:      Number(c.leads),
        cpa:       `R$${Number(c.cpa).toFixed(2)}`,
        ctr:       `${Number(c.ctr).toFixed(2)}%`,
        cpc:       `R$${Number(c.cpc).toFixed(2)}`,
        cliques:    Number(c.clicks),
        impressoes: Number(c.impressions),
      })),
      conjuntos_anuncios: adSets.map((a: any) => ({
        nome:             a.name,
        campanha:         a.campaign_name,
        status:           a.status,
        orcamento_diario: Number(a.daily_budget),
        gasto:            Number(a.spend),
        leads:            Number(a.leads),
        cpa:              Number(a.cpa),
        ctr:              Number(a.ctr),
        cpc:              Number(a.cpc),
      })),
      tendencia_diaria: dailyTrend.map((d: any) => ({
        data:  String(d.date).split('T')[0],
        gasto: `R$${Number(d.spend).toFixed(2)}`,
        leads:  Number(d.leads),
        ctr:   `${Number(d.ctr).toFixed(2)}%`,
      })),
    };

    const analysis = buildAnalysis(dataPayload);

    res.json({
      success: true,
      data: {
        analysis,
        period: { from: finalFrom, to: finalTo },
        input_summary: {
          campaigns:   campaigns.length,
          ad_sets:     adSets.length,
          total_spend: Number(overview.total_spend),
          total_leads: Number(overview.total_leads),
        },
      },
    });
  } catch (err: any) {
    const msg = err?.message || 'Erro ao gerar análise';
    res.status(500).json({ success: false, error: { message: msg } });
  }
});
