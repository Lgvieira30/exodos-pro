import { useState, useId } from 'react';
import { Wand2, Copy, Check, ChevronDown, ChevronUp, Download, ListChecks } from 'lucide-react';
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
const S_GREEN     = '#4ADE80';
const S_RED       = '#F87171';

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

function CopyBtn({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: `1px solid ${BORDER_MED}`, background: 'transparent', color: copied ? S_BLUE : FG_MUTED, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copiado' : label}
    </button>
  );
}

function CopyBlock({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ background: BG_ELEVATED, border: `1px solid ${BORDER_MED}`, borderRadius: '10px', overflow: 'hidden', marginTop: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: `1px solid ${BORDER}`, background: BG_SURFACE }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: FG_SUBTLE, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
        <CopyBtn text={text} />
      </div>
      <pre style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '12px', color: FG_MUTED, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0, maxHeight: '280px', overflowY: 'auto' }}>{text}</pre>
    </div>
  );
}

function ConfigRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px', padding: '10px 14px', background: BG_ELEVATED, border: `1px solid ${BORDER}`, borderRadius: '8px', marginBottom: '6px' }}>
      <span style={{ fontSize: '11px', fontWeight: 600, color: FG_SUBTLE, textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: '1px' }}>{label}</span>
      <span style={{ fontSize: '13px', color: danger ? S_RED : FG, lineHeight: 1.5 }}>{value}</span>
    </div>
  );
}

function StepHeader({ num, title }: { num: string; title: string }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <span style={{ fontSize: '10px', fontFamily: 'monospace', color: S_BLUE, fontWeight: 700, letterSpacing: '0.1em' }}>ETAPA {num}</span>
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: FG, marginTop: '4px', letterSpacing: '-0.01em' }}>{title}</h3>
    </div>
  );
}

function Callout({ text, type = 'info' }: { text: string; type?: 'info' | 'warn' | 'danger' }) {
  const colors = { info: S_BLUE, warn: S_YELLOW, danger: S_RED };
  const bgs = { info: 'rgba(61,184,232,0.06)', warn: 'rgba(250,204,21,0.06)', danger: 'rgba(248,113,113,0.06)' };
  return (
    <div style={{ borderLeft: `3px solid ${colors[type]}`, background: bgs[type], padding: '12px 16px', borderRadius: '0 8px 8px 0', margin: '14px 0', fontSize: '13px', color: FG_MUTED, lineHeight: 1.6 }}
      dangerouslySetInnerHTML={{ __html: text }} />
  );
}

function CheckItem({ id, label, hint, checked, onChange }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} style={{ display: 'flex', gap: '12px', padding: '12px 14px', background: BG_ELEVATED, border: `1px solid ${checked ? 'rgba(74,222,128,0.2)' : BORDER}`, borderRadius: '8px', marginBottom: '6px', cursor: 'pointer', transition: 'border 0.15s', alignItems: 'flex-start' }}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: S_GREEN, cursor: 'pointer', flexShrink: 0 }}
      />
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: '13px', color: checked ? FG_MUTED : FG, textDecoration: checked ? 'line-through' : 'none', display: 'block' }}>{label}</span>
        {hint && <span style={{ fontSize: '11px', color: FG_SUBTLE, marginTop: '3px', display: 'block', lineHeight: 1.4 }}>{hint}</span>}
      </div>
    </label>
  );
}

function AdGroupCard({ group, index }: { group: AdGroup; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const allHeadlines = group.headlines.join('\n');
  const allDescs     = group.descriptions.join('\n');
  const allKws       = group.keywords.map(k => `${MATCH_LABEL[k.match_type] || ''} ${k.term}`).join('\n');

  return (
    <div style={{ background: BG_SURFACE, border: `1px solid ${BORDER}`, borderRadius: '14px', marginBottom: '12px', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: FG, textAlign: 'left' }}>
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
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: FG_SUBTLE, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Títulos RSA ({group.headlines.length}/15)</p>
              <CopyBtn text={allHeadlines} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {group.headlines.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', background: BG_ELEVATED, border: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: '13px', color: FG }}>{h}</span>
                  <span style={{ fontSize: '10px', color: h.length > 30 ? S_RED : FG_SUBTLE, marginLeft: '12px', flexShrink: 0 }}>{h.length}/30</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: FG_SUBTLE, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Descrições RSA ({group.descriptions.length}/4)</p>
              <CopyBtn text={allDescs} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {group.descriptions.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: BG_ELEVATED, border: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: '13px', color: FG, lineHeight: 1.5 }}>{d}</span>
                  <span style={{ fontSize: '10px', color: d.length > 90 ? S_RED : FG_SUBTLE, marginLeft: '12px', flexShrink: 0 }}>{d.length}/90</span>
                </div>
              ))}
            </div>
          </div>
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

