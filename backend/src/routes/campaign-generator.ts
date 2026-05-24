import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const campaignGeneratorRouter = Router();
campaignGeneratorRouter.use(requireAuth);

interface Keyword { term: string; match_type: 'exact' | 'phrase' | 'broad'; }
interface Sitelink { title: string; description1: string; description2: string; }
interface AdGroup {
  name: string;
  theme: string;
  keywords: Keyword[];
  negative_keywords: string[];
  headlines: string[];
  descriptions: string[];
  sitelinks: Sitelink[];
}
interface Campaign {
  campaign_name: string;
  objective: string;
  bidding_strategy: string;
  budget_recommendation: { total_monthly: number; distribution_notes: string };
  ad_groups: AdGroup[];
  export_tips: string;
}

function generateMonaco(budget: number): Campaign {
  return {
    campaign_name: 'Mônaco Gestão Documental - Frota B2B',
    objective: 'Captação de leads qualificados: gestores de frota B2B com 100+ veículos',
    bidding_strategy: 'Maximizar conversões (leads) com CPA alvo de R$ 80–150. Iniciar com Maximizar Cliques nas 2 primeiras semanas para coletar dados.',
    budget_recommendation: {
      total_monthly: budget || 5000,
      distribution_notes: 'Distribuir 40% para grupo Passivo Oculto, 25% CNH/Corresponsabilidade, 20% Multa NIC/CADIN, 15% restante entre os demais grupos.',
    },
    ad_groups: [
      {
        name: 'Passivo Oculto de Frota',
        theme: 'Dor silenciosa: passivo financeiro invisível acumulado na frota',
        keywords: [
          { term: 'passivo oculto frota', match_type: 'exact' },
          { term: 'multas ocultas veículos empresa', match_type: 'phrase' },
          { term: 'débitos não identificados frota', match_type: 'phrase' },
          { term: 'passivo financeiro frota', match_type: 'broad' },
          { term: 'auditoria débitos frota', match_type: 'phrase' },
          { term: 'levantamento multas frota empresarial', match_type: 'broad' },
        ],
        negative_keywords: ['individual', 'pessoa física', 'carro próprio', 'grátis', 'download', 'carteira motorista'],
        headlines: [
          'R$ 4,6M em Débitos Ocultos',
          'Passivo Oculto na Sua Frota?',
          'Diagnóstico Gratuito de Frota',
          'Mônaco: 27 Anos de Gestão',
          '180 Mil Veículos Gerenciados',
          'Encontramos o que Você Não Vê',
          'Audite Sua Frota Agora',
          'Multas Que Dobram de Valor',
          'R$ 925k Economizados em 3M',
          'Frota 100+ Veículos? Fale',
          'Zero Surpresa no Detran',
          'Gestão Documental de Frota',
          '5 Unidades em Todo Brasil',
          'Cimed, Heineken, Cargill',
          '45 Dias Antes do Detran',
        ],
        descriptions: [
          'Identificamos R$ 4,6M em débitos ocultos para frotas B2B. Solicite o diagnóstico gratuito e veja o passivo real da sua frota.',
          'R$ 925k economizados em 3 meses para um cliente. Frota com 100+ veículos acumula passivo invisível. Veja o seu.',
          'Cases: Cimed, Heineken, Cargill, Copel. 27 anos auditando frotas. Solicite o diagnóstico gratuito sem compromisso.',
          'Multas não tratadas dobram de valor via NIC. Encontramos o passivo antes que chegue ao CADIN. Diagnóstico gratuito.',
        ],
        sitelinks: [
          { title: 'Diagnóstico Gratuito', description1: 'Levantamento completo da sua frota', description2: 'Sem compromisso, resultado em 5 dias' },
          { title: 'Cases de Sucesso', description1: 'Cimed, Heineken, Philip Morris', description2: 'Resultados reais, números verificáveis' },
          { title: 'Como Funciona', description1: 'Auditoria completa de débitos', description2: 'Multas, CNH, CADIN, SNE' },
          { title: 'Sobre a Mônaco', description1: '27 anos, 180 mil veículos', description2: '5 unidades no Brasil' },
        ],
      },
      {
        name: 'CNH e Corresponsabilidade',
        theme: 'Risco jurídico: empresa é corresponsável por motorista com CNH vencida',
        keywords: [
          { term: 'cnh motorista vencida empresa', match_type: 'exact' },
          { term: 'corresponsabilidade cnh frota', match_type: 'phrase' },
          { term: 'controle cnh motorista frota', match_type: 'phrase' },
          { term: 'gestão cnh frota empresarial', match_type: 'broad' },
          { term: 'monitoramento habilitação motoristas', match_type: 'phrase' },
          { term: 'risco jurídico cnh vencida frota', match_type: 'broad' },
        ],
        negative_keywords: ['renovar cnh', 'tirar cnh', 'primeira habilitação', 'auto escola', 'simulado detran'],
        headlines: [
          'CNH Vencida = Sua Empresa Paga',
          'Corresponsabilidade Jurídica',
          'Controle CNH Motoristas',
          'Alerta 45 Dias Antes',
          'Mônaco: Gestão de CNH',
          'Risco Oculto na Sua Frota',
          'Motorista Irregular? Você Paga',
          'Diagnóstico Gratuito de Frota',
          '27 Anos Gerenciando Frotas',
          'Evite Autuação por CNH',
          'Monitoramento de Habilitação',
          '180 Mil Veículos Controlados',
          'Philip Morris: 9 Anos Conosco',
          'Frota Segura e Regularizada',
          'Fale com Especialista Agora',
        ],
        descriptions: [
          'Empresa é corresponsável quando motorista com CNH vencida causa acidente. Mônaco alerta 45 dias antes do vencimento.',
          'Cimed reduziu 82% do tempo de captação com gestão Mônaco. Controle CNH, multas e documentos em uma plataforma.',
          'Philip Morris confia na Mônaco há 9 anos. 180 mil veículos gerenciados. Solicite o diagnóstico gratuito da sua frota.',
          'Corresponsabilidade jurídica por CNH irregular pode custar muito mais que a gestão preventiva. Diagnóstico gratuito.',
        ],
        sitelinks: [
          { title: 'Alerta de CNH', description1: 'Aviso 45 dias antes do vencimento', description2: 'Para cada motorista da frota' },
          { title: 'Risco Jurídico', description1: 'Entenda a corresponsabilidade', description2: 'Material técnico gratuito' },
          { title: 'Diagnóstico Gratuito', description1: 'Auditoria completa em 5 dias', description2: 'CNH, multas, CADIN, SNE' },
          { title: 'Cases B2B', description1: 'Cimed, Heineken, Philip Morris', description2: 'Resultados mensuráveis' },
        ],
      },
      {
        name: 'Multa NIC e CADIN',
        theme: 'Urgência: multa NIC dobra de valor e lança empresa no CADIN/SNE',
        keywords: [
          { term: 'multa nic frota', match_type: 'exact' },
          { term: 'cadin empresa multa veículos', match_type: 'phrase' },
          { term: 'sne perdido frota empresarial', match_type: 'phrase' },
          { term: 'regularizar multas frota', match_type: 'broad' },
          { term: 'notificação infração não recebida frota', match_type: 'broad' },
          { term: 'multa vencida empresa frota', match_type: 'phrase' },
        ],
        negative_keywords: ['multa cpf', 'multa pessoal', 'recurso multa', 'indicação condutor', 'detran individual'],
        headlines: [
          'Multa NIC Dobra Seu Valor',
          'CADIN: Evite Seu Nome Sujo',
          'SNE Perdido? Rastreamos',
          'Frota no CADIN = Crédito Bloq.',
          'Regularize Antes do Detran',
          '45 Dias de Antecedência',
          'R$ 4,6M em Débitos Achados',
          'Mônaco Acha o Que Sumiu',
          'Gestão Documental B2B',
          'Diagnóstico Gratuito Frota',
          'Zero Surpresa em Autuação',
          '27 Anos de Experiência',
          'Cargill Confia na Mônaco',
          '5 Unidades, Todo Brasil',
          'Fale com Nosso Especialista',
        ],
        descriptions: [
          'Multa NIC não tratada dobra de valor e lança empresa no CADIN. Identificamos R$ 4,6M em débitos para clientes B2B.',
          'SNE perdido bloqueia crédito empresarial. Rastreamos notificações antes que virem problema. Diagnóstico gratuito.',
          'R$ 925k economizados em 3 meses: débitos identificados e tratados antes do prazo. Solicite o diagnóstico da sua frota.',
          'Cargill, Copel e Heineken confiam na Mônaco. 27 anos regularizando frotas B2B. Diagnóstico gratuito, resultado em 5 dias.',
        ],
        sitelinks: [
          { title: 'O Que é NIC', description1: 'Como a multa dobra de valor', description2: 'E como evitar' },
          { title: 'Rastreio de SNE', description1: 'Encontramos notificações perdidas', description2: 'Antes que virem CADIN' },
          { title: 'Diagnóstico Gratuito', description1: 'Levantamento completo de débitos', description2: 'Sem compromisso' },
          { title: 'Resultados Reais', description1: 'R$ 925k economizados em 3 meses', description2: 'R$ 4,6M em débitos achados' },
        ],
      },
      {
        name: 'Gestão Documental de Frota',
        theme: 'Solução: plataforma completa de gestão documental para frota B2B',
        keywords: [
          { term: 'gestão documental frota empresarial', match_type: 'exact' },
          { term: 'sistema gestão frota documentos', match_type: 'phrase' },
          { term: 'software gestão frota b2b', match_type: 'phrase' },
          { term: 'gestão frota transportadora', match_type: 'broad' },
          { term: 'gestão frota locadora veículos', match_type: 'broad' },
          { term: 'terceirizar gestão documental frota', match_type: 'phrase' },
        ],
        negative_keywords: ['rastreamento gps', 'telemetria', 'manutenção frota', 'abastecimento', 'frota pequena', 'até 10 veículos'],
        headlines: [
          'Gestão Documental de Frota',
          'Tudo Centralizado em 1 Lugar',
          '180 Mil Veículos Gerenciados',
          'Para Frotas de 100+ Veículos',
          'Mônaco: Referência Nacional',
          'Multas, CNH e Docs em 1 View',
          'Cimed: -82% Tempo de Gestão',
          'Diagnóstico Gratuito Hoje',
          'Transportadoras e Locadoras',
          '27 Anos de Especialização',
          'Distribuidoras Confiam Aqui',
          'Sem Surpresa, Sem Passivo',
          'Philip Morris: 9 Anos Cliente',
          '5 Unidades para Te Atender',
          'Solicite Proposta Agora',
        ],
        descriptions: [
          'Plataforma completa: multas, CNH, CADIN, SNE e documentos em uma única visão. Para frotas B2B de 100+ veículos.',
          'Cimed reduziu 82% do tempo de captação de dados. Heineken, Cargill, Philip Morris usam Mônaco. Diagnóstico gratuito.',
          '27 anos especializados em gestão documental de frota. 180 mil veículos sob gestão. 5 unidades no Brasil. Fale conosco.',
          'Transportadoras, locadoras e distribuidoras: gestão documental completa, sem surpresas e sem passivo oculto.',
        ],
        sitelinks: [
          { title: 'Para Transportadoras', description1: 'Gestão completa de frota pesada', description2: 'ANTT, multas, CNH motoristas' },
          { title: 'Para Locadoras', description1: 'Controle total de débitos', description2: 'Por veículo e por locatário' },
          { title: 'Plataforma Demo', description1: 'Veja como funciona', description2: 'Agende demonstração' },
          { title: 'Proposta Comercial', description1: 'Preço por veículo gerenciado', description2: 'Contratos flexíveis' },
        ],
      },
      {
        name: 'Diagnóstico e Captação',
        theme: 'Fundo de funil: quem já pesquisa solução e está pronto para converter',
        keywords: [
          { term: 'diagnóstico gratuito gestão frota', match_type: 'exact' },
          { term: 'auditoria frota empresarial gratuita', match_type: 'phrase' },
          { term: 'levantamento débitos frota', match_type: 'phrase' },
          { term: 'consultor gestão frota b2b', match_type: 'broad' },
          { term: 'monaco gestão frota', match_type: 'broad' },
          { term: 'empresa gestão documental frota', match_type: 'phrase' },
        ],
        negative_keywords: ['como fazer', 'tutorial', 'planilha grátis', 'excel frota', 'app gratuito'],
        headlines: [
          'Diagnóstico Gratuito de Frota',
          'Resultado em 5 Dias Úteis',
          'Sem Compromisso de Contrato',
          'Veja Seu Passivo Real Agora',
          'Mônaco: Fale com Especialista',
          'Auditoria Completa da Frota',
          'CNH + Multas + CADIN + SNE',
          'Quantos Débitos Você Tem?',
          '180 Mil Veículos Auditados',
          'Resposta Rápida Garantida',
          'Formulário Leva 2 Minutos',
          'Cases: Heineken, Copel',
          '27 Anos de Confiança B2B',
          'Solicite Agora Sem Custo',
          'Especialistas Disponíveis',
        ],
        descriptions: [
          'Diagnóstico gratuito: levantamos multas, CNH, CADIN e SNE de toda sua frota em 5 dias úteis. Sem compromisso de contrato.',
          'Média de R$ 925k em débitos ocultos identificados por cliente B2B. Saiba o real passivo da sua frota. É gratuito.',
          'Preencha o formulário em 2 minutos. Nossa equipe entra em contato e apresenta o diagnóstico completo sem custo.',
          'Cimed, Heineken, Cargill e Philip Morris já fizeram. 27 anos de expertise em frota B2B. Solicite o diagnóstico hoje.',
        ],
        sitelinks: [
          { title: 'Solicitar Diagnóstico', description1: 'Formulário rápido, 2 minutos', description2: 'Resposta em até 24h' },
          { title: 'O Que Analisamos', description1: 'Multas, CNH, CADIN, SNE, docs', description2: 'Relatório detalhado por veículo' },
          { title: 'Depoimentos', description1: 'O que nossos clientes dizem', description2: 'Cases com números reais' },
          { title: 'Nossa Equipe', description1: 'Especialistas em frota B2B', description2: '5 unidades no Brasil' },
        ],
      },
    ],
    export_tips: 'No Google Ads Editor: importe o CSV gerado, revise os títulos no campo "Headline" e as descrições em "Description". Configure extensões de sitelink no nível da campanha. Para a estratégia de lance, comece com "Maximizar Cliques" e troque para "CPA Desejado" após 30–50 conversões. Ative os grupos de alto intento (Diagnóstico + Passivo Oculto) primeiro e pause os demais até ter dados.',
  };
}

