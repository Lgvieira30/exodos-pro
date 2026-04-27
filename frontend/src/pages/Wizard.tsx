import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignsApi } from '../lib/api';
import { CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';

const STEPS = ['Plataforma', 'Objetivo', 'Orçamento', 'Datas', 'Confirmar'];

interface FormData {
  name: string;
  platform: 'meta' | 'google' | 'linkedin' | '';
  objective: 'leads' | 'sales' | 'awareness' | '';
  budget: string;
  start_date: string;
  end_date: string;
}

export default function Wizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormData>({
    name: '',
    platform: '',
    objective: '',
    budget: '',
    start_date: '',
    end_date: '',
  });

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  }

  function canAdvance() {
    if (step === 0) return form.name.length >= 2 && form.platform !== '';
    if (step === 1) return form.objective !== '';
    if (step === 2) return Number(form.budget) > 0;
    if (step === 3) return true;
    return true;
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      await campaignsApi.create({
        name: form.name,
        platform: form.platform,
        objective: form.objective,
        budget: Number(form.budget),
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
      });
      navigate('/');
    } catch {
      setError('Erro ao criar campanha. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Nova Campanha</h2>
        <p className="text-slate-400 mt-1">Passo {step + 1} de {STEPS.length}</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                i < step ? 'bg-blue-600 border-blue-600 text-white' :
                i === step ? 'border-blue-500 text-blue-400' :
                'border-slate-700 text-slate-600'
              }`}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className="text-xs mt-1 text-slate-500 hidden md:block">{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 transition-colors ${i < step ? 'bg-blue-600' : 'bg-slate-700'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Conteúdo dos passos */}
      <div className="bg-slate-800 rounded-xl p-6 min-h-[280px]">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Nome da campanha</label>
              <input
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                placeholder="Ex: Clínica - Lipoaspiração Agosto"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Plataforma</label>
              <div className="grid grid-cols-3 gap-3">
                {(['meta', 'google', 'linkedin'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => update('platform', p)}
                    className={`p-3 rounded-lg border-2 capitalize font-medium transition-colors ${
                      form.platform === p ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {p === 'meta' ? 'Meta Ads' : p === 'google' ? 'Google Ads' : 'LinkedIn'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-4">Objetivo da campanha</label>
            <div className="space-y-3">
              {[
                { value: 'leads', label: 'Geração de Leads', desc: 'Capturar contatos qualificados' },
                { value: 'sales', label: 'Vendas', desc: 'Converter em compras diretas' },
                { value: 'awareness', label: 'Alcance e Reconhecimento', desc: 'Aumentar visibilidade da marca' },
              ].map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => update('objective', value)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                    form.objective === value ? 'border-blue-500 bg-blue-500/20' : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <p className="font-medium text-white">{label}</p>
                  <p className="text-sm text-slate-400 mt-1">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Orçamento total (R$)</label>
            <input
              type="number"
              min="1"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
              placeholder="Ex: 5000"
              value={form.budget}
              onChange={(e) => update('budget', e.target.value)}
            />
            {form.budget && Number(form.budget) > 0 && (
              <p className="text-slate-400 text-sm mt-2">
                ≈ R$ {(Number(form.budget) / 30).toFixed(2)}/dia por 30 dias
              </p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Data de início (opcional)</label>
              <input
                type="date"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                value={form.start_date}
                onChange={(e) => update('start_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Data de término (opcional)</label>
              <input
                type="date"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                value={form.end_date}
                onChange={(e) => update('end_date', e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold mb-4">Confirmar campanha</h3>
            {[
              { label: 'Nome', value: form.name },
              { label: 'Plataforma', value: form.platform === 'meta' ? 'Meta Ads' : form.platform === 'google' ? 'Google Ads' : 'LinkedIn' },
              { label: 'Objetivo', value: form.objective === 'leads' ? 'Geração de Leads' : form.objective === 'sales' ? 'Vendas' : 'Alcance' },
              { label: 'Orçamento', value: `R$ ${Number(form.budget).toLocaleString('pt-BR')}` },
              { label: 'Início', value: form.start_date || 'Não definido' },
              { label: 'Término', value: form.end_date || 'Não definido' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-2 border-b border-slate-700">
                <span className="text-slate-400">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

      {/* Botões de navegação */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Próximo <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-60 transition font-medium"
          >
            {loading ? 'Criando...' : 'Criar Campanha'}
          </button>
        )}
      </div>
    </div>
  );
}
