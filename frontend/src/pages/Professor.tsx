import React, { useState } from 'react';
import { AlertCircle, CheckCircle, TrendingUp, TrendingDown, Info, Zap } from 'lucide-react';

interface Insight {
  category: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  metric: string;
  currentValue: number;
  expectedValue: number;
  explanation: string;
  whatItMeans: string;
  whyItMatters: string;
  whatToDo: string[];
  estimatedImpact: string;
}

interface Campaign {
  id: string;
  name: string;
  spend: number;
  leads: number;
  conversions: number;
  impressions: number;
  clicks: number;
  cpc: number;
  ctr: number;
  cpa: number;
  roas: number;
  roi: number;
  healthScore: number;
  status: 'Excelente' | 'Bom' | 'Atenção' | 'Crítico';
}

const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Clínica - Lipoaspiração',
    spend: 2000,
    leads: 50,
    conversions: 10,
    impressions: 100000,
    clicks: 2100,
    cpc: 0.95,
    ctr: 2.1,
    cpa: 40,
    roas: 3.2,
    roi: 220,
    healthScore: 95,
    status: 'Excelente',
  },
  {
    id: '2',
    name: 'Advocacia - Divórcio',
    spend: 1320,
    leads: 20,
    conversions: 2,
    impressions: 88000,
    clicks: 1320,
    cpc: 1.0,
    ctr: 1.5,
    cpa: 66,
    roas: 1.8,
    roi: 80,
    healthScore: 45,
    status: 'Atenção',
  },
  {
    id: '3',
    name: 'Imobiliária - Bairro X',
    spend: 1000,
    leads: 177,
    conversions: 8,
    impressions: 63214,
    clicks: 1768,
    cpc: 0.57,
    ctr: 2.8,
    cpa: 5.65,
    roas: 2.5,
    roi: 150,
    healthScore: 88,
    status: 'Excelente',
  },
];

