import React, { useState } from 'react';
import { Save, Eye, EyeOff } from 'lucide-react';

export default function Settings() {
  const [showSecret, setShowSecret] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    metaAppId: '',
    metaAppSecret: '',
    metaAccessToken: '',
    googleDevToken: '',
    frontendUrl: window.location.origin,
  });

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function handleSave() {
    // Por enquanto salva no localStorage; quando backend estiver conectado,
    // isso vai para uma rota /api/settings protegida por JWT
    localStorage.setItem('exodos_settings', JSON.stringify(form));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Configurações</h2>
        <p className="text-slate-400 mt-1">Integrações e preferências da plataforma</p>
      </div>

      <div className="space-y-6">
        {/* Meta Ads */}
        <section className="bg-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">Meta Ads</h3>
          <div className="space-y-3">
            <Field label="App ID" value={form.metaAppId} onChange={(v) => update('metaAppId', v)} placeholder="123456789" />
            <Field
              label="App Secret"
              value={form.metaAppSecret}
              onChange={(v) => update('metaAppSecret', v)}
              placeholder="••••••••••••••••"
              type={showSecret ? 'text' : 'password'}
              suffix={
                <button onClick={() => setShowSecret((s) => !s)} className="text-slate-400 hover:text-white">
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
            <Field label="Access Token" value={form.metaAccessToken} onChange={(v) => update('metaAccessToken', v)} placeholder="EAAxxxxx..." />
          </div>
        </section>

        {/* Google Ads */}
        <section className="bg-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">Google Ads</h3>
          <Field label="Developer Token" value={form.googleDevToken} onChange={(v) => update('googleDevToken', v)} placeholder="ABcDeFgH..." />
        </section>

        {/* Informações da conta */}
        <section className="bg-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">Conta</h3>
          <div className="flex items-center justify-between py-3 border-b border-slate-700">
            <span className="text-slate-400 text-sm">Usuário</span>
            <span className="text-white text-sm">Lucas Vieira</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-slate-400 text-sm">Email</span>
            <span className="text-white text-sm">lgvieira.far@gmail.com</span>
          </div>
        </section>

        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition ${
            saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Salvo!' : 'Salvar configurações'}
        </button>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  suffix?: React.ReactNode;
}

function Field({ label, value, onChange, placeholder, type = 'text', suffix }: FieldProps) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1">{label}</label>
      <div className="relative">
        <input
          type={type}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 pr-10"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
    </div>
  );
}
