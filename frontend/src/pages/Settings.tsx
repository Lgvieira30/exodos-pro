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
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [showGoogleToken, setShowGoogleToken] = useState(false);

  const metaAccounts = integrations.filter((i) => i.platform === 'meta');
  const googleAccounts = integrations.filter((i) => i.platform === 'google');
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
    <div style={{ minHeight: '100vh', background: BG, padding: '28px 32px', maxWidth: '680px' }}>
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

        {/* Botão adicionar / formulário */}
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: `1px solid ${BORDER_MED}`, background: 'rgba(255,255,255,0.04)', color: FG_MUTED, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: '100%', justifyContent: 'center' }}
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

        {/* Botão adicionar / formulário Google */}
        <button
          onClick={() => setShowGoogleForm((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: `1px solid ${BORDER_MED}`, background: 'rgba(255,255,255,0.04)', color: FG_MUTED, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: '100%', justifyContent: 'center' }}
        >
          {showGoogleForm ? <ChevronUp size={14} /> : <Plus size={14} />}
          {showGoogleForm ? 'Cancelar' : 'Adicionar conta Google Ads'}
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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
