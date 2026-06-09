import { useEffect, useState } from 'react';
import { RefreshCw, Trophy, Users, CheckCircle2, Clock, XCircle, Layers, Megaphone, Image } from 'lucide-react';
import { beemonApi } from '../lib/api';

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
interface Lead { moskit_deal_id: string; data: string | null; lead: string; status: string; utm_source: string; utm_campaign: string; utm_term: string; utm_content: string; pagina: string; }

const STATUS_COLOR: Record<string, string> = { Ganhou: S_GREEN, Aberto: S_YELLOW, Perdido: S_RED };

export default function Beemon() {
  const [report, setReport] = useState<any>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'campanhas' | 'conjuntos' | 'criativos'>('campanhas');

  async function load() {
    const [r, l] = await Promise.all([
      beemonApi.report().catch(() => null),
      beemonApi.leads().catch(() => null),
    ]);
    setReport(r?.data || null);
    setLeads(l?.data?.leads || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleSync() {
    setSyncing(true); setMsg('');
    try {
      const r = await beemonApi.syncCrm();
      setMsg(r.data?.message || 'Sincronizado!');
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.error?.message || 'Erro ao sincronizar.');
    } finally {
      setSyncing(false);
      setTimeout(() => setMsg(''), 6000);
    }
  }

  const t = report?.totals || { oportunidades: 0, ganhos: 0, abertos: 0, perdidos: 0 };
  const winRate = t.oportunidades > 0 ? (t.ganhos / t.oportunidades) * 100 : 0;
  const rows: RankRow[] = report?.[tab] || [];

  const card: React.CSSProperties = { background: BG_SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '18px 20px' };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: BG }}>
      <div style={{ width: '34px', height: '34px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.08)', borderTop: '2px solid rgba(240,240,240,0.5)', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '28px 32px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .bm-row:hover{background:rgba(255,255,255,0.03)!important}`}</style>

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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {msg && <span style={{ fontSize: '11px', color: msg.includes('Erro') ? S_RED : FG, fontWeight: 600 }}>{msg}</span>}
          <button onClick={handleSync} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: `1px solid ${BORDER_MED}`, background: 'rgba(255,255,255,0.08)', color: FG, fontSize: '12px', fontWeight: 700, cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.6 : 1, fontFamily: 'inherit' }}>
            <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Sincronizando…' : 'Sincronizar CRM'}
          </button>
        </div>
      </div>

      {/* CRM Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Oportunidades', value: t.oportunidades, color: S_BLUE, Icon: Users },
          { label: 'Ganhos', value: t.ganhos, color: S_GREEN, Icon: CheckCircle2 },
          { label: 'Abertos', value: t.abertos, color: S_YELLOW, Icon: Clock },
          { label: 'Perdidos', value: t.perdidos, color: S_RED, Icon: XCircle },
          { label: 'Win Rate', value: `${winRate.toFixed(0)}%`, color: S_GREEN, Icon: Trophy },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={color} />
              </div>
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
