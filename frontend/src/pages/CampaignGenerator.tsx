import { useState } from 'react';
import { Wand2, Copy, Check, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { campaignGeneratorApi } from '../lib/api';

const BG          = '#090909';
const BG_SURFACE  = '#0E0F12';
const BG_ELEVATED = '#13141A';
const FG          = '#F0F0F0';
const FG_MUTED    = 'rgba(240,240,240,0.4)';
const FG_SUBTLE   = 'rgba(240,240,240,0.18)';
const BORDER      = 'rgba(255,255,255,0.04)';
const BORDER_MED  = 'rgba(255,255,255,0.08)';
const S_BLUE      = '#3DB8E8';
const S_YELLOW    = '#FACC15';

interface Keyword  { term: string; match_type: 'exact' | 'phrase' | 'broad' }
interface Sitelink { title: string; description1: string; description2: string }
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

const MATCH_LABEL: Record<string, string> = { exact: '[Exata]', phrase: '"Frase"', broad: '+Ampla' };
const MATCH_COLOR: Record<string, string> = { exact: S_BLUE, phrase: S_YELLOW, broad: FG_MUTED };

const SEGMENTOS = [
  { value: 'monaco-frota',   label: 'Mônaco — Gestão de Frota B2B' },
  { value: 'saas-b2b',       label: 'SaaS B2B Genérico' },
  { value: 'servicos-b2b',   label: 'Serviços B2B' },
  { value: 'industria',      label: 'Indústria / Manufatura' },
  { value: 'logistica',      label: 'Logística / Transporte' },
  { value: 'juridico',       label: 'Jurídico / Compliance' },
  { value: 'outro',          label: 'Outro' },
];

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: `1px solid ${BORDER_MED}`, background: 'transparent', color: copied ? S_BLUE : FG_MUTED, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

function AdGroupCard({ group, index }: { group: AdGroup; index: number }) {
  const [open, setOpen] = useState(index === 0);

  const allHeadlines = group.headlines.join('\n');
  const allDescs     = group.descriptions.join('\n');
  const allKws       = group.keywords.map(k => `${MATCH_LABEL[k.match_type] || ''} ${k.term}`).join('\n');

  return (
    <div style={{ background: BG_SURFACE, border: `1px solid ${BORDER}`, borderRadius: '14px', marginBottom: '12px', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: FG, textAlign: 'left' }}
      >
        <div>
          <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>{group.name}</p>
          <p style={{ fontSize: '11px', color: FG_MUTED }}>{group.theme}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: FG_SUBTLE }}>{group.keywords.length} palavras · {group.headlines.length} títulos</span>
          {open ? <ChevronUp size={14} color={FG_MUTED} /> : <ChevronDown size={14} color={FG_MUTED} />}
        </div>
      </button>

      {open && (
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Keywords */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: FG_SUBTLE, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Palavras-chave</p>
              <CopyBtn text={allKws} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {group.keywords.map((kw, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: BG_ELEVATED, border: `1px solid ${BORDER_MED}`, fontSize: '12px' }}>
                  <span style={{ fontSize: '10px', color: MATCH_COLOR[kw.match_type] || FG_MUTED, fontWeight: 700 }}>{MATCH_LABEL[kw.match_type]}</span>
                  <span style={{ color: FG }}>{kw.term}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Negatives */}
          {group.negative_keywords?.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: FG_SUBTLE, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Negativos</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {group.negative_keywords.map((kw, i) => (
                  <span key={i} style={{ padding: '3px 8px', borderRadius: '20px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.12)', fontSize: '11px', color: 'rgba(248,113,113,0.7)' }}>−{kw}</span>
                ))}
              </div>
            </div>
          )}

          {/* Headlines */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: FG_SUBTLE, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Títulos RSA ({group.headlines.length}/15)</p>
              <CopyBtn text={allHeadlines} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {group.headlines.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', background: BG_ELEVATED, border: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: '13px', color: FG }}>{h}</span>
                  <span style={{ fontSize: '10px', color: h.length > 30 ? '#F87171' : FG_SUBTLE, marginLeft: '12px', flexShrink: 0 }}>{h.length}/30</span>
                </div>
              ))}
            </div>
          </div>

          {/* Descriptions */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: FG_SUBTLE, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Descrições RSA ({group.descriptions.length}/4)</p>
              <CopyBtn text={allDescs} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {group.descriptions.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: BG_ELEVATED, border: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: '13px', color: FG, lineHeight: 1.5 }}>{d}</span>
                  <span style={{ fontSize: '10px', color: d.length > 90 ? '#F87171' : FG_SUBTLE, marginLeft: '12px', flexShrink: 0 }}>{d.length}/90</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sitelinks */}
          {group.sitelinks?.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: FG_SUBTLE, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Sitelinks</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                {group.sitelinks.map((s, i) => (
                  <div key={i} style={{ padding: '10px 12px', borderRadius: '8px', background: BG_ELEVATED, border: `1px solid ${BORDER_MED}` }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: S_BLUE, marginBottom: '4px' }}>{s.title}</p>
                    <p style={{ fontSize: '11px', color: FG_MUTED, lineHeight: 1.4 }}>{s.description1}</p>
                    <p style={{ fontSize: '11px', color: FG_MUTED, lineHeight: 1.4 }}>{s.description2}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function exportCSV(campaign: Campaign) {
  const rows: string[][] = [
    ['Campaign', 'Ad Group', 'Keyword', 'Match Type', 'Headline 1', 'Headline 2', 'Headline 3', 'Headline 4', 'Headline 5', 'Description 1', 'Description 2'],
  ];
  for (const ag of campaign.ad_groups) {
    for (const kw of ag.keywords) {
      const matchMap: Record<string, string> = { exact: 'Exact', phrase: 'Phrase', broad: 'Broad' };
      rows.push([
        campaign.campaign_name,
        ag.name,
        kw.term,
        matchMap[kw.match_type] || 'Broad',
        ag.headlines[0] || '',
        ag.headlines[1] || '',
        ag.headlines[2] || '',
        ag.headlines[3] || '',
        ag.headlines[4] || '',
        ag.descriptions[0] || '',
        ag.descriptions[1] || '',
      ]);
    }
  }
  const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${campaign.campaign_name.replace(/\s+/g, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CampaignGenerator() {
  const [form, setForm] = useState({
    empresa: '', segmento: 'monaco-frota', produto: '', objetivo: 'leads',
    diferenciais: '', provas_sociais: '', budget_mensal: '', regiao: 'Brasil',
    cta: 'Solicite o diagnóstico gratuito', publico_alvo: '',
  });
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError]       = useState('');

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleGenerate() {
    if (!form.empresa || !form.produto) { setError('Preencha empresa e produto/serviço'); return; }
    setLoading(true); setError(''); setCampaign(null);
    try {
      const res = await campaignGeneratorApi.generate(form);
      setCampaign(res.data?.campaign);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Erro ao gerar campanha');
    }
    setLoading(false);
  }

  const input: React.CSSProperties = {
    width: '100%', background: BG_ELEVATED, border: `1px solid ${BORDER_MED}`,
    borderRadius: '10px', padding: '10px 14px', color: FG, fontSize: '13px',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  };
  const label: React.CSSProperties = {
    display: 'block', fontSize: '10px', fontWeight: 700, color: FG_MUTED,
    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '7px',
  };
  const card: React.CSSProperties = {
    background: BG_SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '24px',
  };

  return (
    <div className="page-pad" style={{ minHeight: '100vh', background: BG, padding: '32px 36px', maxWidth: '900px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: BG_ELEVATED, border: `1px solid ${BORDER_MED}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Wand2 size={20} color={S_BLUE} />
        </div>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: FG, letterSpacing: '-0.02em' }}>Gerador de Campanhas</h1>
          <p style={{ fontSize: '13px', color: FG_MUTED, marginTop: '2px' }}>Campanha Google Ads completa pronta para subir</p>
        </div>
      </div>

      {!campaign ? (
        <div style={card}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label}>Segmento / Template</label>
              <select value={form.segmento} onChange={e => set('segmento', e.target.value)} style={{ ...input, appearance: 'none' }}>
                {SEGMENTOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <label style={label}>Empresa *</label>
              <input style={input} value={form.empresa} onChange={e => set('empresa', e.target.value)} placeholder="Ex: Mônaco Gestão Documental" />
            </div>

            <div>
              <label style={label}>Produto / Serviço *</label>
              <input style={input} value={form.produto} onChange={e => set('produto', e.target.value)} placeholder="Ex: Gestão de multas de frota" />
            </div>

            <div>
              <label style={label}>Objetivo da campanha</label>
              <select value={form.objetivo} onChange={e => set('objetivo', e.target.value)} style={{ ...input, appearance: 'none' }}>
                <option value="leads">Geração de Leads</option>
                <option value="vendas">Vendas</option>
                <option value="awareness">Reconhecimento de Marca</option>
                <option value="agendamento">Agendamentos</option>
              </select>
            </div>

            <div>
              <label style={label}>Público-alvo</label>
              <input style={input} value={form.publico_alvo} onChange={e => set('publico_alvo', e.target.value)} placeholder="Ex: Gestores de frota B2B, 100+ veículos" />
            </div>

            <div>
              <label style={label}>Região</label>
              <input style={input} value={form.regiao} onChange={e => set('regiao', e.target.value)} placeholder="Ex: Brasil, São Paulo" />
            </div>

            <div>
              <label style={label}>Budget mensal (R$)</label>
              <input style={input} type="number" value={form.budget_mensal} onChange={e => set('budget_mensal', e.target.value)} placeholder="Ex: 5000" />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label}>Diferenciais da empresa</label>
              <textarea style={{ ...input, minHeight: '80px', resize: 'vertical' }} value={form.diferenciais} onChange={e => set('diferenciais', e.target.value)} placeholder="Ex: 27 anos de mercado, 180 mil veículos geridos, captura 45 dias antes do Detran..." />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label}>Provas sociais / Cases reais</label>
              <textarea style={{ ...input, minHeight: '80px', resize: 'vertical' }} value={form.provas_sociais} onChange={e => set('provas_sociais', e.target.value)} placeholder="Ex: Cimed -82% tempo captação, R$ 925k economizados em 3 meses..." />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={label}>CTA principal</label>
              <input style={input} value={form.cta} onChange={e => set('cta', e.target.value)} placeholder="Ex: Solicite o diagnóstico gratuito" />
            </div>
          </div>

          {error && (
            <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', fontSize: '13px', color: '#F87171' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{ marginTop: '24px', width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${loading ? BORDER_MED : S_BLUE}`, background: loading ? BG_ELEVATED : `rgba(61,184,232,0.1)`, color: loading ? FG_MUTED : S_BLUE, fontSize: '14px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.15s' }}
          >
            {loading ? (
              <>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(61,184,232,0.2)', borderTop: `2px solid ${S_BLUE}`, animation: 'spin 0.8s linear infinite' }} />
                Gerando campanha com IA...
              </>
            ) : (
              <><Wand2 size={16} /> Gerar Campanha Completa</>
            )}
          </button>

          <p style={{ marginTop: '12px', textAlign: 'center', fontSize: '11px', color: FG_SUBTLE }}>
            A IA gera estrutura, keywords, 15 títulos e 4 descrições por grupo — leva ~20 segundos
          </p>
        </div>
      ) : (
        <div>
          {/* Campaign header */}
          <div style={{ ...card, marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: FG_SUBTLE, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Campanha gerada</p>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: FG }}>{campaign.campaign_name}</h2>
                <p style={{ fontSize: '12px', color: FG_MUTED, marginTop: '4px' }}>{campaign.objective}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => exportCSV(campaign)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: `1px solid ${BORDER_MED}`, background: BG_ELEVATED, color: FG, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <Download size={13} /> Exportar CSV
                </button>
                <button
                  onClick={() => setCampaign(null)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${BORDER_MED}`, background: 'transparent', color: FG_MUTED, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Nova campanha
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '20px' }}>
              {[
                { label: 'Estratégia de lance', value: campaign.bidding_strategy },
                { label: 'Budget mensal sugerido', value: campaign.budget_recommendation?.total_monthly ? `R$ ${campaign.budget_recommendation.total_monthly.toLocaleString('pt-BR')}` : '—' },
                { label: 'Grupos de anúncio', value: `${campaign.ad_groups.length} grupos` },
              ].map((item, i) => (
                <div key={i} style={{ padding: '12px 14px', borderRadius: '10px', background: BG_ELEVATED, border: `1px solid ${BORDER}` }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: FG_SUBTLE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{item.label}</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: FG }}>{item.value}</p>
                </div>
              ))}
            </div>

            {campaign.budget_recommendation?.distribution_notes && (
              <p style={{ marginTop: '12px', fontSize: '12px', color: FG_MUTED, lineHeight: 1.6, padding: '10px 12px', borderRadius: '8px', background: BG_ELEVATED, border: `1px solid ${BORDER}` }}>
                {campaign.budget_recommendation.distribution_notes}
              </p>
            )}
          </div>

          {/* Ad groups */}
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: FG_SUBTLE, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
              Grupos de Anúncio — {campaign.ad_groups.length} grupos
            </p>
            {campaign.ad_groups.map((ag, i) => (
              <AdGroupCard key={i} group={ag} index={i} />
            ))}
          </div>

          {campaign.export_tips && (
            <div style={{ marginTop: '16px', padding: '14px 16px', borderRadius: '12px', background: BG_SURFACE, border: `1px solid ${BORDER_MED}` }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: FG_SUBTLE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Dicas para subir no Google Ads</p>
              <p style={{ fontSize: '13px', color: FG_MUTED, lineHeight: 1.65 }}>{campaign.export_tips}</p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .page-pad { padding: 20px 16px !important; }
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
          div[style*="grid-template-columns: repeat(3"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
