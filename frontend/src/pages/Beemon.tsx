import { useEffect, useState } from 'react';
import { RefreshCw, Trophy, Users, CheckCircle2, Clock, XCircle, Layers, Megaphone, Image } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { beemonApi } from '../lib/api';
import { DateRangePicker, DateRange, defaultRange } from '../components/DateRangePicker';

const BG = '#090909';
const BG_SURFACE = '#0E0F12';
const BG_ELEVATED = '#13141A';
const FG = '#F0F0F0';
const FG_MUTED = 'rgba(240,240,240,0.4)';
const FG_SUBTLE = 'rgba(240,240,240,0.18)';
const BORDER = 'rgba(255,255,255,0.04)';
const BORDER_MED = 'rgba(255,255,255,0.08)';
const S_BLUE = '#3DB8E8';
const S_GREEN = '#34D399';
const S_YELLOW = '#FACC15';
const S_RED = '#F87171';

interface RankRow { chave: string; leads: number; ganhos: number; abertos: number; perdidos: number; }
const brl = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
interface Lead { moskit_deal_id: string; data: string | null; lead: string; status: string; utm_source: string; utm_campaign: string; utm_term: string; utm_content: string; pagina: string; }

const STATUS_COLOR: Record<string, string> = { Ganhou: S_GREEN, Aberto: S_YELLOW, Perdido: S_RED };

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0E0F12', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 12px', fontSize: '11px' }}>
      <p style={{ color: 'rgba(240,240,240,0.4)', marginBottom: '4px' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, fontWeight: 700 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

export default function Beemon() {
  const [report, setReport] = useState<any>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'campanhas' | 'conjuntos' | 'criativos'>('campanhas');
  const [range, setRange] = useState<DateRange>(defaultRange());

  async function load(rg: DateRange) {
    const [r, l] = await Promise.all([
      beemonApi.report(rg.from, rg.to).catch(() => null),
      beemonApi.leads().catch(() => null),
    ]);
    setReport(r?.data || null);
    setLeads(l?.data?.leads || []);
    setLoading(false);
  }
  useEffect(() => { load(range); }, [range]); // eslint-disable-line

  async function handleSync() {
    setSyncing(true); setMsg('');
    try {
      const r = await beemonApi.syncCrm();
      setMsg(r.data?.message || 'Sincronizado!');
      await load(range);
    } catch (e: any) {
      setMsg(e?.response?.data?.error?.message || 'Erro ao sincronizar.');
    } finally {
      setSyncing(false);
      setTimeout(() => setMsg(''), 6000);
    }
  }

  const t = report?.totals || { oportunidades: 0, ganhos: 0, abertos: 0, perdidos: 0 };
  const prev = report?.previous || { oportunidades: 0, ganhos: 0, abertos: 0, perdidos: 0 };
  const winRate = t.oportunidades > 0 ? (t.ganhos / t.oportunidades) * 100 : 0;
  const prevWin = prev.oportunidades > 0 ? (prev.ganhos / prev.oportunidades) * 100 : 0;
  const hasPrev = (prev.oportunidades || 0) > 0;
  const pct = (cur: number, p: number) => p > 0 ? ((cur - p) / p) * 100 : (cur > 0 ? 100 : 0);
  const rows: RankRow[] = report?.[tab] || [];
  const dailyData = (report?.daily || []).map((d: any) => ({
    day: d.date ? d.date.split('-').reverse().slice(0, 2).join('/') : '',
    Ganhos: Number(d.ganhos), Abertos: Number(d.abertos), Perdidos: Number(d.perdidos),
  }));
  const meta = report?.metaMetrics || { spend: 0, leads: 0, clicks: 0, impressions: 0, cpl: 0, cpc: 0, ctr: 0 };
  type CruzC = { nome: string; ganhos: number; inv: number; total: number; custoCliente: number | null };
  const cruzCriativos: CruzC[] = (report?.cruzamento || []).map((c: any) => {
    const ganhos = Number(c.ganhos || 0), inv = Number(c.investimento || 0), total = Number(c.total_crm || 0);
    return { nome: c.criativo as string, ganhos, inv, total, custoCliente: inv > 0 && ganhos > 0 ? inv / ganhos : null };
  });
  const campeao = [...cruzCriativos].sort((a, b) => b.ganhos - a.ganhos)[0];
  const escalar = cruzCriativos.filter((c) => c.ganhos > 0 && c.custoCliente != null).sort((a, b) => (a.custoCliente! - b.custoCliente!))[0];
  const pausar = cruzCriativos.filter((c) => c.inv > 0 && c.ganhos === 0).sort((a, b) => b.inv - a.inv)[0];
  const volumeSemVenda = cruzCriativos.filter((c) => c.ganhos === 0 && c.total > 0).sort((a, b) => b.total - a.total)[0];
  const resumoHeadline = report
    ? `${meta.spend > 0 ? `Investimento ${brl(meta.spend)} · ${meta.leads} leads (CPL ${brl(meta.cpl)}). ` : ''}` +
      `CRM: ${t.oportunidades} oportunidades · ${t.ganhos} ganhos · win rate ${winRate.toFixed(0)}%.`
    : '';

  const card: React.CSSProperties = { background: BG_SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '18px 20px' };

  function renderCross(title: string, subtitle: string, colLabel: string, crossRows: any[]) {
    if (!crossRows || crossRows.length === 0) return null;
    return (
      <div style={{ ...card, marginBottom: '20px', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy size={15} color={S_GREEN} />
          <p style={{ fontSize: '13px', fontWeight: 800, color: FG }}>{title}</p>
          <span style={{ fontSize: '11px', color: FG_SUBTLE }}>{subtitle}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 60px 60px 64px 90px 90px', gap: '0 10px', padding: '11px 18px', borderBottom: `1px solid ${BORDER}`, background: BG_ELEVATED, minWidth: '760px' }}>
            <span style={{ fontSize: '10px', color: FG_SUBTLE, fontWeight: 700 }}>#</span>
            <span style={{ fontSize: '10px', color: FG_SUBTLE, fontWeight: 700, textTransform: 'uppercase' }}>{colLabel}</span>
            <span style={{ fontSize: '10px', color: FG_SUBTLE, fontWeight: 700, textAlign: 'right' }}>CRM</span>
            <span style={{ fontSize: '10px', color: S_GREEN, fontWeight: 700, textAlign: 'right' }}>GANHOS</span>
            <span style={{ fontSize: '10px', color: FG_SUBTLE, fontWeight: 700, textAlign: 'right' }}>TAXA</span>
            <span style={{ fontSize: '10px', color: FG_SUBTLE, fontWeight: 700, textAlign: 'right' }}>INVEST.</span>
            <span style={{ fontSize: '10px', color: S_BLUE, fontWeight: 700, textAlign: 'right' }}>CUSTO/CLIENTE</span>
          </div>
          {crossRows.map((r: any, i: number) => {
            const nome = r.criativo ?? r.conjunto ?? r.chave ?? '—';
            const total = Number(r.total_crm || 0);
            const ganhos = Number(r.ganhos || 0);
            const taxa = total > 0 ? (ganhos / total) * 100 : 0;
            const inv = Number(r.investimento || 0);
            const custoGanho = inv > 0 && ganhos > 0 ? inv / ganhos : null;
            return (
              <div key={nome + i} className="bm-row" style={{ display: 'grid', gridTemplateColumns: '24px 1fr 60px 60px 64px 90px 90px', gap: '0 10px', padding: '11px 18px', borderBottom: `1px solid ${BORDER}`, alignItems: 'center', minWidth: '760px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: i < 3 ? S_GREEN : FG_SUBTLE }}>{i + 1}º</span>
                <span style={{ fontSize: '13px', color: FG, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={nome}>{nome}</span>
                <span style={{ fontSize: '13px', color: FG, textAlign: 'right' }}>{total}</span>
                <span style={{ fontSize: '13px', color: ganhos > 0 ? S_GREEN : FG_SUBTLE, fontWeight: 800, textAlign: 'right' }}>{ganhos}</span>
                <span style={{ fontSize: '12px', color: FG_MUTED, textAlign: 'right' }}>{taxa.toFixed(0)}%</span>
                <span style={{ fontSize: '12px', color: inv > 0 ? FG : FG_SUBTLE, textAlign: 'right' }}>{inv > 0 ? brl(inv) : '—'}</span>
                <span style={{ fontSize: '13px', color: custoGanho ? S_BLUE : FG_SUBTLE, fontWeight: 700, textAlign: 'right' }}>{custoGanho ? brl(custoGanho) : '—'}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: BG }}>
      <div style={{ width: '34px', height: '34px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.08)', borderTop: '2px solid rgba(240,240,240,0.5)', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '28px 32px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .bm-row:hover{background:rgba(255,255,255,0.03)!important} @media(max-width:860px){.bm-grid{grid-template-columns:1fr!important}.bm-grid2{grid-template-columns:1fr!important}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: FG, letterSpacing: '-0.02em' }}>BeeMôn</h1>
            <p style={{ fontSize: '12px', color: FG_MUTED, marginTop: '2px' }}>Meta Ads + CRM — qualidade real dos leads</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <DateRangePicker value={range} onChange={setRange} />
          {msg && <span style={{ fontSize: '11px', color: msg.includes('Erro') ? S_RED : FG, fontWeight: 600 }}>{msg}</span>}
          <button onClick={handleSync} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: `1px solid ${BORDER_MED}`, background: 'rgba(255,255,255,0.08)', color: FG, fontSize: '12px', fontWeight: 700, cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.6 : 1, fontFamily: 'inherit' }}>
            <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Sincronizando…' : 'Sincronizar CRM'}
          </button>
        </div>
      </div>

      {/* Resumo Executivo automático (estruturado) */}
      {report && (
        <div style={{ ...card, marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '15px' }}>📋</span>
            <p style={{ fontSize: '11px', fontWeight: 700, color: FG_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resumo Executivo</p>
          </div>
          <p style={{ fontSize: '13px', color: FG, lineHeight: 1.6, marginBottom: '14px' }}>{resumoHeadline}</p>
          <div className="bm-grid2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {[
              { icon: '🏆', label: 'Campeão em vendas', val: campeao && campeao.ganhos > 0 ? `${campeao.nome} — ${campeao.ganhos} ganhos` : 'sem ganhos no período', color: S_GREEN },
              { icon: '🚀', label: 'O que escalar', val: escalar ? `${escalar.nome} — melhor custo/cliente (${brl(escalar.custoCliente!)})` : 'sem candidato claro ainda', color: S_BLUE },
              { icon: '⛔', label: 'O que pausar', val: pausar ? `${pausar.nome} — ${brl(pausar.inv)} gastos e 0 ganhos` : 'nada gastando à toa', color: S_RED },
              { icon: '⚠️', label: 'Volume sem venda', val: volumeSemVenda ? `${volumeSemVenda.nome} — ${volumeSemVenda.total} leads, 0 ganhos (revisar)` : '—', color: S_YELLOW },
            ].map((it) => (
              <div key={it.label} style={{ background: BG_ELEVATED, borderRadius: '10px', padding: '10px 12px', borderLeft: `2px solid ${it.color}` }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: it.color, textTransform: 'uppercase', marginBottom: '3px' }}>{it.icon} {it.label}</p>
                <p style={{ fontSize: '12px', color: FG, lineHeight: 1.4 }}>{it.val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Métricas do Meta (quando sincronizado) */}
      {meta.spend > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Investimento Meta', value: brl(meta.spend) },
            { label: 'Leads Meta', value: meta.leads.toLocaleString('pt-BR') },
            { label: 'CPL Meta', value: brl(meta.cpl) },
            { label: 'Cliques', value: meta.clicks.toLocaleString('pt-BR') },
            { label: 'CTR', value: `${meta.ctr.toFixed(2)}%` },
          ].map(({ label, value }) => (
            <div key={label} style={{ ...card, padding: '14px 16px' }}>
              <p style={{ fontSize: '20px', fontWeight: 800, color: FG, lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: '10px', color: FG_MUTED, marginTop: '6px', fontWeight: 500 }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* CRM Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Oportunidades', value: t.oportunidades, color: S_BLUE, Icon: Users, delta: pct(t.oportunidades, prev.oportunidades), good: t.oportunidades >= prev.oportunidades as boolean | null },
          { label: 'Ganhos', value: t.ganhos, color: S_GREEN, Icon: CheckCircle2, delta: pct(t.ganhos, prev.ganhos), good: t.ganhos >= prev.ganhos as boolean | null },
          { label: 'Abertos', value: t.abertos, color: S_YELLOW, Icon: Clock, delta: pct(t.abertos, prev.abertos), good: null as boolean | null },
          { label: 'Perdidos', value: t.perdidos, color: S_RED, Icon: XCircle, delta: pct(t.perdidos, prev.perdidos), good: (t.perdidos <= prev.perdidos) as boolean | null },
          { label: 'Win Rate', value: `${winRate.toFixed(0)}%`, color: S_GREEN, Icon: Trophy, delta: pct(winRate, prevWin), good: (winRate >= prevWin) as boolean | null },
        ].map(({ label, value, color, Icon, delta, good }) => (
          <div key={label} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={color} />
              </div>
              {hasPrev && (
                <span title="vs período anterior" style={{ fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px', color: good === true ? S_GREEN : good === false ? S_RED : FG_MUTED }}>
                  {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}%
                </span>
              )}
            </div>
            <p style={{ fontSize: '24px', fontWeight: 800, color: FG, lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: '11px', color: FG_MUTED, marginTop: '5px', fontWeight: 500 }}>{label}</p>
          </div>
        ))}
      </div>

      {leads.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '34px' }}>
          <p style={{ color: FG_MUTED, fontSize: '13px', marginBottom: '6px' }}>Nenhum lead Beemon ainda.</p>
          <p style={{ color: FG_SUBTLE, fontSize: '12px' }}>Conecte o Moskit (na página Mônaco) e clique em <strong style={{ color: FG }}>Sincronizar CRM</strong>.</p>
        </div>
      )}

      {leads.length > 0 && (
        <>
          {/* Gráfico diário + Funil */}
          <div className="bm-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', marginBottom: '20px' }}>
            <div style={card}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: FG }}>Leads por dia</p>
              <p style={{ fontSize: '11px', color: FG_SUBTLE, marginBottom: '14px' }}>CRM — empilhado por status</p>
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="day" stroke="transparent" tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Ganhos" stackId="a" fill={S_GREEN} />
                    <Bar dataKey="Abertos" stackId="a" fill={S_YELLOW} />
                    <Bar dataKey="Perdidos" stackId="a" fill={S_RED} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: FG_SUBTLE, fontSize: '12px' }}>Sem dados no período</div>
              )}
            </div>

            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: FG }}>Funil de Conversão</p>
                <p style={{ fontSize: '11px', color: FG_SUBTLE }}>Oportunidades → Clientes</p>
              </div>
              <div style={{ background: 'rgba(61,184,232,0.12)', border: `1px solid rgba(61,184,232,0.25)`, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <p style={{ fontSize: '26px', fontWeight: 800, color: S_BLUE, lineHeight: 1 }}>{t.oportunidades}</p>
                <p style={{ fontSize: '11px', color: FG_MUTED, marginTop: '4px' }}>Oportunidades</p>
              </div>
              <p style={{ textAlign: 'center', fontSize: '11px', color: FG_MUTED, fontWeight: 600 }}>↓ {winRate.toFixed(0)}% viraram cliente</p>
              <div style={{ background: 'rgba(52,211,153,0.12)', border: `1px solid rgba(52,211,153,0.25)`, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <p style={{ fontSize: '26px', fontWeight: 800, color: S_GREEN, lineHeight: 1 }}>{t.ganhos}</p>
                <p style={{ fontSize: '11px', color: FG_MUTED, marginTop: '4px' }}>Ganhos (clientes)</p>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {([['Abertos', t.abertos, S_YELLOW], ['Perdidos', t.perdidos, S_RED]] as const).map(([lbl, val, col]) => (
                  <div key={lbl} style={{ flex: 1, background: BG_ELEVATED, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                    <p style={{ fontSize: '16px', fontWeight: 800, color: col }}>{val}</p>
                    <p style={{ fontSize: '10px', color: FG_SUBTLE }}>{lbl}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rankings */}
          <div style={{ ...card, marginBottom: '20px', padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: '4px', padding: '14px 18px', borderBottom: `1px solid ${BORDER}` }}>
              {([['campanhas', 'Campanhas', Megaphone], ['conjuntos', 'Conjuntos', Layers], ['criativos', 'Criativos', Image]] as const).map(([key, lbl, Icon]) => (
                <button key={key} onClick={() => setTab(key)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: tab === key ? 'rgba(255,255,255,0.08)' : 'transparent', color: tab === key ? FG : FG_MUTED }}>
                  <Icon size={13} /> {lbl}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 70px 70px 70px 70px', gap: '0 12px', padding: '12px 18px', borderBottom: `1px solid ${BORDER}`, background: BG_ELEVATED }}>
              <span style={{ fontSize: '10px', color: FG_SUBTLE, fontWeight: 700 }}>#</span>
              <span style={{ fontSize: '10px', color: FG_SUBTLE, fontWeight: 700, textTransform: 'uppercase' }}>{tab === 'campanhas' ? 'Campanha (utm_campaign)' : tab === 'conjuntos' ? 'Conjunto (utm_term)' : 'Criativo (utm_content)'}</span>
              <span style={{ fontSize: '10px', color: FG_SUBTLE, fontWeight: 700, textAlign: 'right' }}>LEADS</span>
              <span style={{ fontSize: '10px', color: S_GREEN, fontWeight: 700, textAlign: 'right' }}>GANHOS</span>
              <span style={{ fontSize: '10px', color: S_YELLOW, fontWeight: 700, textAlign: 'right' }}>ABERTOS</span>
              <span style={{ fontSize: '10px', color: S_RED, fontWeight: 700, textAlign: 'right' }}>PERD.</span>
            </div>
            {rows.length === 0 ? (
              <p style={{ padding: '24px', textAlign: 'center', color: FG_SUBTLE, fontSize: '12px' }}>Sem dados de {tab} no período.</p>
            ) : rows.map((r, i) => (
              <div key={r.chave} className="bm-row" style={{ display: 'grid', gridTemplateColumns: '28px 1fr 70px 70px 70px 70px', gap: '0 12px', padding: '12px 18px', borderBottom: `1px solid ${BORDER}`, alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: i < 3 ? S_BLUE : FG_SUBTLE }}>{i + 1}º</span>
                <span style={{ fontSize: '13px', color: FG, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.chave}</span>
                <span style={{ fontSize: '13px', color: FG, fontWeight: 700, textAlign: 'right' }}>{r.leads}</span>
                <span style={{ fontSize: '13px', color: r.ganhos > 0 ? S_GREEN : FG_SUBTLE, fontWeight: 800, textAlign: 'right' }}>{r.ganhos}</span>
                <span style={{ fontSize: '13px', color: FG_MUTED, textAlign: 'right' }}>{r.abertos}</span>
                <span style={{ fontSize: '13px', color: FG_MUTED, textAlign: 'right' }}>{r.perdidos}</span>
              </div>
            ))}
          </div>

          {/* Cruzamentos × CRM × Ganhos (campanha → conjunto → criativo) */}
          {renderCross('Campanha × CRM × Ganhos', '— ordenado por ganhos, depois custo/cliente', 'Campanha', report?.cruzamentoCampanhas || [])}
          {renderCross('Criativo × CRM × Ganhos', '— qual criativo mais vira cliente, não lead', 'Criativo', report?.cruzamento || [])}
          {renderCross('Conjunto × CRM × Ganhos', '— qual público mais vira cliente', 'Conjunto (público)', report?.cruzamentoConjuntos || [])}

          {/* Lista de leads (pra conferir os UTMs reais) */}
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <p style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: FG_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${BORDER}` }}>
              Leads sincronizados — conferência dos UTMs ({leads.length})
            </p>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 90px 130px 130px 110px', gap: '0 12px', padding: '10px 18px', borderBottom: `1px solid ${BORDER}`, background: BG_ELEVATED, minWidth: '720px' }}>
                {['Data', 'Lead', 'Status', 'utm_campaign', 'utm_content', 'utm_term'].map((h) => (
                  <span key={h} style={{ fontSize: '10px', color: FG_SUBTLE, fontWeight: 700, textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              {leads.slice(0, 100).map((l) => (
                <div key={l.moskit_deal_id} className="bm-row" style={{ display: 'grid', gridTemplateColumns: '90px 1fr 90px 130px 130px 110px', gap: '0 12px', padding: '10px 18px', borderBottom: `1px solid ${BORDER}`, alignItems: 'center', minWidth: '720px' }}>
                  <span style={{ fontSize: '11px', color: FG_MUTED }}>{l.data ? l.data.split('-').reverse().join('/') : '—'}</span>
                  <span style={{ fontSize: '12px', color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.lead || '—'}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: STATUS_COLOR[l.status] || FG_MUTED }}>{l.status}</span>
                  <span style={{ fontSize: '11px', color: FG_MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.utm_campaign}>{l.utm_campaign || '—'}</span>
                  <span style={{ fontSize: '11px', color: FG_MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.utm_content}>{l.utm_content || '—'}</span>
                  <span style={{ fontSize: '11px', color: FG_MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.utm_term}>{l.utm_term || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