function Roteiro({ campaign }: { campaign: Campaign }) {
  const uid = useId();
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  function toggle(id: string, v: boolean) { setChecks(c => ({ ...c, [id]: v })); }
  function chk(id: string) { return !!checks[`${uid}_${id}`]; }
  function tog(id: string) { return (v: boolean) => toggle(`${uid}_${id}`, v); }

  const allNegatives = [...new Set(campaign.ad_groups.flatMap(ag => ag.negative_keywords))];
  const firstGroup   = campaign.ad_groups[0];
  const allSitelinks = campaign.ad_groups.flatMap(ag => ag.sitelinks || []).slice(0, 6);

  const checkIds = [
    'conv1','conv2','conv3','conv4','conv5','conv6','conv7','conv8','conv9',
    'struct1','struct2',
    'cfg1','cfg2','cfg3','cfg4','cfg5','cfg6',
    'neg1','neg2','neg3','neg4',
    'rsa1','rsa2',
    'ext1','ext2','ext3','ext4','ext5','ext6',
    'utm1','utm2','utm3',
    'final1','final2','final3','final4','final5','final6','final7','final8','final9','final10','final11','final12',
  ];
  const total = checkIds.length;
  const done  = checkIds.filter(id => chk(id)).length;
  const pct   = total ? (done / total) * 100 : 0;

  const sitelinksText = allSitelinks.map(s => `${s.title} | ${s.description1} | ${s.description2}`).join('\n');
  const kwText = campaign.ad_groups.map(ag =>
    `=== ${ag.name} ===\n` + ag.keywords.map(k => {
      const sym = k.match_type === 'exact' ? `[${k.term}]` : k.match_type === 'phrase' ? `"${k.term}"` : k.term;
      return sym;
    }).join('\n')
  ).join('\n\n');

  const utmTemplate = `{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={adgroupid}&utm_term={keyword}&gclid={gclid}`;

  const section: React.CSSProperties = { marginBottom: '40px' };
  const divider: React.CSSProperties = { borderTop: `1px solid ${BORDER}`, margin: '32px 0' };

  return (
    <div>
      {/* Sticky progress */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: BG, borderBottom: `1px solid ${BORDER}`, padding: '12px 0', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ flex: 1, height: '5px', background: BG_ELEVATED, borderRadius: '3px', overflow: 'hidden', border: `1px solid ${BORDER_MED}` }}>
            <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${S_BLUE}, ${S_GREEN})`, transition: 'width 0.4s ease', borderRadius: '3px' }} />
          </div>
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: FG_MUTED, whiteSpace: 'nowrap' }}>
            <span style={{ color: pct === 100 ? S_GREEN : S_BLUE, fontWeight: 700 }}>{done}</span> / {total}
          </span>
          {done > 0 && (
            <button onClick={() => setChecks({})} style={{ fontSize: '10px', fontFamily: 'monospace', color: FG_SUBTLE, background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '4px', padding: '3px 8px', cursor: 'pointer' }}>
              limpar
            </button>
          )}
        </div>
      </div>

      {/* Etapa 01 */}
      <div style={section}>
        <StepHeader num="01" title="Decisões prévias — escreva antes de abrir o Google Ads" />
        <p style={{ fontSize: '13px', color: FG_MUTED, marginBottom: '14px', lineHeight: 1.6 }}>
          Sem hipótese e critério de decisão escritos, qualquer resultado é chute. Confirme cada campo abaixo antes de criar a campanha.
        </p>
        <ConfigRow label="Campanha" value={campaign.campaign_name} />
        <ConfigRow label="Objetivo" value={campaign.objective} />
        <ConfigRow label="Lance inicial" value="Maximizar conversões (sem CPA-alvo nos primeiros 14 dias)" />
        <ConfigRow label="Budget diário" value={campaign.budget_recommendation?.total_monthly ? `R$ ${Math.round(campaign.budget_recommendation.total_monthly / 30).toLocaleString('pt-BR')}/dia` : 'Definir antes de subir'} />
        <ConfigRow label="Hipótese" value="Escreva em 1 frase qual ângulo você está testando e por quê" />
        <ConfigRow label="Critério" value="14 dias mínimo · mínimo 30 cliques por palavra-chave antes de decidir" />
        <ConfigRow label="Período sem mexer" value="14 dias sem pausar · pausar antes invalida o aprendizado de máquina" danger />
        <Callout text="<strong>Regra de ouro:</strong> hipótese escrita em 1 frase, critério de decisão escrito antes de subir. Sem isso é aposta, não teste." />
        {campaign.budget_recommendation?.distribution_notes && (
          <div style={{ padding: '12px 14px', borderRadius: '8px', background: BG_ELEVATED, border: `1px solid ${BORDER}`, fontSize: '12px', color: FG_MUTED, lineHeight: 1.65, marginTop: '12px' }}>
            {campaign.budget_recommendation.distribution_notes}
          </div>
        )}
      </div>

      <div style={divider} />

      {/* Etapa 02 */}
      <div style={section}>
        <StepHeader num="02" title="Conversão configurada antes de tudo" />
        <p style={{ fontSize: '13px', color: FG_MUTED, marginBottom: '16px', lineHeight: 1.6 }}>
          Sem conversão rastreada, o Smart Bidding é cego. Configure e valide antes de criar qualquer grupo de anúncio.
        </p>
        <CheckItem id={`${uid}_conv1`} checked={chk('conv1')} onChange={tog('conv1')} label="Criar ação de conversão no Google Ads" hint="Ferramentas → Conversões → Nova. Categoria: Lead (envio de formulário)" />
        <CheckItem id={`${uid}_conv2`} checked={chk('conv2')} onChange={tog('conv2')} label="Nome da conversão descritivo" hint={`Ex: ${campaign.campaign_name} · Lead`} />
        <CheckItem id={`${uid}_conv3`} checked={chk('conv3')} onChange={tog('conv3')} label="Atribuir valor estimado por conversão" hint="Sugestão: valor médio de um lead qualificado · ajuda o Smart Bidding a otimizar melhor" />
        <CheckItem id={`${uid}_conv4`} checked={chk('conv4')} onChange={tog('conv4')} label="Janela de conversão: 30 dias" hint="B2B tem ciclo longo · janela curta perde conversão real" />
        <CheckItem id={`${uid}_conv5`} checked={chk('conv5')} onChange={tog('conv5')} label="Modelo de atribuição: Baseado em dados (ou Último clique se conta nova)" />
        <CheckItem id={`${uid}_conv6`} checked={chk('conv6')} onChange={tog('conv6')} label="Marcar 'Incluir em Conversões': SIM" hint="Sem isso o Smart Bidding não usa esse evento para otimizar" />
        <CheckItem id={`${uid}_conv7`} checked={chk('conv7')} onChange={tog('conv7')} label="Instalar tag na Landing Page" hint="Gatilho: clique no botão CTA ou carregamento da página de obrigado" />
        <CheckItem id={`${uid}_conv8`} checked={chk('conv8')} onChange={tog('conv8')} label="Validar com Google Tag Assistant antes de subir" hint="Submeta um lead de teste e confirme que disparou" />
        <CheckItem id={`${uid}_conv9`} checked={chk('conv9')} onChange={tog('conv9')} label="Ativar Auto-tagging na conta" hint="Configurações da conta → Tagging automático = SIM" />
      </div>

      <div style={divider} />

      {/* Etapa 03 */}
      <div style={section}>
        <StepHeader num="03" title="Estrutura e nomenclatura da conta" />
        <p style={{ fontSize: '13px', color: FG_MUTED, marginBottom: '14px', lineHeight: 1.6 }}>
          Nome padrão facilita relatório, debugging e escala. Cada campanha tem hipótese própria, nunca mistura temas.
        </p>
        <CopyBlock title="Nome da campanha" text={campaign.campaign_name} />
        <CopyBlock title="Padrão de nomenclatura" text={`[Marca]_[Objetivo]_[Tema]_[Período]\n\nExemplos:\n${campaign.campaign_name}\n${campaign.campaign_name.replace(/[^_]+$/, 'Brand_Permanente')}`} />
        <div style={{ marginTop: '14px' }}>
          <CheckItem id={`${uid}_struct1`} checked={chk('struct1')} onChange={tog('struct1')} label="Brand Defense já está rodando" hint="Não suba conversão sem proteger o nome da marca · concorrentes podem rankear no seu nome" />
          <CheckItem id={`${uid}_struct2`} checked={chk('struct2')} onChange={tog('struct2')} label="Confirmar agrupamento de campanhas na conta" hint="Organizar por marca/produto facilita relatório mensal" />
        </div>
      </div>

      <div style={divider} />

      {/* Etapa 04 */}
      <div style={section}>
        <StepHeader num="04" title="Configurações da campanha — tela por tela" />
        <ConfigRow label="Objetivo" value="Leads" />
        <ConfigRow label="Tipo" value="Pesquisa (Search) — nunca PMax misturado aqui" />
        <ConfigRow label="Redes" value="DESMARCAR Rede de Display + DESMARCAR Parceiros de Pesquisa" danger />
        <ConfigRow label="Local" value="Presença: pessoas que estão nos locais — NUNCA 'interesse no local'" danger />
        <ConfigRow label="Idiomas" value="Português" />
        <ConfigRow label="Públicos" value="Observação, não segmentação — em B2B segmentar fecha demais o volume" />
        <ConfigRow label="Lance" value="Maximizar conversões sem CPA-alvo nos primeiros 14 dias → depois tCPA" />
        <ConfigRow label="Orçamento" value="Diário · não compartilhado" />
        <ConfigRow label="Programação" value="24/7 nos primeiros 30 dias · pausar horário sem dado é chute" />
        <ConfigRow label="Rotação" value="Otimizar (padrão) · deixa o Google escolher a melhor combinação" />
        <div style={{ marginTop: '14px' }}>
          <CheckItem id={`${uid}_cfg1`} checked={chk('cfg1')} onChange={tog('cfg1')} label="Display desmarcado" />
          <CheckItem id={`${uid}_cfg2`} checked={chk('cfg2')} onChange={tog('cfg2')} label="Search Partners desmarcado" />
          <CheckItem id={`${uid}_cfg3`} checked={chk('cfg3')} onChange={tog('cfg3')} label="Local definido como 'Presença'" />
          <CheckItem id={`${uid}_cfg4`} checked={chk('cfg4')} onChange={tog('cfg4')} label="Audiências como 'Observação' (não segmentação)" />
          <CheckItem id={`${uid}_cfg5`} checked={chk('cfg5')} onChange={tog('cfg5')} label="Lance: Maximizar conversões (sem tCPA ainda)" />
          <CheckItem id={`${uid}_cfg6`} checked={chk('cfg6')} onChange={tog('cfg6')} label="Orçamento diário definido" />
        </div>
      </div>

      <div style={divider} />

      {/* Etapa 05 */}
      <div style={section}>
        <StepHeader num="05" title={`Grupos de anúncio + palavras-chave (${campaign.ad_groups.length} grupos)`} />
        <Callout text="<strong>Regra:</strong> um tema por grupo de anúncio. Misturar temas mata o Índice de Qualidade. Começa com 70% frase (&quot;aspas&quot;) e 30% exata ([colchetes]). Broad só depois de 90+ dias com tCPA estabilizado." type="warn" />
        <CopyBlock title="Todas as palavras-chave por grupo" text={kwText} />
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {campaign.ad_groups.map((ag, i) => (
            <div key={i} style={{ padding: '10px 14px', background: BG_ELEVATED, border: `1px solid ${BORDER}`, borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '13px', color: FG, fontWeight: 600 }}>{ag.name}</span>
                <span style={{ fontSize: '11px', color: FG_MUTED, marginLeft: '10px' }}>{ag.keywords.length} palavras-chave</span>
              </div>
              <CopyBtn text={ag.keywords.map(k => k.match_type === 'exact' ? `[${k.term}]` : k.match_type === 'phrase' ? `"${k.term}"` : k.term).join('\n')} />
            </div>
          ))}
        </div>
      </div>

      <div style={divider} />

      {/* Etapa 06 */}
      <div style={section}>
        <StepHeader num="06" title="Negativos — lista compartilhada" />
        <p style={{ fontSize: '13px', color: FG_MUTED, marginBottom: '14px', lineHeight: 1.6 }}>
          Cria como lista compartilhada e aplica em todas as campanhas de conversão. Subir no Dia 1.
        </p>
        <CopyBlock title="Palavras negativas (uma por linha)" text={allNegatives.join('\n')} />
        <div style={{ marginTop: '14px' }}>
          <CheckItem id={`${uid}_neg1`} checked={chk('neg1')} onChange={tog('neg1')} label="Criar lista compartilhada em Ferramentas → Biblioteca → Listas de palavras-chave negativas" />
          <CheckItem id={`${uid}_neg2`} checked={chk('neg2')} onChange={tog('neg2')} label="Aplicar a lista em TODAS as campanhas de conversão" />
          <CheckItem id={`${uid}_neg3`} checked={chk('neg3')} onChange={tog('neg3')} label="Auditoria de termos de busca: revisão semanal" hint="Cada termo lixo encontrado vira nova negativa" />
          <CheckItem id={`${uid}_neg4`} checked={chk('neg4')} onChange={tog('neg4')} label="Cada termo bom não listado → criar como palavra exata" />
        </div>
      </div>

      <div style={divider} />

      {/* Etapa 07 */}
      <div style={section}>
        <StepHeader num="07" title="RSA — Anúncio responsivo" />
        <p style={{ fontSize: '13px', color: FG_MUTED, marginBottom: '14px', lineHeight: 1.6 }}>
          15 títulos (máx 30 caracteres) + 4 descrições (máx 90 caracteres). Não fixar nada — libera o algoritmo combinar. Força do Anúncio = Excelente.
        </p>
        {firstGroup && (
          <>
            <p style={{ fontSize: '11px', fontWeight: 700, color: FG_SUBTLE, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
              Títulos — {firstGroup.name}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
              {firstGroup.headlines.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderRadius: '7px', background: BG_ELEVATED, border: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: FG_MUTED, width: '28px', flexShrink: 0 }}>T{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ fontSize: '13px', color: FG, flex: 1 }}>{h}</span>
                  <span style={{ fontSize: '10px', color: h.length > 30 ? S_RED : h.length > 27 ? S_YELLOW : FG_SUBTLE, marginLeft: '10px', flexShrink: 0 }}>{h.length}/30</span>
                </div>
              ))}
            </div>
            <CopyBlock title="Copiar todos os títulos" text={firstGroup.headlines.join('\n')} />

            <p style={{ fontSize: '11px', fontWeight: 700, color: FG_SUBTLE, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px', marginTop: '20px' }}>
              Descrições — {firstGroup.name}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
              {firstGroup.descriptions.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '9px 12px', borderRadius: '7px', background: BG_ELEVATED, border: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: FG_MUTED, width: '28px', flexShrink: 0, paddingTop: '1px' }}>D{i + 1}</span>
                  <span style={{ fontSize: '13px', color: FG, flex: 1, lineHeight: 1.5 }}>{d}</span>
                  <span style={{ fontSize: '10px', color: d.length > 90 ? S_RED : d.length > 85 ? S_YELLOW : FG_SUBTLE, marginLeft: '10px', flexShrink: 0 }}>{d.length}/90</span>
                </div>
              ))}
            </div>
            <CopyBlock title="Copiar todas as descrições" text={firstGroup.descriptions.join('\n')} />
          </>
        )}
        <div style={{ marginTop: '14px' }}>
          <CheckItem id={`${uid}_rsa1`} checked={chk('rsa1')} onChange={tog('rsa1')} label="Nenhum título ou descrição fixado no RSA" />
          <CheckItem id={`${uid}_rsa2`} checked={chk('rsa2')} onChange={tog('rsa2')} label="Força do Anúncio: Excelente" hint="Se aparecer 'Boa' ou 'Média', revisar variação · sem palavras repetidas entre títulos" />
        </div>
      </div>

      <div style={divider} />

      {/* Etapa 08 */}
      <div style={section}>
        <StepHeader num="08" title="Extensões (assets)" />
        <p style={{ fontSize: '13px', color: FG_MUTED, marginBottom: '14px', lineHeight: 1.6 }}>
          Sem extensão o anúncio fica pequeno e o CTR despenca. Todas obrigatórias antes de publicar.
        </p>
        {allSitelinks.length > 0 && (
          <CopyBlock title={`Sitelinks (${allSitelinks.length})`} text={sitelinksText} />
        )}
        <div style={{ marginTop: '14px' }}>
          <CheckItem id={`${uid}_ext1`} checked={chk('ext1')} onChange={tog('ext1')} label="6 Sitelinks adicionados com título + 2 descrições cada" />
          <CheckItem id={`${uid}_ext2`} checked={chk('ext2')} onChange={tog('ext2')} label="8+ Frases de destaque (callouts) adicionadas" hint="Máx 25 caracteres cada: anos de mercado, certificações, diferenciais objetivos" />
          <CheckItem id={`${uid}_ext3`} checked={chk('ext3')} onChange={tog('ext3')} label="Snippet estruturado de Serviços adicionado" hint="Tipo: Serviços · lista os serviços oferecidos" />
          <CheckItem id={`${uid}_ext4`} checked={chk('ext4')} onChange={tog('ext4')} label="Extensão de chamada (telefone) configurada" hint="Programar para horário comercial apenas" />
          <CheckItem id={`${uid}_ext5`} checked={chk('ext5')} onChange={tog('ext5')} label="Imagens 1:1 e 1.91:1 enviadas" hint="Proibido: stock photo genérica · usa foto real da operação ou print de resultado" />
          <CheckItem id={`${uid}_ext6`} checked={chk('ext6')} onChange={tog('ext6')} label="Logotipo e nome da empresa configurados na conta" />
        </div>
      </div>

      <div style={divider} />

      {/* Etapa 09 */}
      <div style={section}>
        <StepHeader num="09" title="UTMs e rastreamento" />
        <p style={{ fontSize: '13px', color: FG_MUTED, marginBottom: '14px', lineHeight: 1.6 }}>
          Configura o modelo na conta inteira — toda campanha herda. Sem UTM o relatório de origem fica cego.
        </p>
        <CopyBlock title="Modelo de URL (Configurações da conta → URLs personalizadas)" text={utmTemplate} />
        <div style={{ marginTop: '14px' }}>
          <CheckItem id={`${uid}_utm1`} checked={chk('utm1')} onChange={tog('utm1')} label="Modelo de URL configurado no nível da conta" />
          <CheckItem id={`${uid}_utm2`} checked={chk('utm2')} onChange={tog('utm2')} label="Auto-tagging ativo na conta" />
          <CheckItem id={`${uid}_utm3`} checked={chk('utm3')} onChange={tog('utm3')} label="Testar URL: pré-visualizar anúncio e confirmar UTMs na URL de destino" />
        </div>
      </div>

      <div style={divider} />

      {/* Etapa 10 */}
      <div style={section}>
        <StepHeader num="10" title="Checklist final — não publica com item desmarcado" />
        <CheckItem id={`${uid}_final1`}  checked={chk('final1')}  onChange={tog('final1')}  label="Conversão criada, tag instalada, Tag Assistant validou" />
        <CheckItem id={`${uid}_final2`}  checked={chk('final2')}  onChange={tog('final2')}  label="Brand Defense já está rodando antes desta campanha" />
        <CheckItem id={`${uid}_final3`}  checked={chk('final3')}  onChange={tog('final3')}  label="Lista de negativos compartilhada aplicada" />
        <CheckItem id={`${uid}_final4`}  checked={chk('final4')}  onChange={tog('final4')}  label="Local: Presença — NÃO interesse" />
        <CheckItem id={`${uid}_final5`}  checked={chk('final5')}  onChange={tog('final5')}  label="Search Partners e Display desmarcados" />
        <CheckItem id={`${uid}_final6`}  checked={chk('final6')}  onChange={tog('final6')}  label="UTMs configurados via modelo da conta" />
        <CheckItem id={`${uid}_final7`}  checked={chk('final7')}  onChange={tog('final7')}  label="RSA: 15 títulos, 4 descrições, sem fixar nenhum" />
        <CheckItem id={`${uid}_final8`}  checked={chk('final8')}  onChange={tog('final8')}  label="Extensões completas: sitelinks, callouts, snippets, chamada, imagens, logo" />
        <CheckItem id={`${uid}_final9`}  checked={chk('final9')}  onChange={tog('final9')}  label="LP carrega rápido e formulário dispara conversão correta" />
        <CheckItem id={`${uid}_final10`} checked={chk('final10')} onChange={tog('final10')} label="Hipótese escrita em 1 frase no documento da campanha" />
        <CheckItem id={`${uid}_final11`} checked={chk('final11')} onChange={tog('final11')} label="Critério de decisão escrito (CPL meta, prazo, volume mínimo)" />
        <CheckItem id={`${uid}_final12`} checked={chk('final12')} onChange={tog('final12')} label="Budget diário definido e aprovado" />
      </div>

      <div style={divider} />

      {/* Etapa 11 */}
      <div style={section}>
        <StepHeader num="11" title="Primeiros 14 dias — o que fazer" />
        <p style={{ fontSize: '13px', color: FG_MUTED, marginBottom: '16px', lineHeight: 1.6 }}>Disciplina pós-publicação. Não mexe no que não precisa. Coleta dado.</p>
        <Callout text="<strong>Dias 1–3 · Observar.</strong> Não pausa anúncio com menos de 3 dias. O algoritmo está aprendendo. Pausar agora invalida o aprendizado." type="warn" />
        <Callout text="<strong>Dias 4–7 · Auditar termos de busca todo dia.</strong> Não palavras-chave — termos reais que dispararam o anúncio. Cada termo lixo vira negativa. Cada bom vira palavra exata." />
        <Callout text="<strong>Dias 8–14 · Esperar 30 cliques mínimos por palavra-chave</strong> antes de qualquer decisão. Abaixo disso, pausar é chute." />
        <p style={{ fontSize: '12px', fontWeight: 700, color: FG_MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '20px', marginBottom: '12px' }}>Dia 14 · Reunião de decisão</p>
        <ConfigRow label="CTR &lt; 2%" value="Problema: hook fraco. Ação: novo RSA com outro ângulo." />
        <ConfigRow label="CTR ok · Conv LP &lt; 8%" value="Problema: página. Mexe na LP, NÃO no anúncio." />
        <ConfigRow label="Conv ok · CPL alto" value="Problema: público / keyword cara. Refinar negativos + pausar keywords ruins." />
        <ConfigRow label="Lead chega · não fecha" value="Problema: comercial. NÃO é tráfego. Reunião com vendas." />
        <ConfigRow label="Tudo dentro da meta" value="Escalar: aumento de 20% no budget. Nada mais que isso." />
        <Callout text="<strong>A maior burrice:</strong> trocar criativo quando o problema é a página. Ou redesenhar LP quando o problema é o comercial. <strong>Diagnostica primeiro, muda depois.</strong>" type="danger" />

        {campaign.export_tips && (
          <div style={{ marginTop: '20px', padding: '14px 16px', borderRadius: '10px', background: BG_ELEVATED, border: `1px solid ${BORDER_MED}` }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: FG_SUBTLE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Dicas para o Google Ads Editor</p>
            <p style={{ fontSize: '13px', color: FG_MUTED, lineHeight: 1.65 }}>{campaign.export_tips}</p>
          </div>
        )}
      </div>
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
        campaign.campaign_name, ag.name, kw.term, matchMap[kw.match_type] || 'Broad',
        ag.headlines[0] || '', ag.headlines[1] || '', ag.headlines[2] || '',
        ag.headlines[3] || '', ag.headlines[4] || '',
        ag.descriptions[0] || '', ag.descriptions[1] || '',
      ]);
    }
  }
  const csv  = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
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
  const [activeTab, setActiveTab] = useState<'campanha' | 'roteiro'>('campanha');

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleGenerate() {
    if (!form.empresa || !form.produto) { setError('Preencha empresa e produto/serviço'); return; }
    setLoading(true); setError(''); setCampaign(null);
    try {
      const res = await campaignGeneratorApi.generate(form);
      setCampaign(res.data?.campaign);
      setActiveTab('campanha');
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
  const labelStyle: React.CSSProperties = {
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
              <label style={labelStyle}>Segmento / Template</label>
              <select value={form.segmento} onChange={e => set('segmento', e.target.value)} style={{ ...input, appearance: 'none' }}>
                {SEGMENTOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Empresa *</label>
              <input style={input} value={form.empresa} onChange={e => set('empresa', e.target.value)} placeholder="Ex: Mônaco Gestão Documental" />
            </div>
            <div>
              <label style={labelStyle}>Produto / Serviço *</label>
              <input style={input} value={form.produto} onChange={e => set('produto', e.target.value)} placeholder="Ex: Gestão de multas de frota" />
            </div>
            <div>
              <label style={labelStyle}>Objetivo da campanha</label>
              <select value={form.objetivo} onChange={e => set('objetivo', e.target.value)} style={{ ...input, appearance: 'none' }}>
                <option value="leads">Geração de Leads</option>
                <option value="vendas">Vendas</option>
                <option value="awareness">Reconhecimento de Marca</option>
                <option value="agendamento">Agendamentos</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Público-alvo</label>
              <input style={input} value={form.publico_alvo} onChange={e => set('publico_alvo', e.target.value)} placeholder="Ex: Gestores de frota B2B, 100+ veículos" />
            </div>
            <div>
              <label style={labelStyle}>Região</label>
              <input style={input} value={form.regiao} onChange={e => set('regiao', e.target.value)} placeholder="Ex: Brasil, São Paulo" />
            </div>
            <div>
              <label style={labelStyle}>Budget mensal (R$)</label>
              <input style={input} type="number" value={form.budget_mensal} onChange={e => set('budget_mensal', e.target.value)} placeholder="Ex: 5000" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Diferenciais da empresa</label>
              <textarea style={{ ...input, minHeight: '80px', resize: 'vertical' }} value={form.diferenciais} onChange={e => set('diferenciais', e.target.value)} placeholder="Ex: 27 anos de mercado, 180 mil veículos geridos, captura 45 dias antes do Detran..." />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Provas sociais / Cases reais</label>
              <textarea style={{ ...input, minHeight: '80px', resize: 'vertical' }} value={form.provas_sociais} onChange={e => set('provas_sociais', e.target.value)} placeholder="Ex: Cimed -82% tempo captação, R$ 925k economizados em 3 meses..." />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>CTA principal</label>
              <input style={input} value={form.cta} onChange={e => set('cta', e.target.value)} placeholder="Ex: Solicite o diagnóstico gratuito" />
            </div>
          </div>

          {error && (
            <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', fontSize: '13px', color: S_RED }}>
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{ marginTop: '24px', width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${loading ? BORDER_MED : S_BLUE}`, background: loading ? BG_ELEVATED : `rgba(61,184,232,0.1)`, color: loading ? FG_MUTED : S_BLUE, fontSize: '14px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.15s' }}
          >
            {loading ? (
              <><div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(61,184,232,0.2)', borderTop: `2px solid ${S_BLUE}`, animation: 'spin 0.8s linear infinite' }} />Gerando campanha...</>
            ) : (
              <><Wand2 size={16} /> Gerar Campanha Completa</>
            )}
          </button>
          <p style={{ marginTop: '12px', textAlign: 'center', fontSize: '11px', color: FG_SUBTLE }}>
            Gera estrutura, keywords, 15 títulos e 4 descrições por grupo — instantâneo
          </p>
        </div>
      ) : (
        <div>
          {/* Campaign header */}
          <div style={{ ...card, marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: FG_SUBTLE, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Campanha gerada</p>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: FG }}>{campaign.campaign_name}</h2>
                <p style={{ fontSize: '12px', color: FG_MUTED, marginTop: '4px' }}>{campaign.objective}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => exportCSV(campaign)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: `1px solid ${BORDER_MED}`, background: BG_ELEVATED, color: FG, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Download size={13} /> Exportar CSV
                </button>
                <button onClick={() => setCampaign(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${BORDER_MED}`, background: 'transparent', color: FG_MUTED, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Nova campanha
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '18px' }}>
              {[
                { label: 'Estratégia de lance', value: campaign.bidding_strategy },
                { label: 'Budget mensal sugerido', value: campaign.budget_recommendation?.total_monthly ? `R$ ${campaign.budget_recommendation.total_monthly.toLocaleString('pt-BR')}` : '—' },
                { label: 'Grupos de anúncio', value: `${campaign.ad_groups.length} grupos` },
              ].map((item, i) => (
                <div key={i} style={{ padding: '10px 12px', borderRadius: '10px', background: BG_ELEVATED, border: `1px solid ${BORDER}` }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: FG_SUBTLE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{item.label}</p>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: FG }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: BG_SURFACE, borderRadius: '12px', padding: '4px', border: `1px solid ${BORDER}` }}>
            {([
              { id: 'campanha', icon: <Wand2 size={13} />, label: 'Campanha' },
              { id: 'roteiro',  icon: <ListChecks size={13} />, label: 'Roteiro de implantação' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 14px', borderRadius: '9px', border: 'none', background: activeTab === tab.id ? BG_ELEVATED : 'transparent', color: activeTab === tab.id ? FG : FG_MUTED, fontSize: '13px', fontWeight: activeTab === tab.id ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'campanha' ? (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: FG_SUBTLE, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
                Grupos de Anúncio — {campaign.ad_groups.length} grupos
              </p>
              {campaign.ad_groups.map((ag, i) => (
                <AdGroupCard key={i} group={ag} index={i} />
              ))}
            </div>
          ) : (
            <Roteiro campaign={campaign} />
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