function generateGeneric(params: {
  empresa: string;
  produto: string;
  objetivo: string;
  publico_alvo: string;
  diferenciais: string;
  provas_sociais: string;
  budget: number;
  regiao: string;
  cta: string;
}): Campaign {
  const { empresa, produto, objetivo, publico_alvo, diferenciais, budget, regiao, cta } = params;

  const slug = (s: string) => s.slice(0, 20);
  const emp = slug(empresa);
  const prod = slug(produto);

  return {
    campaign_name: `${empresa} - ${produto} - Google Search`,
    objective: objetivo,
    bidding_strategy: 'Maximizar conversões. Iniciar com Maximizar Cliques por 2 semanas para coletar dados históricos antes de ativar CPA alvo.',
    budget_recommendation: {
      total_monthly: budget || 3000,
      distribution_notes: `Distribuir orçamento entre 4–5 grupos de anúncio. Priorizar grupos de intenção alta (fundo de funil). Região: ${regiao}.`,
    },
    ad_groups: [
      {
        name: `${prod} - Intenção Alta`,
        theme: 'Buscas de fundo de funil — quem já quer comprar/contratar',
        keywords: [
          { term: `${produto} ${regiao}`, match_type: 'phrase' },
          { term: `contratar ${produto}`, match_type: 'phrase' },
          { term: `${produto} empresa`, match_type: 'phrase' },
          { term: `melhor ${produto}`, match_type: 'broad' },
          { term: `${produto} b2b`, match_type: 'broad' },
        ],
        negative_keywords: ['grátis', 'gratuito', 'como fazer', 'tutorial', 'download', 'diy', 'planilha'],
        headlines: [
          slug(`${emp} - Solicite Agora`),
          slug(`${prod} Especializado`),
          `${cta || 'Fale Conosco'}`.slice(0, 30),
          slug(`Para Empresas de ${regiao}`),
          slug(diferenciais.split(',')[0] || 'Alta Performance'),
          'Resultado Comprovado',
          slug(`${emp}: Referência`),
          'Fale com Especialista',
          slug(`${prod} Sob Medida`),
          'Orçamento em 24h',
          'Atendimento Dedicado',
          slug(`${emp} Desde o Início`),
          'Sem Burocracia',
          'Proposta Rápida',
          slug(`${prod} que Funciona`),
        ],
        descriptions: [
          `${empresa} oferece ${produto} para ${publico_alvo}. ${cta || 'Solicite proposta agora'} e receba retorno em até 24 horas.`,
          `${diferenciais ? diferenciais.slice(0, 80) : `Especialistas em ${produto} com foco em resultado.`} ${cta || 'Fale conosco'}.`,
          `Atendemos ${regiao}. ${params.provas_sociais ? params.provas_sociais.slice(0, 60) : `${produto} para empresas de todos os tamanhos.`}`,
          `${objetivo}. ${cta || 'Entre em contato'} e descubra como podemos ajudar sua empresa a crescer.`,
        ],
        sitelinks: [
          { title: 'Solicitar Proposta', description1: 'Orçamento em até 24 horas', description2: 'Sem compromisso' },
          { title: 'Sobre Nós', description1: `${empresa} - quem somos`, description2: 'Nossa história e equipe' },
          { title: 'Cases de Sucesso', description1: 'Resultados reais de clientes', description2: 'Números verificáveis' },
          { title: 'Fale Conosco', description1: 'Atendimento especializado', description2: 'Resposta rápida garantida' },
        ],
      },
      {
        name: `${prod} - Problema/Dor`,
        theme: 'Buscas de meio de funil — quem tem o problema mas ainda avalia soluções',
        keywords: [
          { term: `problema ${produto}`, match_type: 'broad' },
          { term: `como resolver ${produto}`, match_type: 'phrase' },
          { term: `dificuldade com ${produto}`, match_type: 'broad' },
          { term: `solução ${produto} empresa`, match_type: 'phrase' },
          { term: `ajuda ${produto} b2b`, match_type: 'broad' },
        ],
        negative_keywords: ['grátis', 'como fazer', 'tutorial', 'diy', 'planilha excel', 'download'],
        headlines: [
          slug(`Dificuldade com ${prod}?`),
          'Nós Resolvemos Isso',
          slug(`${emp}: Especialista`),
          slug(`${prod} sem Complicação`),
          'Fale com Quem Entende',
          slug(`Solução para ${prod}`),
          `${cta || 'Diagnóstico Grátis'}`.slice(0, 30),
          'Resultado em Semanas',
          slug(diferenciais.split(',')[0] || 'Experiência Comprovada'),
          'Atendimento Personalizado',
          'Sem Contrato Longo',
          slug(`${emp} Te Ajuda`),
          'Mais de 100 Clientes',
          'Processo Simples',
          slug(`${prod} Certo Para Você`),
        ],
        descriptions: [
          `Problemas com ${produto}? A ${empresa} tem a solução para ${publico_alvo}. ${cta || 'Fale com especialista'} agora.`,
          `${diferenciais ? diferenciais.slice(0, 85) : `Especialistas em ${produto} com resultado comprovado.`}`,
          `Atendemos ${regiao} com foco em ${objetivo.slice(0, 60)}. Solicite diagnóstico gratuito.`,
          `${params.provas_sociais ? params.provas_sociais.slice(0, 85) : `Seu ${produto} com qualidade e agilidade. Peça sua proposta.`}`,
        ],
        sitelinks: [
          { title: 'Como Funciona', description1: 'Processo simples e rápido', description2: 'Do diagnóstico ao resultado' },
          { title: 'Diferenciais', description1: diferenciais.slice(0, 35) || 'Por que nos escolher', description2: 'Veja o que nos diferencia' },
          { title: 'Depoimentos', description1: 'O que nossos clientes dizem', description2: 'Cases com números reais' },
          { title: slug(`Contratar ${prod}`), description1: 'Proposta rápida e sem burocracia', description2: 'Retorno em 24 horas' },
        ],
      },
      {
        name: `${emp} - Marca`,
        theme: 'Branded — quem já conhece a empresa e busca diretamente',
        keywords: [
          { term: empresa.toLowerCase(), match_type: 'exact' },
          { term: `${empresa.toLowerCase()} ${produto.toLowerCase()}`, match_type: 'phrase' },
          { term: `site ${empresa.toLowerCase()}`, match_type: 'phrase' },
        ],
        negative_keywords: [],
        headlines: [
          slug(`${emp} - Site Oficial`),
          slug(`${prod} pela ${emp}`),
          `${cta || 'Fale Conosco'}`.slice(0, 30),
          'Site Oficial',
          slug(`${emp}: Solicite Proposta`),
          'Atendimento Imediato',
          slug(`${emp}: ${prod}`),
          'Resposta em 24 Horas',
          'Fale com Especialista',
          slug(`${emp} - ${regiao}`),
          'Acesse o Site Oficial',
          'Orçamento Gratuito',
          slug(`${emp}: Referência`),
          'Proposta Personalizada',
          slug(`${emp} - Conheça`),
        ],
        descriptions: [
          `Site oficial da ${empresa}. ${produto} para ${publico_alvo}. ${cta || 'Solicite sua proposta agora'}.`,
          `${empresa}: referência em ${produto} para ${regiao}. Atendimento especializado e resposta rápida. Fale conosco.`,
          `${diferenciais ? diferenciais.slice(0, 85) : `${empresa} - qualidade e resultado em ${produto}.`}`,
          `${params.provas_sociais ? params.provas_sociais.slice(0, 85) : `${empresa}: proposta personalizada e sem burocracia. Orçamento gratuito.`}`,
        ],
        sitelinks: [
          { title: 'Página Inicial', description1: `Site oficial ${empresa}`, description2: 'Conheça todos os serviços' },
          { title: slug(`Contratar ${prod}`), description1: 'Formulário rápido', description2: 'Retorno em até 24h' },
          { title: 'Sobre a Empresa', description1: `Quem é a ${empresa}`, description2: 'Nossa história e valores' },
          { title: 'Contato Direto', description1: 'Fale com nosso time', description2: 'Atendimento personalizado' },
        ],
      },
      {
        name: `${prod} - Concorrência`,
        theme: 'Conquista — quem busca concorrentes mas pode ser convertido',
        keywords: [
          { term: `alternativa ${produto}`, match_type: 'broad' },
          { term: `melhor empresa ${produto}`, match_type: 'phrase' },
          { term: `comparar ${produto} empresas`, match_type: 'broad' },
          { term: `trocar fornecedor ${produto}`, match_type: 'broad' },
        ],
        negative_keywords: ['grátis', 'download', 'open source', 'planilha', 'tutorial'],
        headlines: [
          slug(`Melhor Opção em ${prod}`),
          slug(`${emp}: Compare e Veja`),
          'Mude para o Melhor',
          slug(`${prod}: ${emp}`),
          'Resultados Superiores',
          `${cta || 'Solicite Proposta'}`.slice(0, 30),
          'Sem Fidelidade Forçada',
          slug(`Por que ${emp}?`),
          slug(diferenciais.split(',')[0] || 'Diferencial Real'),
          'Migração Assistida',
          'Atendimento Premium',
          'Compare os Resultados',
          slug(`${emp}: Qualidade`),
          'Proposta em 24h',
          'Troque Hoje Mesmo',
        ],
        descriptions: [
          `Insatisfeito com seu atual fornecedor de ${produto}? Compare com a ${empresa} e veja a diferença em resultados.`,
          `${diferenciais ? diferenciais.slice(0, 85) : `${empresa}: ${produto} com qualidade e resultado mensuráveis.`}`,
          `Migração assistida, sem burocracia. Atendemos ${regiao}. ${cta || 'Solicite proposta'} e compare.`,
          `${params.provas_sociais ? params.provas_sociais.slice(0, 85) : `${empresa}: a escolha de quem busca resultado real em ${produto}.`}`,
        ],
        sitelinks: [
          { title: 'Por Que Trocar', description1: 'O que nos diferencia', description2: 'Veja os diferenciais reais' },
          { title: 'Cases Reais', description1: 'Clientes que migraram', description2: 'Resultados depois da mudança' },
          { title: 'Migração Fácil', description1: 'Processo sem burocracia', description2: 'Suporte completo na transição' },
          { title: 'Solicitar Proposta', description1: 'Compare sem compromisso', description2: 'Resposta em até 24h' },
        ],
      },
    ],
    export_tips: `No Google Ads Editor: importe o CSV, verifique cada título (máx 30 chars) e descrição (máx 90 chars) na aba de anúncios RSA. Configure sitelinks no nível da campanha ou grupo. Estratégia recomendada: ative os grupos "Intenção Alta" e "Marca" primeiro. Após 50+ conversões, ative CPA alvo. Região configurada: ${regiao}.`,
  };
}

campaignGeneratorRouter.post('/', (req: AuthRequest, res: Response) => {
  const {
    empresa,
    segmento,
    produto,
    objetivo,
    diferenciais = '',
    provas_sociais = '',
    budget_mensal,
    regiao = 'Brasil',
    cta = 'Fale com especialista',
    publico_alvo = 'gestores e decisores B2B',
  } = req.body;

  if (!empresa || !produto || !objetivo) {
    res.status(400).json({ success: false, error: { message: 'empresa, produto e objetivo são obrigatórios' } });
    return;
  }

  const budget = budget_mensal ? Number(budget_mensal) : 0;

  const campaign =
    segmento === 'monaco-frota'
      ? generateMonaco(budget)
      : generateGeneric({ empresa, produto, objetivo, publico_alvo, diferenciais, provas_sociais, budget, regiao, cta });

  res.json({ success: true, data: { campaign } });
});
