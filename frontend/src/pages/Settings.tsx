import React, { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, RefreshCw, Unlink, Plus, ChevronUp, Settings2 } from 'lucide-react';
import { integrationsApi, syncApi } from '../lib/api';

const GREEN = '#2F7D4F';
const BG = '#F6F7F9';
const BG_CARD = '#FFFFFF';
const BG_SUBTLE = '#F9FAFB';
const FG = '#111827';
const FG_MUTED = '#6B7280';
const FG_SUBTLE = '#9CA3AF';
const BORDER = '#E5E7EB';
const SHADOW = '0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.05)';

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

  const card: React.CSSProperties = {
    background: BG_CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: '18px',
    padding: '24px',
    marginBottom: '16px',
    boxShadow: SHADOW,
  };
  const input: React.CSSProperties = {
    width: '100%',
    background: BG_SUBTLE,
    border: `1px solid ${BORDER}`,
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
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(47,125,79,0.08)', border: '1px solid rgba(47,125,79,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Settings2 size={18} color={GREEN} />
        </div>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: FG, letterSpacing: '-0.02em' }}>Configurações</h1>
          <p style={{ fontSize: '12px', color: FG_MUTED, marginTop: '2px' }}>Conecte suas plataformas de anúncio para sincronizar dados reais</p>
        </div>
      </div>

      {msg && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, color: msg.ok ? '#2F7D4F' : '#DC2626', background: msg.ok ? 'rgba(47,125,79,0.06)' : 'rgba(220,38,38,0.06)', border: `1px solid ${msg.ok ? 'rgba(47,125,79,0.2)' : 'rgba(220,38,38,0.2)'}` }}>
          {msg.text}
        </div>
      )}

      {/* Meta Ads */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(24,119,242,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877f2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: FG }}>Meta Ads</p>
              <p style={{ fontSize: '11px', color: metaAccounts.length > 0 ? '#2F7D4F' : FG_MUTED }}>
                {metaAccounts.length > 0 ? `${metaAccounts.length} conta(s) conectada(s)` : 'Não conectado'}
              </p>
            </div>
          </div>
          {activeAccount && (
            <button onClick={handleSync} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: `1px solid rgba(47,125,79,0.2)`, background: 'rgba(47,125,79,0.06)', color: GREEN, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
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
                background: account.is_active ? 'rgba(47,125,79,0.04)' : BG_SUBTLE,
                border: `1px solid ${account.is_active ? 'rgba(47,125,79,0.2)' : BORDER}`,
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: FG }}>
                      {account.nickname || `act_${account.account_id}`}
                    </p>
                    {account.is_active && (
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', color: GREEN, background: 'rgba(47,125,79,0.08)' }}>
                        ATIVA
                      </span>
                    )}
                  </div>
                  {account.nickname && (
                    <p style={{ fontSize: '11px', color: FG_MUTED, marginTop: '2px' }}>act_{account.account_id}</p>
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
                      style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid rgba(47,125,79,0.2)`, background: 'rgba(47,125,79,0.06)', color: GREEN, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {activating === account.id ? '...' : 'Ativar'}
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(account.id)}
                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.06)', color: '#DC2626', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}
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
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: `1px solid ${BORDER}`, background: BG_SUBTLE, color: FG_MUTED, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: '100%', justifyContent: 'center' }}
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
            <button onClick={handleSave} disabled={saving} style={{ padding: '11px', borderRadius: '11px', border: 'none', background: saving ? BG_SUBTLE : FG, color: saving ? FG_MUTED : '#fff', fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: saving ? 0.7 : 1 }}>
              <Save size={14} /> {saving ? 'Salvando...' : 'Salvar e ativar'}
            </button>
          </div>
        )}
      </div>

      {/* Google Ads - em breve */}
      <div style={{ ...card, opacity: 0.45 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(66,133,244,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: '#4285f4' }}>G</div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: FG }}>Google Ads</p>
            <p style={{ fontSize: '11px', color: FG_MUTED }}>Em breve</p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px', padding: '16px 20px', borderRadius: '14px', background: BG_CARD, border: `1px solid ${BORDER}` }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: FG_MUTED, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Como obter o Access Token</p>
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