const generateInsights = (campaign: Campaign): Insight[] => {
  const insights: Insight[] = [];

  // CPA Insight
  const cpaBad = campaign.cpa > 60;
  insights.push({
    category: 'CPA (Custo por Aquisição)',
    severity: cpaBad ? 'critical' : 'success',
    metric: `R$ ${campaign.cpa.toFixed(2)}`,
    currentValue: campaign.cpa,
    expectedValue: 40,
    explanation: `Você gastou R$ ${campaign.spend.toLocaleString('pt-BR')} e conseguiu ${campaign.leads} leads. Logo: R$ ${campaign.spend} ÷ ${campaign.leads} = R$ ${campaign.cpa.toFixed(2)} por lead`,
    whatItMeans: `Cada lead está custando R$ ${campaign.cpa.toFixed(2)}. Se seu alvo é R$ 40, você está ${cpaBad ? 'ACIMA' : 'ABAIXO'} do esperado.`,
    whyItMatters: `Se seu CPA é R$ ${campaign.cpa.toFixed(2)} e você vende por R$ 200: Margem = R$ ${(200 - campaign.cpa).toFixed(2)} (${cpaBad ? 'aperto demais' : 'lucro bom'})`,
    whatToDo: cpaBad
      ? [
          `❌ PROBLEMA: CPA de R$ ${campaign.cpa} > alvo de R$ 40`,
          `1️⃣ Verifique a QUALIDADE DOS LEADS: são realmente interessados?`,
          `2️⃣ Teste NOVO AUDIENCE: talvez seu público está errado`,
          `3️⃣ Mude o CRIATIVO: talvez ad não tá atraindo certo`,
        ]
      : [
          `✅ EXCELENTE: CPA de R$ ${campaign.cpa} ≤ alvo de R$ 40`,
          `📈 Próximo passo: AUMENTE O BUDGET para conseguir mais leads`,
        ],
    estimatedImpact: cpaBad
      ? `Reduzindo CPA de R$ ${campaign.cpa} para R$ 40: ${Math.round((campaign.cpa - 40) / campaign.cpa * 100)}% de melhoria`
      : `CPA ótimo. Aumento de 20% no budget = +${Math.round(campaign.leads * 0.2)} leads`,
  });

  // ROAS Insight
  const roasBad = campaign.roas < 2.5;
  insights.push({
    category: 'ROAS (Retorno do Investimento em Anúncios)',
    severity: roasBad ? 'critical' : 'success',
    metric: `${campaign.roas.toFixed(2)}x`,
    currentValue: campaign.roas,
    expectedValue: 2.5,
    explanation: `Você investiu R$ ${campaign.spend.toLocaleString('pt-BR')} e faturou R$ ${(campaign.spend * campaign.roas).toLocaleString('pt-BR')} em vendas`,
    whatItMeans: `Para cada R$ 1,00 que você gastou, você faturou R$ ${campaign.roas.toFixed(2)}. ${roasBad ? 'Está PERDENDO DINHEIRO' : 'Está LUCRANDO!'}`,
    whyItMatters: `ROAS é a MÉTRICA MAIS IMPORTANTE! Se ROAS = 2.5x: R$ 100 gasto = R$ 250 recebido = R$ 150 lucro`,
    whatToDo: roasBad
      ? [
          `🚨 CRÍTICO: ROAS ${campaign.roas.toFixed(2)}x < alvo 2.5x`,
          `⚠️ Você está recebendo menos do que gastou!`,
          `1️⃣ Aumente LANDING PAGE conversion`,
          `2️⃣ Melhore o PRODUTO/OFERTA`,
          `3️⃣ PAUSE em 3 dias se não melhorar`,
        ]
      : [
          `✅ EXCELENTE: ROAS ${campaign.roas.toFixed(2)}x > alvo 2.5x`,
          `💰 RECOMENDAÇÃO: AUMENTE O BUDGET em 30-50%`,
          `🎯 Essa campanha é uma MÁQUINA DE DINHEIRO!`,
        ],
    estimatedImpact: roasBad
      ? `Se melhorar ROAS de ${campaign.roas}x para 2.5x: +R$ ${(campaign.spend * (2.5 - campaign.roas)).toFixed(2)} ganho`
      : `Se aumentar budget em 30%: +R$ ${(campaign.spend * 0.3 * (campaign.roas - 1)).toFixed(2)} lucro`,
  });

  // CTR Insight
  const ctrBad = campaign.ctr < 1.5;
  insights.push({
    category: 'CTR (Taxa de Clique)',
    severity: ctrBad ? 'warning' : 'success',
    metric: `${campaign.ctr.toFixed(2)}%`,
    currentValue: campaign.ctr,
    expectedValue: 2.0,
    explanation: `Seu anúncio foi mostrado ${campaign.impressions.toLocaleString('pt-BR')} vezes. Pessoas clicaram ${campaign.clicks.toLocaleString('pt-BR')} vezes.`,
    whatItMeans: `De 100 pessoas que viram seu anúncio, ${campaign.ctr.toFixed(2)} clicaram. ${ctrBad ? 'Muito baixo!' : 'Legal!'}`,
    whatToDo: ctrBad
      ? [
          `⚠️ AVISO: CTR de ${campaign.ctr.toFixed(2)}% é baixo`,
          `1️⃣ TESTE HEADLINES: "Clique aqui", "Veja como"`,
          `2️⃣ MUDE A IMAGEM: cores vibrantes, pessoas`,
          `3️⃣ TESTE CALL-TO-ACTION diferentes`,
        ]
      : [
          `✅ BOM: CTR de ${campaign.ctr.toFixed(2)}% está acima da média`,
          `📈 Seu anúncio está atraindo bem!`,
        ],
    whyItMatters: `CTR baixo = anúncio não é atrativo. CTR alto = pessoas querem clicar.`,
    estimatedImpact: ctrBad
      ? `Se melhorar CTR de ${campaign.ctr}% para 2%: ${Math.round((2 - campaign.ctr) / campaign.ctr * 100)}% mais clicks`
      : `CTR ótimo. Foco agora em converter cliques`,
  });

  return insights;
};

