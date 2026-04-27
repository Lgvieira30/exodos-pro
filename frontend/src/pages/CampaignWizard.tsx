import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Zap } from 'lucide-react';

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface CampaignData {
  niche: string;
  objective: string;
  ageMin: string;
  ageMax: string;
  gender: string;
  interests: string[];
  budget: string;
  platform: string[];
  cta: string;
}

export default function CampaignWizard() {
  const [step, setStep] = useState<WizardStep>(1);
  const [campaignData, setCampaignData] = useState<CampaignData>({
    niche: '',
    objective: '',
    ageMin: '25',
    ageMax: '55',
    gender: 'both',
    interests: [],
    budget: '100',
    platform: [],
    cta: 'contact',
  });

  const handleNext = () => {
    if (step < 5) setStep((step + 1) as WizardStep);
  };

  const handlePrev = () => {
    if (step > 1) setStep((step - 1) as WizardStep);
  };

  const handleComplete = () => {
    console.log('Campanha criada:', campaignData);
    alert('✅ Campanha criada com sucesso!');
    // Aqui você faria um POST para o backend
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🚀 Criar Campanha</h1>
          <p className="text-slate-400">Passo {step} de 5</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition ${
                  s <= step ? 'bg-blue-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Wizard Content */}
        <div className="bg-slate-800 rounded-lg p-8 mb-8">
          {/* Step 1: Niche */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-white font-semibold mb-3">Qual é o nicho?</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Clínica/Estética', 'Advocacia', 'Imobiliária', 'E-commerce', 'Outro'].map(
                    (option) => (
                      <button
                        key={option}
                        onClick={() => setCampaignData({ ...campaignData, niche: option })}
                        className={`p-4 rounded-lg border-2 transition ${
                          campaignData.niche === option
                            ? 'border-blue-500 bg-blue-900/30 text-white'
                            : 'border-slate-600 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {option}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Objective */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-white font-semibold mb-3">Qual é seu objetivo?</label>
                <div className="space-y-3">
                  {['Aumentar leads', 'Aumentar vendas', 'Aumentar agendamentos'].map(
                    (option) => (
                      <button
                        key={option}
                        onClick={() => setCampaignData({ ...campaignData, objective: option })}
                        className={`w-full p-4 rounded-lg border-2 text-left transition ${
                          campaignData.objective === option
                            ? 'border-blue-500 bg-blue-900/30 text-white'
                            : 'border-slate-600 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {option}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Audience */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-white font-semibold text-lg">Defina seu público</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm mb-2">Idade mínima</label>
                  <input
                    type="number"
                    value={campaignData.ageMin}
                    onChange={(e) =>
                      setCampaignData({ ...campaignData, ageMin: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-2">Idade máxima</label>
                  <input
                    type="number"
                    value={campaignData.ageMax}
                    onChange={(e) =>
                      setCampaignData({ ...campaignData, ageMax: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-2">Gênero</label>
                <select
                  value={campaignData.gender}
                  onChange={(e) => setCampaignData({ ...campaignData, gender: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="both">Ambos</option>
                  <option value="male">Homem</option>
                  <option value="female">Mulher</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-2">Interesses</label>
                <input
                  type="text"
                  placeholder="Ex: beleza, saúde, wellness"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
                />
              </div>
            </div>
          )}

          {/* Step 4: Budget & Platform */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <label className="block text-white font-semibold mb-3">Budget diário</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={campaignData.budget}
                    onChange={(e) => setCampaignData({ ...campaignData, budget: e.target.value })}
                    className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                  <span className="text-white self-center">R$</span>
                </div>
              </div>

              <div>
                <label className="block text-white font-semibold mb-3">Plataformas</label>
                <div className="space-y-2">
                  {['Meta Ads', 'Google Ads', 'LinkedIn'].map((platform) => (
                    <label key={platform} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={campaignData.platform.includes(platform)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCampaignData({
                              ...campaignData,
                              platform: [...campaignData.platform, platform],
                            });
                          } else {
                            setCampaignData({
                              ...campaignData,
                              platform: campaignData.platform.filter((p) => p !== platform),
                            });
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-white">{platform}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: CTA & Review */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <label className="block text-white font-semibold mb-3">Botão CTA</label>
                <select
                  value={campaignData.cta}
                  onChange={(e) => setCampaignData({ ...campaignData, cta: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="contact">Entrar em contato</option>
                  <option value="learn">Saiba mais</option>
                  <option value="buy">Comprar</option>
                  <option value="schedule">Agendar</option>
                </select>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                <h3 className="text-white font-semibold">Resumo da campanha:</h3>
                <div className="text-slate-300 text-sm space-y-1">
                  <p>📊 Nicho: {campaignData.niche}</p>
                  <p>🎯 Objetivo: {campaignData.objective}</p>
                  <p>👥 Público: {campaignData.ageMin}-{campaignData.ageMax} anos</p>
                  <p>💰 Budget: R$ {campaignData.budget}/dia</p>
                  <p>🌐 Plataformas: {campaignData.platform.join(', ')}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handlePrev}
            disabled={step === 1}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
              step === 1
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </button>

          {step < 5 ? (
            <button
              onClick={handleNext}
              className="flex-1 px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2 transition"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex-1 px-6 py-3 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2 transition"
            >
              <Zap className="w-4 h-4" />
              Criar Campanha
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
