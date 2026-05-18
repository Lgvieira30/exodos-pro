import { Router, Response } from 'express';
import { sql } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const aiRouter = Router();
aiRouter.use(requireAuth);

// ─── Benchmarks Meta Ads B2B (Mônaco) ────────────────────────────────────────
const BM = {
  ctr:  { bom: 2.5,  medio: 1.0 },   // %
  cpc:  { bom: 5,    medio: 15  },    // R$
  cpa:  { bom: 60,   medio: 150 },    // R$ — CPL Meta retargeting/lookalike B2B
  cpm:  { bom: 20,   medio: 50  },    // R$
};

type Prioridade = 'URGENTE' | 'ALTA' | 'MEDIA';
type Recomendacao = 'ESCALAR' | 'OTIMIZAR' | 'PAUSAR' | 'MONITORAR';

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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseBRL(v: string): number { return parseFloat(v.replace('R$', '').replace(',', '.')) || 0; }
function parsePct(v: string): number { return parseFloat(v.replace('%', '').replace(',', '.')) || 0; }
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

// ─── Rule-based analysis engine ──────────────────────────────────────────────
function buildAnalysis(payload: any): AnalysisResult {
  const vg = payload.visao_geral;
  const campanhas: any[]       = payload.campanhas || [];
  const conjuntos: any[]       = payload.conjuntos_anuncios || [];
  const tendencia: any[]       = payload.tendencia_diaria || [];
  const periodo: string        = payload.periodo || '';

  const spend    = parseBRL(vg.gasto_total);
  const leads    = Number(vg.leads_gerados);
  const cliques  = Number(vg.cliques);
  const impress  = Number(vg.impressoes);
  const cpa      = parseBRL(vg.cpa_medio);
  const ctr      = parsePct(vg.ctr_medio);
  const cpc      = parseBRL(vg.cpc_medio);

  // ── Score geral ────────────────────────────────────────────────────────────
  const sCtr = scoreMetric(ctr, BM.ctr.bom, BM.ctr.medio, true);
  const sCpa = scoreMetric(cpa, BM.cpa.bom, BM.cpa.medio, false);
  const sCpc = scoreMetric(cpc, BM.cpc.bom, BM.cpc.medio, false);
  // Peso: CPA 50%, CTR 30%, CPC 20%
  const nota_geral = Math.round(sCpa * 0.5 + sCtr * 0.3 + sCpc * 0.2);

  // ── O que está funcionando ─────────────────────────────────────────────────
  const funcionando: string[] = [];
  const naoFuncionando: string[] = [];

  if (ctr >= BM.ctr.bom)
    funcionando.push(`CTR de ${vg.ctr_medio} — acima do benchmark B2B de ${BM.ctr.bom}% para Meta Ads retargeting`);
  else if (ctr >= BM.ctr.medio)
    funcionando.push(`CTR de ${vg.ctr_medio} — dentro do aceitável, mas ainda com espaço para melhorar o criativo`);

  if (cpa > 0 && cpa <= BM.cpa.bom)
    funcionando.push(`CPL de ${fmt(cpa)} — abaixo do benchmark de ${fmt(BM.cpa.bom)}, custo por lead competitivo`);

  if (cpc <= BM.cpc.bom)
    funcionando.push(`CPC de ${fmt(cpc)} — dentro do ideal para tráfego B2B no Meta`);

  if (leads > 0)
    funcionando.push(`${leads} lead${leads > 1 ? 's' : ''} gerado${leads > 1 ? 's' : ''} no período — funil ativo`);

  const campAtivas = campanhas.filter(c => c.status === 'ACTIVE' || c.status === 'active');
  if (campAtivas.length > 0)
    funcionando.push(`${campAtivas.length} campanha${campAtivas.length > 1 ? 's' : ''} ativa${campAtivas.length > 1 ? 's' : ''} com investimento registrado`);

  // Tendência de melhora nos últimos dias
  if (tendencia.length >= 4) {
    const metade = Math.floor(tendencia.length / 2);
    const primeira = tendencia.slice(0, metade);
    const segunda  = tendencia.slice(metade);
    const mediaCtr1 = primeira.reduce((s: number, d: any) => s + parsePct(d.ctr), 0) / primeira.length;
    const mediaCtr2 = segunda.reduce((s: number, d: any) => s + parsePct(d.ctr), 0) / segunda.length;
    if (mediaCtr2 > mediaCtr1 * 1.1)
      funcionando.push(`CTR em tendência de alta na segunda metade do período — campanhas ganhando relevância`);
  }

  if (funcionando.length === 0)
    funcionando.push('Dados sincronizados — base para diagnóstico disponível');

  // ── O que não está funcionando ─────────────────────────────────────────────
  if (ctr < BM.ctr.medio)
    naoFuncionando.push(`CTR de ${vg.ctr_medio} abaixo de ${BM.ctr.medio}% — criativos não estão parando o scroll (Situação A)`);
  else if (ctr < BM.ctr.bom)
    naoFuncionando.push(`CTR de ${vg.ctr_medio} abaixo do ideal de ${BM.ctr.bom}% — hook dos criativos pode ser melhorado`);

  if (cpa > BM.cpa.medio)
    naoFuncionando.push(`CPL de ${fmt(cpa)} acima do limite aceitável de ${fmt(BM.cpa.medio)} — custo por lead alto para B2B`);
  else if (cpa > BM.cpa.bom)
    naoFuncionando.push(`CPL de ${fmt(cpa)} entre ${fmt(BM.cpa.bom)} e ${fmt(BM.cpa.medio)} — otimizável com ajustes de audiência ou LP`);

  if (cpc > BM.cpc.medio)
    naoFuncionando.push(`CPC de ${fmt(cpc)} elevado — considerar testar novos formatos ou audiências menos disputadas`);

  const campSemLead = campanhas.filter(c => Number(c.leads) === 0 && parseBRL(c.gasto) > 50);
  if (campSemLead.length > 0)
    naoFuncionando.push(`${campSemLead.map(c => `"${c.nome}"`).join(', ')} com gasto mas zero leads — risco de desperdício`);

  if (leads === 0 && spend > 0)
    naoFuncionando.push(`Nenhum lead gerado no período com ${fmt(spend)} investidos — revisar funil de conversão e LP urgente`);

  if (naoFuncionando.length === 0 && nota_geral < 70)
    naoFuncionando.push('Métricas dentro do aceitável mas com espaço relevante para otimização');

  // ── Ações prioritárias ────────────────────────────────────────────────────
  const acoes: AcaoPrioritaria[] = [];

  // URGENTE: campanhas com gasto e zero leads
  campSemLead.forEach(c => {
    acoes.push({
      prioridade: 'URGENTE',
      titulo: `Pausar ou revisar "${c.nome}"`,
      descricao: `Campanha com ${c.gasto} investidos e 0 leads. Verificar: (1) LP está carregando? (2) formulário está funcionando? (3) pixel disparando conversão? Se tudo OK, a segmentação ou criativo não está ressoando — pausar e subir nova versão antes de continuar queimando budget.`,
      impacto_esperado: 'Evita desperdício imediato de budget e permite redirecionar verba para o que está convertendo',
      campanha_ou_conjunto: c.nome,
    });
  });

  // URGENTE: leads zero geral
  if (leads === 0 && spend > 0) {
    acoes.push({
      prioridade: 'URGENTE',
      titulo: 'Verificar pixel e landing page — zero leads no período',
      descricao: 'Com investimento ativo e zero leads, o problema é técnico ou de funil: (1) Acessar o Meta Events Manager e confirmar que o evento de lead está disparando; (2) Testar o formulário/LP você mesmo; (3) Verificar se a LP abre rápido no celular (abaixo de 3s); (4) Conferir se o formulário tem mais de 5 campos (cada campo extra reduz conversão ~10%).',
      impacto_esperado: 'Identificar e corrigir o gargalo técnico que está impedindo conversões',
      campanha_ou_conjunto: 'Geral',
    });
  }

  // ALTA: CTR baixo
  if (ctr < BM.ctr.medio) {
    acoes.push({
      prioridade: 'URGENTE',
      titulo: 'Trocar criativos — CTR crítico',
      descricao: `CTR de ${vg.ctr_medio} indica que o anúncio não está parando o scroll (Situação A). Ação imediata: (1) Trocar os primeiros 3 segundos do vídeo ou o visual da imagem; (2) Testar hook de dor: "Sua empresa sabe quantas multas acumulou esse mês?"; (3) Testar hook de número: "R$ 40.000 em multas sem tratamento"; (4) Não mexer em audiência nem CTA antes de resolver o criativo. Volume mínimo para julgar: 1.000 impressões por versão.`,
      impacto_esperado: `Elevar CTR para acima de ${BM.ctr.medio}% pode reduzir CPC em até 40% e gerar mais leads com o mesmo budget`,
      campanha_ou_conjunto: 'Geral',
    });
  } else if (ctr < BM.ctr.bom) {
    acoes.push({
      prioridade: 'ALTA',
      titulo: 'Testar novo hook nos criativos',
      descricao: `CTR de ${vg.ctr_medio} está médio — espaço para melhorar. Testar: (1) Ângulo de dor oculta: "Você só descobre a multa quando o motorista já perdeu a CNH"; (2) Ângulo de custo: "5 custos que a gestão interna de frota gera e não aparecem na planilha"; (3) Ângulo de prova por escala: "180.000 veículos gerenciados. Zero passivo documental". Isolar 1 variável por teste.`,
      impacto_esperado: `Elevar CTR de ${vg.ctr_medio} para acima de ${BM.ctr.bom}% otimiza CPC e aumenta volume de leads`,
      campanha_ou_conjunto: 'Geral',
    });
  }

  // ALTA: CPA alto
  if (cpa > BM.cpa.medio) {
    acoes.push({
      prioridade: 'URGENTE',
      titulo: 'CPL acima do limite — auditoria de funil urgente',
      descricao: `CPL de ${fmt(cpa)} acima de ${fmt(BM.cpa.medio)} exige diagnóstico por nível: (1) Nível Engajamento — CTR está bom? Se não, problema no criativo; (2) Nível Chegada — taxa clique→sessão acima de 80%? Se não, LP lenta; (3) Nível Conversão — taxa de conversão da LP acima de 5%? Se não, problema na LP. Não aumentar budget antes de resolver o gargalo.`,
      impacto_esperado: `Reduzir CPL de ${fmt(cpa)} para abaixo de ${fmt(BM.cpa.bom)} pode triplicar o volume de leads com o mesmo investimento`,
      campanha_ou_conjunto: 'Geral',
    });
  } else if (cpa > BM.cpa.bom) {
    acoes.push({
      prioridade: 'ALTA',
      titulo: 'Otimizar CPL — dentro do médio, abaixo do ideal',
      descricao: `CPL de ${fmt(cpa)} — aceitável mas otimizável. Verificar: (1) Audiência de retargeting está excluindo clientes atuais? (2) Lookalike 1% da base de clientes está rodando? (3) Landing page com qualificador "empresa com 10+ veículos"? (4) Testar reduzir campos do formulário para máximo 4.`,
      impacto_esperado: `Reduzir CPL para abaixo de ${fmt(BM.cpa.bom)} aumenta volume de leads qualificados sem elevar budget`,
      campanha_ou_conjunto: 'Geral',
    });
  }

  // ALTA: CPC alto
  if (cpc > BM.cpc.medio && acoes.length < 5) {
    acoes.push({
      prioridade: 'ALTA',
      titulo: 'CPC elevado — revisar audiência e formato',
      descricao: `CPC de ${fmt(cpc)} acima do ideal. Ações: (1) Verificar se audiência está muito ampla (CPM sobe com baixa relevância); (2) Testar formato diferente — se era imagem, subir vídeo de 15-30s; (3) Revisar segmentação — lookalike 1% da base de clientes tende a ter CPC menor que audiência fria; (4) Verificar frequência — acima de 3.5 indica saturação.`,
      impacto_esperado: 'Reduzir CPC gera mais cliques e mais oportunidades de conversão com o mesmo budget',
      campanha_ou_conjunto: 'Geral',
    });
  }

  // MEDIA: melhor campanha — escalar
  const melhoresCamp = campanhas
    .filter(c => Number(c.leads) >= 3 && parseBRL(c.cpa) > 0 && parseBRL(c.cpa) <= BM.cpa.bom)
    .sort((a, b) => Number(b.leads) - Number(a.leads));
  if (melhoresCamp.length > 0 && acoes.length < 6) {
    const best = melhoresCamp[0];
    acoes.push({
      prioridade: 'MEDIA',
      titulo: `Escalar "${best.nome}"`,
      descricao: `Campanha com melhor CPL (${best.cpa}) e ${best.leads} leads — candidata a escalonamento. Regra: aumentar budget em no máximo 20% a cada 7 dias para não quebrar aprendizado do algoritmo. Monitorar CPL por 3-5 dias após cada aumento antes do próximo ajuste.`,
      impacto_esperado: 'Aumentar volume de leads qualificados mantendo CPL dentro do benchmark',
      campanha_ou_conjunto: best.nome,
    });
  }

  // MEDIA: qualificação de leads
  if (leads > 0 && acoes.length < 6) {
    acoes.push({
      prioridade: 'MEDIA',
      titulo: 'Adicionar qualificador no formulário/LP',
      descricao: 'Para garantir leads qualificados (empresa com 10+ veículos): (1) Incluir no copy e LP "para empresas com frota de 10+ veículos"; (2) Adicionar campo no formulário: "Quantos veículos sua empresa possui?" com opções (1-9, 10-49, 50-199, 200+); (3) No Google — revisar negativos: "minha CNH, pessoal, grátis"; (4) No Meta — criar audiência excluindo interesses pessoais de veículos.',
      impacto_esperado: 'Aumentar % de leads qualificados (meta: acima de 40%) e reduzir tempo da equipe comercial em leads fora do perfil',
      campanha_ou_conjunto: 'Geral',
    });
  }

  // ── Análise por campanha ──────────────────────────────────────────────────
  const analise_por_campanha: AnaliseCampanha[] = campanhas.map(c => {
    const cSpend = parseBRL(c.gasto);
    const cLeads = Number(c.leads);
    const cCpa   = parseBRL(c.cpa);
    const cCtr   = parsePct(c.ctr);
    const cCpc   = parseBRL(c.cpc);

    let recomendacao: Recomendacao;
    let diagnostico: string;
    let motivo: string;
    const proximos_passos: string[] = [];

    if (cSpend > 30 && cLeads === 0) {
      recomendacao = 'PAUSAR';
      diagnostico = `${c.gasto} investidos com zero leads — funil quebrado ou criativo irrelevante`;
      motivo = 'Nenhuma conversão com gasto significativo indica problema técnico (LP/pixel) ou criativo totalmente desalinhado com a audiência';
      proximos_passos.push('Verificar pixel de lead no Meta Events Manager');
      proximos_passos.push('Testar LP manualmente no celular');
      proximos_passos.push('Se técnico OK, pausar e subir novo criativo com ângulo diferente');
    } else if (cCpa > 0 && cCpa <= BM.cpa.bom && cLeads >= 3) {
      recomendacao = 'ESCALAR';
      diagnostico = `CPL de ${c.cpa} abaixo do benchmark com ${cLeads} leads — campanha validada`;
      motivo = `CPL de ${c.cpa} está dentro do excelente (abaixo de ${fmt(BM.cpa.bom)}) com volume suficiente para decisão`;
      proximos_passos.push(`Aumentar budget em 20% e monitorar CPL por 5-7 dias`);
      proximos_passos.push('Criar lookalike 1% da lista de leads desta campanha');
      proximos_passos.push('Manter criativos atuais — não mexer no que está funcionando');
    } else if (cCtr < BM.ctr.medio && cSpend > 20) {
      recomendacao = 'OTIMIZAR';
      diagnostico = `CTR de ${c.ctr} abaixo de ${BM.ctr.medio}% — criativo não engaja (Situação A)`;
      motivo = 'CTR baixo indica que o anúncio não está parando o scroll. O problema é o criativo, não a audiência.';
      proximos_passos.push('Trocar os primeiros 3 segundos do vídeo ou o visual da imagem');
      proximos_passos.push(`Testar headline com dado concreto: "40% de desconto em multas via SNE"`);
      proximos_passos.push('Não alterar audiência antes de testar pelo menos 2 versões de criativo');
    } else if (cCpa > BM.cpa.bom && cCpa <= BM.cpa.medio && cLeads > 0) {
      recomendacao = 'OTIMIZAR';
      diagnostico = `CPL de ${c.cpa} aceitável mas acima do ideal de ${fmt(BM.cpa.bom)}`;
      motivo = 'CPL na faixa média — otimizável com ajustes de LP e qualificação de audiência';
      proximos_passos.push('Revisar LP: reduzir campos, melhorar CTA, alinhar headline com o anúncio');
      proximos_passos.push('Testar audiência de retargeting mais quente (visitantes dos últimos 14 dias)');
      proximos_passos.push('Checar se a exclusão de clientes atuais está ativa');
    } else if (cCpa > BM.cpa.medio && cLeads > 0) {
      recomendacao = 'OTIMIZAR';
      diagnostico = `CPL de ${c.cpa} acima do limite aceitável de ${fmt(BM.cpa.medio)} — revisão urgente`;
      motivo = 'CPL alto indica gargalo em algum nível do funil — engajamento, chegada ou conversão';
      proximos_passos.push('Diagnóstico por nível: CTR → taxa clique→sessão → taxa conversão LP');
      proximos_passos.push('Pausar grupos de anúncios com gasto > 30 e zero leads');
      proximos_passos.push('Testar nova audiência lookalike 1% se retargeting já foi otimizado');
    } else {
      recomendacao = 'MONITORAR';
      const motCount = cLeads === 1 ? '1 lead' : `${cLeads} leads`;
      diagnostico = cLeads > 0
        ? `${motCount} gerado(s) com CPL de ${c.cpa} — dados insuficientes para decisão`
        : `Gasto de ${c.gasto} em andamento — aguardar volume mínimo de 50 leads para julgar`;
      motivo = `Volume de dados ainda insuficiente (mínimo 50 leads por conjunto para decisão estatisticamente válida)`;
      proximos_passos.push('Aguardar pelo menos 50 leads antes de qualquer decisão de escala ou pausa');
      proximos_passos.push('Monitorar CPL e CTR diariamente');
    }

    return { nome: c.nome, diagnostico, recomendacao, motivo, proximos_passos };
  });

  // ── Análise de conjuntos ──────────────────────────────────────────────────
  const analise_conjuntos: AnaliseConjunto[] = conjuntos.slice(0, 10).map(a => {
    const aSpend = Number(a.spend) || parseBRL(a.gasto || '0');
    const aLeads = Number(a.leads);
    const aCpa   = Number(a.cpa) || parseBRL(a.cpa || '0');
    const aCtr   = Number(a.ctr) || parsePct(a.ctr || '0');

    let acao: 'ESCALAR' | 'OTIMIZAR' | 'PAUSAR';
    let situacao: string;
    let motivo_rapido: string;

    if (aSpend > 30 && aLeads === 0) {
      acao = 'PAUSAR';
      situacao = `${fmt(aSpend)} gastos, zero leads`;
      motivo_rapido = 'Gasto sem retorno — pausar e revisar criativo ou segmentação';
    } else if (aCpa > 0 && aCpa <= BM.cpa.bom && aLeads >= 3) {
      acao = 'ESCALAR';
      situacao = `${aLeads} leads com CPL de ${fmt(aCpa)}`;
      motivo_rapido = `CPL abaixo do benchmark de ${fmt(BM.cpa.bom)} — aumentar budget 20%`;
    } else if (aCtr < BM.ctr.medio && aSpend > 15) {
      acao = 'OTIMIZAR';
      situacao = `CTR de ${aCtr.toFixed(2)}% — criativo não engaja`;
      motivo_rapido = 'Trocar criativo antes de qualquer outro ajuste (Situação A)';
    } else if (aCpa > BM.cpa.medio && aLeads > 0) {
      acao = 'OTIMIZAR';
      situacao = `CPL de ${fmt(aCpa)} acima do limite aceitável`;
      motivo_rapido = `CPL acima de ${fmt(BM.cpa.medio)} — revisar LP e audiência`;
    } else {
      acao = 'OTIMIZAR';
      situacao = aLeads > 0 ? `${aLeads} lead(s), CPL de ${fmt(aCpa)}` : 'Dados em acumulação';
      motivo_rapido = 'Monitorar — volume insuficiente para decisão definitiva';
    }

    return {
      nome: a.nome,
      campanha: a.campanha,
      situacao,
      acao,
      motivo_rapido,
    };
  });

  // ── Alerta crítico ─────────────────────────────────────────────────────────
  let alerta_critico: string | null = null;
  if (leads === 0 && spend > 100) {
    alerta_critico = `ATENÇÃO: ${fmt(spend)} investidos no período sem nenhum lead gerado. Verificar pixel e LP AGORA antes de continuar investindo.`;
  } else if (campSemLead.length > 0 && campSemLead.reduce((s, c) => s + parseBRL(c.gasto), 0) > 200) {
    const totalDesperd = campSemLead.reduce((s, c) => s + parseBRL(c.gasto), 0);
    alerta_critico = `${fmt(totalDesperd)} investidos em ${campSemLead.length} campanha(s) sem nenhum lead: ${campSemLead.map(c => c.nome).join(', ')}. Pausar imediatamente enquanto otimiza.`;
  } else if (cpa > BM.cpa.medio * 2) {
    alerta_critico = `CPL de ${fmt(cpa)} está ${(cpa / BM.cpa.medio).toFixed(1)}x acima do limite aceitável. Parar escalada de budget até resolver o gargalo.`;
  }

  // ── Insight oculto ─────────────────────────────────────────────────────────
  let insight_oculto: string;
  const diasComLead = tendencia.filter(d => Number(d.leads) > 0).length;
  const totalDias   = tendencia.length;

  if (totalDias > 0 && diasComLead / totalDias < 0.5 && leads > 0) {
    const pct = Math.round((diasComLead / totalDias) * 100);
    insight_oculto = `Os leads estão concentrados: apenas ${diasComLead} de ${totalDias} dias geraram conversões (${pct}% dos dias). Isso indica que o algoritmo ainda não estabilizou ou que existe uma variável de dia/hora — vale testar programação de anúncios nos dias mais eficientes.`;
  } else if (ctr > BM.ctr.bom && cpa > BM.cpa.medio) {
    insight_oculto = `Paradoxo: CTR acima de ${BM.ctr.bom}% (bom engajamento) com CPL acima de ${fmt(BM.cpa.medio)} (alto). Isso indica que o clique está chegando mas a landing page não está convertendo — o problema não é o anúncio, é o funil pós-clique. A LP pode ter: carregamento lento, CTA pouco claro, ou mensagem desalinhada com o anúncio.`;
  } else if (ctr < BM.ctr.medio && leads > 0) {
    insight_oculto = `CTR abaixo de ${BM.ctr.medio}% mas com leads sendo gerados — a LP está convertendo bem o pouco tráfego que chega. Isso significa que melhorar o CTR (criativo mais forte) pode gerar crescimento proporcional de leads sem mudar mais nada. Alto potencial de ganho de escala.`;
  } else if (campanhas.length > 1) {
    const sorted = [...campanhas].sort((a, b) => parseBRL(a.cpa) - parseBRL(b.cpa));
    const melhor = sorted.find(c => Number(c.leads) > 0);
    const pior   = [...sorted].reverse().find(c => Number(c.leads) > 0);
    if (melhor && pior && melhor.nome !== pior.nome) {
      insight_oculto = `Variação relevante entre campanhas: "${melhor.nome}" com CPL de ${melhor.cpa} vs "${pior.nome}" com ${pior.cpa}. Realocar budget da pior para a melhor pode dobrar o volume de leads mantendo o mesmo investimento total.`;
    } else {
      insight_oculto = `Com ${leads} lead(s) em ${fmt(spend)} de investimento, a taxa de conversão do seu funil está em ${leads > 0 && cliques > 0 ? ((leads / cliques) * 100).toFixed(2) : '0'}% do clique para lead. Benchmark B2B Meta: acima de 5% é forte.`;
    }
  } else {
    insight_oculto = `Com taxa de conversão de 20% dos leads qualificados em clientes, o foco deve ser aumentar VOLUME de entrada qualificada no funil — não taxa de conversão. Cada lead qualificado a mais representa 20% de chance de novo cliente.`;
  }

  // ── Meta próximo período ───────────────────────────────────────────────────
  let meta_proximo_periodo: string;
  if (leads === 0) {
    meta_proximo_periodo = 'Prioridade total: identificar e corrigir o gargalo técnico (pixel/LP). Meta: primeiro lead válido gerado. Zero otimização de budget antes disso.';
  } else if (nota_geral < 40) {
    meta_proximo_periodo = `Meta: reduzir CPL de ${fmt(cpa)} para abaixo de ${fmt(BM.cpa.medio)}. Ação: 1 novo criativo testado por semana com hipótese clara. Não alterar budget até CPL dentro do aceitável.`;
  } else if (nota_geral < 65) {
    meta_proximo_periodo = `Meta: elevar CTR para acima de ${BM.ctr.medio}% e CPL para abaixo de ${fmt(BM.cpa.bom)}. Testar 2 versões de criativo (ângulo dor + ângulo prova social). Revisão da LP com foco em qualificação B2B.`;
  } else if (nota_geral < 85) {
    meta_proximo_periodo = `Campanhas performando bem — foco em escala controlada. Meta: aumentar volume de leads em 30% mantendo CPL abaixo de ${fmt(BM.cpa.bom)}. Aumentar budget das melhores campanhas em 20% por semana. Criar audiência lookalike 1% dos leads convertidos.`;
  } else {
    meta_proximo_periodo = `Performance excelente — fase de expansão. Meta: duplicar volume de leads no período mantendo CPL. Ações: (1) Lookalike 2% para ampliar audiência; (2) Demand Gen em vídeo para meio de funil (YouTube/Discover); (3) LinkedIn Ads para capturar decisores B2B que ainda não conhecem a Mônaco.`;
  }

  // ── Diagnóstico geral ─────────────────────────────────────────────────────
  let diagnostico_geral: string;
  const notaTexto = nota_geral >= 80 ? 'excelente' : nota_geral >= 60 ? 'razoável' : nota_geral >= 40 ? 'abaixo do esperado' : 'crítico';
  if (leads === 0 && spend > 0) {
    diagnostico_geral = `Performance ${notaTexto} no período ${periodo}. Com ${fmt(spend)} investidos e zero leads gerados, há um gargalo técnico ou de funil que precisa ser resolvido antes de qualquer otimização de budget. CTR de ${vg.ctr_medio} e CPC de ${vg.cpc_medio} — o dinheiro está saindo mas não convertendo.`;
  } else {
    diagnostico_geral = `Performance ${notaTexto} no período ${periodo}: ${fmt(spend)} investidos, ${leads} lead${leads !== 1 ? 's' : ''} gerado${leads !== 1 ? 's' : ''}, CPL de ${fmt(cpa)}, CTR de ${vg.ctr_medio}. ${nota_geral >= 65 ? 'Funil funcionando — foco em escala e otimização de CPL.' : 'Espaço significativo de melhoria — prioridade em criativo e otimização de funil antes de escalar budget.'}`;
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

// ─── Route ────────────────────────────────────────────────────────────────────
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
        orcamento_diario: `R$${Number(a.daily_budget).toFixed(0)}`,
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