export default function Professor() {
  const [selectedCampaignId, setSelectedCampaignId] = useState(mockCampaigns[0].id);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const selectedCampaign = mockCampaigns.find(c => c.id === selectedCampaignId)!;
  const insights = generateInsights(selectedCampaign);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Excelente':
        return 'bg-green-900/30 border-green-700 text-green-400';
      case 'Bom':
        return 'bg-blue-900/30 border-blue-700 text-blue-400';
      case 'Atenção':
        return 'bg-yellow-900/30 border-yellow-700 text-yellow-400';
      case 'Crítico':
        return 'bg-red-900/30 border-red-700 text-red-400';
      default:
        return 'bg-slate-900/30';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <TrendingDown className="w-5 h-5 text-yellow-400" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">🧠 Professor de Marketing</h1>
          </div>
          <p className="text-slate-400">Sistema inteligente que explica métricas e recomenda ações</p>
        </div>

        {/* Campaign Selector */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {mockCampaigns.map(campaign => (
            <button
              key={campaign.id}
              onClick={() => setSelectedCampaignId(campaign.id)}
              className={`p-4 rounded-lg border-2 transition ${
                selectedCampaignId === campaign.id
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              <div className="text-left">
                <h3 className="font-semibold text-white mb-2">{campaign.name}</h3>
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(campaign.status)}`}>
                  {campaign.status} ({campaign.healthScore}%)
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Health Score */}
        <div className="mb-8 bg-gradient-to-r from-slate-800 to-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">📊 Saúde da Campanha</h2>
            <div className={`text-5xl font-bold ${
              selectedCampaign.healthScore >= 80 ? 'text-green-400'
              : selectedCampaign.healthScore >= 60 ? 'text-blue-400'
              : selectedCampaign.healthScore >= 40 ? 'text-yellow-400'
              : 'text-red-400'
            }`}>
              {selectedCampaign.healthScore}%
            </div>
          </div>
          <p className="text-slate-300">
            {selectedCampaign.healthScore >= 80 && '🟢 Tudo certo! Continue assim.'}
            {selectedCampaign.healthScore >= 60 && selectedCampaign.healthScore < 80 && '🟡 Alguns ajustes necessários'}
            {selectedCampaign.healthScore >= 40 && selectedCampaign.healthScore < 60 && '🟠 Problemas identificados, revise'}
            {selectedCampaign.healthScore < 40 && '🔴 Crítico! Ação imediata necessária'}
          </p>
        </div>

        {/* Main Metrics Grid */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm mb-2">Spend</p>
            <p className="text-2xl font-bold text-white">R$ {selectedCampaign.spend.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm mb-2">Leads</p>
            <p className="text-2xl font-bold text-green-400">{selectedCampaign.leads}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm mb-2">CPA</p>
            <p className="text-2xl font-bold text-blue-400">R$ {selectedCampaign.cpa.toFixed(2)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm mb-2">ROAS</p>
            <p className="text-2xl font-bold text-purple-400">{selectedCampaign.roas.toFixed(2)}x</p>
          </div>
        </div>

        {/* Insights */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-4">📚 Análise Detalhada</h2>
          
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`rounded-lg border-2 overflow-hidden transition ${
                insight.severity === 'critical'
                  ? 'border-red-700 bg-red-900/10'
                  : insight.severity === 'warning'
                  ? 'border-yellow-700 bg-yellow-900/10'
                  : insight.severity === 'success'
                  ? 'border-green-700 bg-green-900/10'
                  : 'border-blue-700 bg-blue-900/10'
              }`}
            >
              {/* Header */}
              <button
                onClick={() =>
                  setExpandedMetric(expandedMetric === insight.category ? null : insight.category)
                }
                className="w-full p-4 flex items-center justify-between hover:bg-black/20 transition"
              >
                <div className="flex items-center gap-4 flex-1 text-left">
                  {getSeverityIcon(insight.severity)}
                  <div>
                    <h3 className="text-lg font-bold text-white">{insight.category}</h3>
                    <p className="text-sm text-slate-400">
                      {insight.metric} {insight.metric !== insight.expectedValue.toString() && `(alvo: ${insight.expectedValue})`}
                    </p>
                  </div>
                </div>
                <div className="text-slate-400">{expandedMetric === insight.category ? '▼' : '▶'}</div>
              </button>

              {/* Expanded Content */}
              {expandedMetric === insight.category && (
                <div className="border-t border-slate-700/50 p-4 space-y-4 bg-black/10">
                  {/* Explanation */}
                  <div>
                    <h4 className="font-semibold text-white mb-2">📖 O que significa?</h4>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{insight.whatItMeans}</p>
                  </div>

                  {/* Why it Matters */}
                  <div>
                    <h4 className="font-semibold text-white mb-2">⚡ Por que importa?</h4>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{insight.whyItMatters}</p>
                  </div>

                  {/* Actions */}
                  <div>
                    <h4 className="font-semibold text-white mb-2">✅ O que fazer?</h4>
                    <div className="space-y-2">
                      {insight.whatToDo.map((action, i) => (
                        <p key={i} className="text-slate-300 text-sm">{action}</p>
                      ))}
                    </div>
                  </div>

                  {/* Impact */}
                  <div>
                    <h4 className="font-semibold text-white mb-2">💰 Impacto Estimado</h4>
                    <p className="text-slate-300 text-sm">{insight.estimatedImpact}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Priority Actions */}
        <div className="mt-8 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg p-6 border border-blue-700/50">
          <h2 className="text-2xl font-bold text-white mb-4">🎯 Ações Prioritárias</h2>
          <div className="space-y-2">
            {selectedCampaign.roas > 3 && (
              <p className="text-green-400">💰 ESCALE: ROAS ${selectedCampaign.roas.toFixed(2)}x excelente! Aumente budget 30%</p>
            )}
            {selectedCampaign.roas < 1 && (
              <p className="text-red-400">🚨 PAUSE: ROAS ${selectedCampaign.roas.toFixed(2)}x está perdendo dinheiro!</p>
            )}
            {selectedCampaign.cpa > 60 && (
              <p className="text-yellow-400">⚠️ REVISAR: CPA R$ ${selectedCampaign.cpa.toFixed(2)} acima do alvo</p>
            )}
            {selectedCampaign.ctr < 1.5 && (
              <p className="text-yellow-400">📝 TESTE: CTR ${selectedCampaign.ctr.toFixed(2)}% baixo, mude criativo</p>
            )}
            {!selectedCampaign.roas || selectedCampaign.roas >= 1 && selectedCampaign.roas <= 3 && selectedCampaign.cpa <= 60 && selectedCampaign.ctr >= 1.5 && (
              <p className="text-blue-400">✅ MONITOR: Campanha estável, continue acompanhando</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
