import React, { useState } from 'react';
import { Paintbrush, Type, Image, Copy, Check } from 'lucide-react';

const TEMPLATES = [
  { id: 'lead-gen', label: 'Geração de Leads', headline: 'Descubra como [BENEFÍCIO] sem [OBJEÇÃO]', cta: 'Quero saber mais' },
  { id: 'before-after', label: 'Antes e Depois', headline: 'Como [CLIENTE] conseguiu [RESULTADO] em [TEMPO]', cta: 'Ver caso de sucesso' },
  { id: 'urgency', label: 'Urgência / Escassez', headline: 'Últimas [N] vagas para [SERVIÇO] com [DESCONTO]%', cta: 'Garantir minha vaga' },
  { id: 'social-proof', label: 'Prova Social', headline: '+[N] clientes já transformaram [ÁREA] com a gente', cta: 'Fazer parte disso' },
];

export default function CreativeStudio() {
  const [selected, setSelected] = useState(TEMPLATES[0]);
  const [headline, setHeadline] = useState(TEMPLATES[0].headline);
  const [body, setBody] = useState('Texto do anúncio. Fale sobre o problema, a solução e os benefícios.');
  const [cta, setCta] = useState(TEMPLATES[0].cta);
  const [copied, setCopied] = useState(false);

  function selectTemplate(t: typeof TEMPLATES[0]) {
    setSelected(t);
    setHeadline(t.headline);
    setCta(t.cta);
  }

  function handleCopy() {
    const text = `HEADLINE:\n${headline}\n\nBODY:\n${body}\n\nCTA:\n${cta}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Creative Studio</h2>
        <p className="text-slate-400 mt-1">Construa copies e criativos para suas campanhas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Templates</h3>
          <div className="space-y-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTemplate(t)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selected.id === t.id
                    ? 'border-blue-500 bg-blue-500/10 text-white'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Paintbrush className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{t.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Type className="w-4 h-4" /> Headline
            </label>
            <input
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">{headline.length}/90 caracteres</p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Image className="w-4 h-4" /> Texto do Anúncio (Body)
            </label>
            <textarea
              rows={5}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 resize-none"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">{body.length}/500 caracteres</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Call to Action (CTA)</label>
            <input
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
            />
          </div>

          {/* Preview */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Preview</p>
            <div className="bg-white rounded-lg p-4 text-slate-900">
              <p className="font-bold text-lg leading-snug">{headline || 'Sua headline aqui'}</p>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{body}</p>
              <button className="mt-4 bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-lg">
                {cta}
              </button>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition text-sm font-medium"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado!' : 'Copiar copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
