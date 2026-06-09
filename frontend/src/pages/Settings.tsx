import React, { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, RefreshCw, Unlink, Plus, ChevronUp, Settings2 } from 'lucide-react';
import { integrationsApi, syncApi } from '../lib/api';

const BG = '#090909';
const BG_SURFACE = '#0E0F12';
const BG_ELEVATED = '#13141A';
const FG = '#F0F0F0';
const FG_MUTED = 'rgba(240,240,240,0.4)';
const FG_SUBTLE = 'rgba(240,240,240,0.18)';
const BORDER = 'rgba(255,255,255,0.04)';
const BORDER_MED = 'rgba(255,255,255,0.08)';
const S_BLUE = '#3DB8E8';
const S_RED = '#F87171';

interface Integration {
  id: string; platform: string; account_id: string;
  nickname: string | null; is_active: boolean;
  last_sync_at: string | null; last_sync_status: string;
}

const blank = { app_id: '1277006354634342', app_secret: '', access_token: '', account_id: '', nickname: '' };
const blankGoogle = { customer_id: '', developer_token: '', client_id: '', client_secret: '', refresh_token: '', nickname: '' };

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

  const [googleForm, setGoogleForm] = useState(blankGoogle);
  const [showGoogleForm, setShowGoogleForm] = useState(false);
  const [savingGoogle, setSavingGoogle] = useState(false);
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [showGoogleToken, setShowGoogleToken] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [metaOauthLoading, setMetaOauthLoading] = useState(false);

  const metaAccounts = integrations.filter((i) => i.platform === 'meta');
  const googleAccounts = integrations.filter((i) => i.platform === 'google');
  const activeAccount = metaAccounts.find((i) => i.is_active);
  const activeGoogleAccount = googleAccounts.find((i) => i.is_active);

  useEffect(() => {
    integrationsApi.list().then((r) => setIntegrations(r.data?.integrations || [])).catch(() => {});

    // Trata o retorno do OAuth do Google (redirecionado de volta para /settings)
    const params = new URLSearchParams(window.location.search);
    const google = params.get('google');
    if (google === 'connected') {
      const count = params.get('count');
      flash(`Google Ads conectado!${count ? ` ${count} conta(s) encontrada(s).` : ''} Sincronize para carregar os dados.`, true);
      integrationsApi.list().then((r) => setIntegrations(r.data?.integrations || [])).catch(() => {});
    } else if (google === 'error') {
      flash(`Erro ao conectar o Google Ads: ${params.get('message') || 'tente novamente'}`, false);
    }

    const meta = params.get('meta');
    if (meta === 'connected') {
      const count = params.get('count');
      flash(`Meta Ads conectado!${count ? ` ${count} conta(s) encontrada(s).` : ''} Sincronize para carregar os dados.`, true);
      integrationsApi.list().then((r) => setIntegrations(r.data?.integrations || [])).catch(() => {});
    } else if (meta === 'error') {
      flash(`Erro ao conectar o Meta Ads: ${params.get('message') || 'tente novamente'}`, false);
    }

    if (google || meta) window.history.replaceState({}, '', window.location.pathname);
  }, []);

  async function handleMetaOAuth() {
    setMetaOauthLoading(true);
    try {
      const r = await integrationsApi.metaOAuthStart(form.nickname || undefined);
      const url = r.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        flash('Nao foi possivel iniciar o login do Meta', false);
        setMetaOauthLoading(false);
      }
    } catch (err: any) {
      flash(err.response?.data?.error?.message || 'Login do Meta indisponivel. Use a conexao manual abaixo.', false);
      setMetaOauthLoading(false);
    }
  }

  async function handleGoogleOAuth() {
    setOauthLoading(true);
    try {
      const r = await integrationsApi.googleOAuthStart(googleForm.nickname || undefined);
      const url = r.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        flash('Nao foi possivel iniciar o login do Google', false);
        setOauthLoading(false);
      }
    } catch (err: any) {
      flash(err.response?.data?.error?.message || 'Login do Google indisponivel. Use a conexao manual abaixo.', false);
      setOauthLoading(false);
    }
  }

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

  async function handleSaveGoogle() {
    if (!googleForm.customer_id || !googleForm.refresh_token) {
      flash('Preencha o Customer ID e o Refresh Token', false);
      return;
    }
    setSavingGoogle(true);
    try {
      await integrationsApi.save({
        platform: 'google',
        app_id: googleForm.client_id,
        app_secret: googleForm.client_secret,
        access_token: googleForm.refresh_token,
        account_id: googleForm.customer_id,
        nickname: googleForm.nickname,
        developer_token: googleForm.developer_token,
      });
      flash('Google Ads conectado com sucesso!', true);
      setShowGoogleForm(false);
      setGoogleForm(blankGoogle);
      integrationsApi.list().then(r => setIntegrations(r.data?.integrations || []));
    } catch (e: any) {
      flash(e?.response?.data?.error?.message || 'Erro ao salvar', false);
    }
    setSavingGoogle(false);
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

  async function handleSyncGoogle() {
    setSyncingGoogle(true);
    try {
      const r = await syncApi.google();
      flash(r.data?.message || 'Google Ads sincronizado!', true);
      const r2 = await integrationsApi.list();
      setIntegrations(r2.data?.integrations || []);
    } catch (err: any) {
      flash(err.response?.data?.error?.message || 'Erro ao sincronizar Google Ads', false);
    } finally { setSyncingGoogle(false); }
  }

  const card: React.CSSProperties = {
    background: BG_SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: '18px',
    padding: '24px',
    marginBottom: '16px',
  };
  const input: React.CSSProperties = {
    width: '100%',
    background: BG_ELEVATED,
    border: `1px solid ${BORDER_MED}`,
    borderRadius: '10px',
    padding: '10px 14px',
    color: FG,
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };
  const label: React.CSSProperties = {
    display: 'block',
    fontSize: '10px',
    fontWeight: 700,
    color: FG_MUTED,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: '7px',
  };

  return (
    <div className="settings-wrap" style={{ minHeight: '100vh', background: BG, padding: '28px 32px', maxWidth: '680px' }}>
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: BG_ELEVATED, border: `1px solid ${BORDER_MED}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Settings2 size={18} color={FG_MUTED} />
        </div>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: FG, letterSpacing: '-0.02em' }}>Configurações</h1>
          <p style={{ fontSize: '12px', color: FG_MUTED, marginTop: '2px' }}>Conecte suas plataformas de anúncio para sincronizar dados reais</p>
        </div>
      </div>

      {msg && (
        <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', color: FG, background: BG_SURFACE, border: `1px solid ${BORDER_MED}` }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: msg.ok ? S_BLUE : S_RED, flexShrink: 0 }} />
          {msg.text}
        </div>
      )}

      {/* Meta Ads */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: BG_ELEVATED, border: `1px solid ${BORDER_MED}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877f2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: FG }}>Meta Ads</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                {metaAccounts.length > 0 ? (
                  <>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: S_BLUE }} />
                    <p style={{ fontSize: '11px', color: FG_MUTED }}>{metaAccounts.length} conta(s) conectada(s)</p>
                  </>
                ) : (
                  <p style={{ fontSize: '11px', color: FG_SUBTLE }}>Não conectado</p>
                )}
              </div>
            </div>
          </div>
          {activeAccount && (
            <button onClick={handleSync} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: `1px solid ${BORDER_MED}`, background: 'rgba(255,255,255,0.04)', color: FG_MUTED, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
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
                background: BG_ELEVATED,
                border: `1px solid ${BORDER_MED}`,
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: FG }}>
                      {account.nickname || `act_${account.account_id}`}
                    </p>
                    {account.is_active && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: S_BLUE }} />
                        <span style={{ fontSize: '10px', fontWeight: 700, color: FG_MUTED }}>ATIVA</span>
                      </div>
                    )}
                  </div>
                  {account.nickname && (
                    <p style={{ fontSize: '11px', color: FG_SUBTLE, marginTop: '2px' }}>act_{account.account_id}</p>
                  )}
                  {account.last_sync_at && (
                    <p style={{ fontSize: '10px', color: FG_SUBTLE, marginTop: '2px' }}>
                      Sync: {new Date(account.last_sync_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {!account.is_active && (
                    <button
                      onClick={() => handleActivate(account.id)}
                      disabled={activating === account.id}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${BORDER_MED}`, background: 'rgba(255,255,255,0.04)', color: FG_MUTED, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {activating === account.id ? '...' : 'Ativar'}
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(account.id)}
                    style={{ padding: '6px 10px', borderRadius: '8px', border: `1px solid rgba(248,113,113,0.15)`, background: 'rgba(248,113,113,0.06)', color: S_RED, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Unlink size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botão principal: login OAuth com 1 clique */}
        <button
          onClick={handleMetaOAuth}
          disabled={metaOauthLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 14px', borderRadius: '11px', border: 'none', background: metaOauthLoading ? BG_ELEVATED : '#1877f2', color: metaOauthLoading ? FG_SUBTLE : '#fff', fontSize: '13px', fontWeight: 700, cursor: metaOauthLoading ? 'default' : 'pointer', fontFamily: 'inherit', width: '100%', justifyContent: 'center', opacity: metaOauthLoading ? 0.7 : 1 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          {metaOauthLoading ? 'Redirecionando...' : 'Conectar com Facebook'}
        </button>

        {/* Botão secundário: conexão manual (avançado) */}
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', marginTop: '8px', borderRadius: '10px', border: `1px solid ${BORDER_MED}`, background: 'transparent', color: FG_SUBTLE, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: '100%', justifyContent: 'center' }}
        >
          {showForm ? <ChevronUp size={13} /> : <Plus size={13} />}
          {showForm ? 'Cancelar' : 'Conectar manualmente (avançado)'}
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
                <button onClick={() => setShowSecret((s) => !s)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: FG_MUTED, cursor: 'pointer' }}>
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label style={label}>Access Token</label>
              <div style={{ position: 'relative' }}>
                <input style={{ ...input, paddingRight: '40px' }} type={showToken ? 'text' : 'password'} value={form.access_token} onChange={(e) => setForm((f) => ({ ...f, access_token: e.target.value }))} placeholder="EAAxxxxx..." />
                <button onClick={() => setShowToken((s) => !s)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: FG_MUTED, cursor: 'pointer' }}>
                  {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label style={label}>ID da Conta de Anuncios</label>
              <input style={input} value={form.account_id} onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))} placeholder="1709125303555669" />
            </div>
            <button onClick={handleSave} disabled={saving} style={{ padding: '11px', borderRadius: '11px', border: `1px solid ${BORDER_MED}`, background: saving ? BG_ELEVATED : 'rgba(255,255,255,0.08)', color: saving ? FG_SUBTLE : FG, fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: saving ? 0.7 : 1 }}>
              <Save size={14} /> {saving ? 'Salvando...' : 'Salvar e ativar'}
            </button>
          </div>
        )}
      </div>

      {/* Google Ads */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: BG_ELEVATED, border: `1px solid ${BORDER_MED}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: '#4285f4' }}>G</div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: FG }}>Google Ads</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                {googleAccounts.length > 0 ? (
                  <>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: S_BLUE }} />
                    <p style={{ fontSize: '11px', color: FG_MUTED }}>{googleAccounts.length} conta(s) conectada(s)</p>
                  </>
                ) : (
                  <p style={{ fontSize: '11px', color: FG_SUBTLE }}>Não conectado</p>
                )}
              </div>
            </div>
          </div>
          {activeGoogleAccount && (
            <button onClick={handleSyncGoogle} disabled={syncingGoogle} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: `1px solid ${BORDER_MED}`, background: 'rgba(255,255,255,0.04)', color: FG_MUTED, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <RefreshCw size={13} style={{ animation: syncingGoogle ? 'spin 1s linear infinite' : 'none' }} />
              {syncingGoogle ? 'Sincronizando...' : 'Sincronizar agora'}
            </button>
          )}
        </div>

        {/* Lista de contas Google conectadas */}
        {googleAccounts.length > 0 && (
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {googleAccounts.map((account) => (
              <div key={account.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: '10px',
                background: BG_ELEVATED,
                border: `1px solid ${BORDER_MED}`,
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: FG }}>
                      {account.nickname || account.account_id}
                    </p>
                    {account.is_active && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: S_BLUE }} />
                        <span style={{ fontSize: '10px', fontWeight: 700, color: FG_MUTED }}>ATIVA</span>
                      </div>
                    )}
                  </div>
                  {account.nickname && (
                    <p style={{ fontSize: '11px', color: FG_SUBTLE, marginTop: '2px' }}>{account.account_id}</p>
                  )}
                  {account.last_sync_at && (
                    <p style={{ fontSize: '10px', color: FG_SUBTLE, marginTop: '2px' }}>
                      Sync: {new Date(account.last_sync_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {!account.is_active && (
                    <button
                      onClick={() => handleActivate(account.id)}
                      disabled={activating === account.id}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${BORDER_MED}`, background: 'rgba(255,255,255,0.04)', color: FG_MUTED, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {activating === account.id ? '...' : 'Ativar'}
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(account.id)}
                    style={{ padding: '6px 10px', borderRadius: '8px', border: `1px solid rgba(248,113,113,0.15)`, background: 'rgba(248,113,113,0.06)', color: S_RED, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Unlink size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botão principal: login OAuth com 1 clique */}
        <button
          onClick={handleGoogleOAuth}
          disabled={oauthLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 14px', borderRadius: '11px', border: `1px solid ${BORDER_MED}`, background: oauthLoading ? BG_ELEVATED : '#fff', color: oauthLoading ? FG_SUBTLE : '#1f1f1f', fontSize: '13px', fontWeight: 700, cursor: oauthLoading ? 'default' : 'pointer', fontFamily: 'inherit', width: '100%', justifyContent: 'center', opacity: oauthLoading ? 0.7 : 1 }}
        >
          <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          {oauthLoading ? 'Redirecionando...' : 'Entrar com Google'}
        </button>

        {/* Botão secundário: conexão manual (avançado) */}
        <button
          onClick={() => setShowGoogleForm((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', marginTop: '8px', borderRadius: '10px', border: `1px solid ${BORDER_MED}`, background: 'transparent', color: FG_SUBTLE, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: '100%', justifyContent: 'center' }}
        >
          {showGoogleForm ? <ChevronUp size={13} /> : <Plus size={13} />}
          {showGoogleForm ? 'Cancelar' : 'Conectar manualmente (avançado)'}
        </button>

        {showGoogleForm && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={label}>Nome da conta (opcional)</label>
              <input style={input} value={googleForm.nickname} onChange={(e) => setGoogleForm((f) => ({ ...f, nickname: e.target.value }))} placeholder="Ex: Monaco Gestao — Google" />
            </div>
            <div>
              <label style={label}>Customer ID</label>
              <input style={input} value={googleForm.customer_id} onChange={(e) => setGoogleForm((f) => ({ ...f, customer_id: e.target.value }))} placeholder="XXX-XXX-XXXX" />
            </div>
            <div>
              <label style={label}>Developer Token</label>
              <input style={input} value={googleForm.developer_token} onChange={(e) => setGoogleForm((f) => ({ ...f, developer_token: e.target.value }))} placeholder="Google Ads API developer token" />
            </div>
            <div>
              <label style={label}>Client ID</label>
              <input style={input} value={googleForm.client_id} onChange={(e) => setGoogleForm((f) => ({ ...f, client_id: e.target.value }))} placeholder="OAuth2 Client ID" />
            </div>
            <div>
              <label style={label}>Client Secret</label>
              <div style={{ position: 'relative' }}>
                <input style={{ ...input, paddingRight: '40px' }} type={showGoogleSecret ? 'text' : 'password'} value={googleForm.client_secret} onChange={(e) => setGoogleForm((f) => ({ ...f, client_secret: e.target.value }))} placeholder="••••••••••••••••" />
                <button onClick={() => setShowGoogleSecret((s) => !s)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: FG_MUTED, cursor: 'pointer' }}>
                  {showGoogleSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label style={label}>Refresh Token</label>
              <div style={{ position: 'relative' }}>
                <input style={{ ...input, paddingRight: '40px' }} type={showGoogleToken ? 'text' : 'password'} value={googleForm.refresh_token} onChange={(e) => setGoogleForm((f) => ({ ...f, refresh_token: e.target.value }))} placeholder="OAuth2 Refresh Token" />
                <button onClick={() => setShowGoogleToken((s) => !s)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: FG_MUTED, cursor: 'pointer' }}>
                  {showGoogleToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <button onClick={handleSaveGoogle} disabled={savingGoogle} style={{ padding: '11px', borderRadius: '11px', border: `1px solid ${BORDER_MED}`, background: savingGoogle ? BG_ELEVATED : 'rgba(255,255,255,0.08)', color: savingGoogle ? FG_SUBTLE : FG, fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: savingGoogle ? 0.7 : 1 }}>
              <Save size={14} /> {savingGoogle ? 'Salvando...' : 'Salvar e ativar'}
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: '24px', padding: '16px 20px', borderRadius: '14px', background: BG_SURFACE, border: `1px solid ${BORDER}` }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: FG_MUTED, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Como obter o Access Token (Meta)</p>
        <ol style={{ paddingLeft: '16px', margin: 0 }}>
          {[
            'Acesse developers.facebook.com → Ferramentas → Explorador de API',
            'Selecione o app e gere um token com ads_read, ads_management',
            'Para token de longa duração, use a extensão de token (validade 60 dias)',
            'O ID da conta começa com act_ — remova o prefixo ao colar aqui',
          ].map((step, i) => (
            <li key={i} style={{ fontSize: '12px', color: FG_MUTED, marginBottom: '6px', lineHeight: 1.55 }}>{step}</li>
          ))}
        </ol>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .settings-wrap { padding: 20px 16px !important; max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
