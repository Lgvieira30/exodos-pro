import React, { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, RefreshCw, CheckCircle, Unlink, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { integrationsApi, syncApi } from '../lib/api';

const CYAN = '#3DB8E8';

interface Integration {
  id: string; platform: string; account_id: string;
  nickname: string | null; is_active: boolean;
  last_sync_at: string | null; last_sync_status: string;
}

const blank = { app_id: '1277006354634342', app_secret: '', access_token: '', account_id: '', nickname: '' };

export default function Settings() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [form, setForm] = useState(blank);
  const [showForm, setShowForm] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const metaAccounts = integrations.filter((i) => i.platform === 'meta');
  const activeAccount = metaAccounts.find((i) => i.is_active);

  useEffect(() => {
    integrationsApi.list().then((r) => setIntegrations(r.data?.integrations || [])).catch(() => {});
  }, []);

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  }

  async function handleSave() {
    if (!form.access_token || !form.account_id) { flash('Preencha o Access Token e o ID da conta', false); return; }
    setSaving(true);
    try {
      await integrationsApi.save({
        platform: 'meta',
        app_id: form.app_id,
        app_secret: form.app_secret,
        access_token: form.access_token,
        account_id: form.account_id.replace('act_', ''),
        nickname: form.nickname || undefined,
      });
      flash('Conta Meta Ads adicionada e ativada!', true);
      const r = await integrationsApi.list();
      setIntegrations(r.data?.integrations || []);
      setForm(blank);
      setShowForm(false);
    } catch (err: any) {
      flash(err.response?.data?.error?.message || 'Erro ao salvar', false);
    } finally { setSaving(false); }
  }

  async function handleActivate(id: string) {
    setActivating(id);
    try {
      await integrationsApi.activate(id);
      flash('Conta ativada! Sincronize para carregar os dados.', true);
      const r = await integrationsApi.list();
      setIntegrations(r.data?.integrations || []);
    } catch {
      flash('Erro ao ativar conta', false);
    } finally { setActivating(null); }
  }

  async function handleRemove(id: string) {
    try {
      await integrationsApi.remove(id);
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
      flash('Conta removida', true);
    } catch (err: any) { flash(err.response?.data?.error?.message || 'Erro ao remover conta', false); }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const r = await syncApi.meta();
      flash(r.data?.message || 'Sincronizado!', true);
      const r2 = await integrationsApi.list();
      setIntegrations(r2.data?.integrations || []);
    } catch (err: any) {
      flash(err.response?.data?.error?.message || 'Erro ao sincronizar', false);
    } finally { setSyncing(false); }
  }

  const card: React.CSSProperties = { background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', marginBottom: '16px' };
  const input: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
  const label: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' };

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
              <p style={{ fontSize: '11px', color: metaAccounts.length > 0 ? '#10b981' : 'rgba(255,255,255,0.35)' }}>
                {metaAccounts.length > 0 ? `${metaAccounts.length} conta(s) conectada(s)` : 'Nao conectado'}
              </p>
            </div>
          </div>
          {activeAccount && (
            <button onClick={handleSync} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: `1px solid ${CYAN}40`, background: `${CYAN}10`, color: CYAN, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
            </button>
          )}
        </div>

        {/* Lista de contas conectadas */}
        {metaAccounts.length > 0 && (
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {metaAccounts.map((account) => (
              <div key={account.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: '10px',
                background: account.is_active ? `${CYAN}08` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${account.is_active ? CYAN + '30' : 'rgba(255,255,255,0.06)'}`,
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                      {account.nickname || `act_${account.account_id}`}
                    </p>
                    {account.is_active && (
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', color: CYAN, background: `${CYAN}15` }}>
                        ATIVA
                      </span>
                    )}
                  </div>
                  {account.nickname && (
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>act_{account.account_id}</p>
                  )}
                  {account.last_sync_at && (
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '2px' }}>
                      Sync: {new Date(account.last_sync_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {!account.is_active && (
                    <button
                      onClick={() => handleActivate(account.id)}
                      disabled={activating === account.id}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${CYAN}40`, background: `${CYAN}10`, color: CYAN, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {activating === account.id ? '...' : 'Ativar'}
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(account.id)}
                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Unlink size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botão adicionar / formulário */}
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: '100%', justifyContent: 'center' }}
        >
          {showForm ? <ChevronUp size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancelar' : 'Adicionar conta Meta Ads'}
        </button>

        {showForm && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={label}>Nome da conta (opcional)</label>
              <input style={input} value={form.nickname} onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))} placeholder="Ex: Monaco Gestao — Conta Principal" />
            </div>
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
            <button onClick={handleSave} disabled={saving} style={{ padding: '10px', borderRadius: '10px', border: 'none', background: `linear-gradient(135deg, ${CYAN}, #1a8ab8)`, color: '#000', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Save size={14} /> {saving ? 'Salvando...' : 'Salvar e ativar'}
            </button>
          </div>
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
