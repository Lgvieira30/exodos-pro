import React, { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, RefreshCw, CheckCircle, Unlink } from 'lucide-react';
import { integrationsApi, syncApi } from '../lib/api';

const CYAN = '#3DB8E8';

interface Integration {
  platform: string; account_id: string;
  last_sync_at: string | null; last_sync_status: string;
}

export default function Settings() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [form, setForm] = useState({ app_id: '1277006354634342', app_secret: '', access_token: '', account_id: '' });
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    integrationsApi.list().then((r) => setIntegrations(r.integrations || [])).catch(() => {});
  }, []);

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  }

  async function handleSave() {
    if (!form.access_token || !form.account_id) { flash('Preencha o Access Token e o ID da conta', false); return; }
    setSaving(true);
    try {
      await integrationsApi.save({ platform: 'meta', app_id: form.app_id, app_secret: form.app_secret, access_token: form.access_token, account_id: form.account_id.replace('act_', '') });
      flash('Meta Ads conectado!', true);
      const r = await integrationsApi.list();
      setIntegrations(r.integrations || []);
    } catch (err: any) {
      flash(err.response?.data?.error?.message || 'Erro ao salvar', false);
    } finally { setSaving(false); }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const r = await syncApi.meta();
      flash(r.message || 'Sincronizado!', true);
    } catch (err: any) {
      flash(err.response?.data?.error?.message || 'Erro ao sincronizar', false);
    } finally { setSyncing(false); }
  }

  async function handleDisconnect(platform: string) {
    try { await integrationsApi.remove(platform); setIntegrations((p) => p.filter((i) => i.platform !== platform)); flash('Integracao removida', true); }
    catch { flash('Erro ao remover', false); }
  }

  const metaIntegration = integrations.find((i) => i.platform === 'meta');

  const card: React.CSSProperties = { background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', marginBottom: '16px' };
  const input: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
  const label: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '0.8px', marginBottom: '6px' };

  return (
    <div style={{ minHeight: '100vh', background: '#000', padding: '32px', maxWidth: '640px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Configuracoes</h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Conecte suas plataformas de anuncio para sincronizar dados reais</p>
      </div>

      {msg && (
        <div style={{ marginBottom: '16px', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: msg.ok ? '#10b981' : '#ef4444', background: msg.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
          {msg.text}
        </div>
      )}

      {/* Meta Ads */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(24,119,242,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877f2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Meta Ads</p>
              {metaIntegration ? (
                <p style={{ fontSize: '11px', color: '#10b981' }}>Conectado · conta {metaIntegration.account_id}</p>
              ) : (
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Nao conectado</p>
              )}
            </div>
          </div>
          {metaIntegration && (
            <button onClick={handleSync} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: `1px solid ${CYAN}40`, background: `${CYAN}10`, color: CYAN, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={label}>App ID</label>
            <input style={input} value={form.app_id} onChange={(e) => setForm((f) => ({ ...f, app_id: e.target.value }))} placeholder="1277006354634342" />
          </div>
          <div>
            <label style={label}>App Secret</label>
            <div style={{ position: 'relative' }}>
              <input style={{ ...input, paddingRight: '40px' }} type={showSecret ? 'text' : 'password'} value={form.app_secret} onChange={(e) => setForm((f) => ({ ...f, app_secret: e.target.value }))} placeholder="••••••••••••••••" />
              <button onClick={() => setShowSecret((s) => !s)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label style={label}>Access Token</label>
            <div style={{ position: 'relative' }}>
              <input style={{ ...input, paddingRight: '40px' }} type={showToken ? 'text' : 'password'} value={form.access_token} onChange={(e) => setForm((f) => ({ ...f, access_token: e.target.value }))} placeholder="EAAxxxxx..." />
              <button onClick={() => setShowToken((s) => !s)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label style={label}>ID da Conta de Anuncios</label>
            <input style={input} value={form.account_id} onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))} placeholder="1709125303555669" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: `linear-gradient(135deg, ${CYAN}, #1a8ab8)`, color: '#000', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Save size={14} /> {saving ? 'Salvando...' : 'Salvar e conectar'}
          </button>
          {metaIntegration && (
            <button onClick={() => handleDisconnect('meta')} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Unlink size={14} /> Desconectar
            </button>
          )}
        </div>

        {metaIntegration?.last_sync_at && (
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '10px' }}>
            Ultima sincronizacao: {new Date(metaIntegration.last_sync_at).toLocaleString('pt-BR')} · Status: {metaIntegration.last_sync_status}
          </p>
        )}
      </div>

      {/* Google Ads - em breve */}
      <div style={{ ...card, opacity: 0.5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(66,133,244,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: '#4285f4' }}>G</div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Google Ads</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Em breve</p>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
