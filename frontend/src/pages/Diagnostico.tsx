import { useEffect, useState } from 'react';
import { RefreshCw, Database, AlertTriangle } from 'lucide-react';
import { syncApi } from '../lib/api';

const CYAN = '#3DB8E8';

interface DebugData {
  campaigns: Array<{ id: string; name: string; platform: string; status: string; meta_id: string | null }>;
  recent_metrics: Array<{
    campaign_name: string; date: string; spend: number; leads: number;
    clicks: number; impressions: number; cpa: number; ctr: number; cpc: number; roas: number;
  }>;
  totals: {
    campaigns_with_data: number; total_spend: number; total_leads: number;
    total_clicks: number; oldest_date: string | null; newest_date: string | null;
  };
}

function n(v: any) { return Number(v || 0); }

export default function Diagnostico() {
  const [data, setData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string>('');
  const [actionTypes, setActionTypes] = useState<string[]>([]);

  function loadDebug() {
    setLoading(true);
    setError(null);
    syncApi.debug()
      .then((res) => setData(res?.data || null))
      .catch((e) => setError(e?.response?.data?.error?.message || e?.message || 'Erro ao buscar dados'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadDebug(); }, []);

  async function runSync() {
    setSyncing(true);
    setSyncMsg('');
    setActionTypes([]);
    try {
      const res = await syncApi.meta();
      setSyncMsg(res?.data?.message || 'Sincronizado.');
      setActionTypes(res?.data?.action_types_found || []);
      loadDebug();
    } catch (e: any) {
      setSyncMsg(e?.response?.data?.error?.message || 'Erro ao sincronizar.');
    } finally {
      setSyncing(false);
    }
  }

  const box = { background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '20px', marginBottom: '16px' };
  const th = { padding: '8px 12px', textAlign: 'left' as const, fontSize: '11px', color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' as const };
  const td = { padding: '8px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.8)', borderBottom: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap' as const };

  return (
    <div style={{ minHeight: '100vh', background: '#000', padding: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Database size={22} color={CYAN} />
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Diagnóstico — Dados Brutos do Meta</h1>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Exatamente o que está salvo no banco. Compare com o Meta Ads Manager.</p>
          </div>
        </div>
        <button onClick={runSync} disabled={syncing}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', border: `1px solid ${CYAN}40`, background: `${CYAN}15`, color: CYAN, fontSize: '13px', fontWeight: 600, cursor: syncing ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
          <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
        </button>
      </div>

      {syncMsg && (
        <div style={{ ...box, borderColor: syncMsg.toLowerCase().includes('erro') ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)' }}>
          <p style={{ fontSize: '13px', color: syncMsg.toLowerCase().includes('erro') ? '#ef4444' : '#10b981', fontWeight: 600 }}>{syncMsg}</p>
          {actionTypes.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Tipos de ação que o Meta retornou nesta conta:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {actionTypes.map((t) => (
                  <span key={t} style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '20px', background: 'rgba(61,184,232,0.12)', color: CYAN, fontFamily: 'monospace' }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loading && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Carregando...</p>}

      {error && (
        <div style={{ ...box, borderColor: 'rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={16} color="#ef4444" />
          <p style={{ fontSize: '13px', color: '#ef4444' }}>{error}</p>
        </div>
      )}

      {data && (
        <>
          <div style={box}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>Totais no banco</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              {[
                { l: 'Campanhas com dados', v: n(data.totals?.campaigns_with_data) },
                { l: 'Gasto total', v: `R$ ${n(data.totals?.total_spend).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
                { l: 'Leads totais', v: n(data.totals?.total_leads).toLocaleString('pt-BR') },
                { l: 'Cliques totais', v: n(data.totals?.total_clicks).toLocaleString('pt-BR') },
                { l: 'Período', v: data.totals?.oldest_date ? `${data.totals.oldest_date} → ${data.totals.newest_date}` : '—' },
              ].map(({ l, v }) => (
                <div key={l} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>{l}</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{v}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={box}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>Campanhas salvas ({data.campaigns?.length || 0})</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={th}>Nome</th><th style={th}>Plataforma</th><th style={th}>Status</th><th style={th}>Meta ID</th></tr></thead>
                <tbody>
                  {data.campaigns?.map((c) => (
                    <tr key={c.id}>
                      <td style={td}>{c.name}</td><td style={td}>{c.platform}</td>
                      <td style={td}>{c.status}</td><td style={{ ...td, fontFamily: 'monospace', fontSize: '11px' }}>{c.meta_id || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={box}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Métricas diárias (últimos 60 registros)</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>Cada linha = 1 campanha em 1 dia. Compare estes números com o Meta Ads Manager no mesmo dia.</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={th}>Campanha</th><th style={th}>Data</th><th style={th}>Gasto</th>
                  <th style={th}>Leads</th><th style={th}>Cliques</th><th style={th}>Impressões</th>
                  <th style={th}>CPA</th><th style={th}>CTR</th><th style={th}>CPC</th><th style={th}>ROAS</th>
                </tr></thead>
                <tbody>
                  {data.recent_metrics?.map((m, i) => (
                    <tr key={i}>
                      <td style={td}>{m.campaign_name}</td>
                      <td style={td}>{String(m.date).split('T')[0]}</td>
                      <td style={td}>R$ {n(m.spend).toFixed(2)}</td>
                      <td style={td}>{n(m.leads)}</td>
                      <td style={td}>{n(m.clicks)}</td>
                      <td style={td}>{n(m.impressions)}</td>
                      <td style={td}>R$ {n(m.cpa).toFixed(2)}</td>
                      <td style={td}>{n(m.ctr).toFixed(2)}%</td>
                      <td style={td}>R$ {n(m.cpc).toFixed(2)}</td>
                      <td style={td}>{n(m.roas).toFixed(2)}x</td>
                    </tr>
                  ))}
                  {(!data.recent_metrics || data.recent_metrics.length === 0) && (
                    <tr><td style={td} colSpan={10}>Nenhuma métrica no banco. Clique em "Sincronizar Agora".</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
