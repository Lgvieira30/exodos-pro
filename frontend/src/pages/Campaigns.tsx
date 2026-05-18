import React, { useEffect, useState } from 'react';
import {
  ChevronDown, ChevronRight, RefreshCw, AlertTriangle,
  CheckCircle, TrendingDown, Layers, Image, Megaphone,
} from 'lucide-react';
import { campaignsApi, adSetsApi, syncApi } from '../lib/api';

const CYAN = '#3DB8E8';

interface Campaign {
  id: string; name: string; platform: string; status: string;
  meta_id?: string;
}

interface AdSet {
  id: string; name: string; status: string;
  spend: number; impressions: number; clicks: number; leads: number;
  ctr: number; cpc: number; cpa: number; roas: number;
  daily_budget: number;
}

interface Ad {
  id: string; name: string; status: string;
  spend: number; impressions: number; clicks: number; leads: number;
  ctr: number; cpc: number; cpa: number;
}

function statusColor(status: string) {
  if (status === 'active') return '#10b981';
  if (status === 'paused') return '#f59e0b';
  return '#ef4444';
}

function diagCTR(ctr: number) {
  if (ctr <= 0) return null;
  if (ctr < 1) return { label: 'CTR crítico', color: '#ef4444', tip: 'Troque o criativo — menos de 1% clica.' };
  if (ctr < 1.5) return { label: 'CTR baixo', color: '#f59e0b', tip: 'Teste nova headline ou imagem.' };
  return { label: 'CTR ok', color: '#10b981', tip: 'Criativo engajando bem.' };
}

function diagCPA(cpa: number) {
  if (cpa <= 0) return null;
  if (cpa > 100) return { label: 'CPA crítico', color: '#ef4444', tip: 'Pause e revise o funil.' };
  if (cpa > 60) return { label: 'CPA alto', color: '#f59e0b', tip: 'Revise landing page e formulário.' };
  if (cpa > 40) return { label: 'CPA ok', color: '#3b82f6', tip: 'Monitore e teste criativos.' };
  return { label: 'CPA excelente', color: '#10b981', tip: 'Escale o orçamento.' };
}

function MetricBadge({ label, value, diag }: { label: string; value: string; diag?: { color: string } | null }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginBottom: '2px' }}>{label}</p>
      <p style={{ fontSize: '14px', fontWeight: 700, color: diag?.color || '#fff' }}>{value}</p>
    </div>
  );
}

function AdRow({ ad }: { ad: Ad }) {
  const ctrDiag = diagCTR(ad.ctr);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 16px', borderRadius: '8px',
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
      marginBottom: '6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
        <Image size={13} color="rgba(255,255,255,0.3)" />
        <div style={{ overflow: 'hidden' }}>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ad.name}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor(ad.status) }} />
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{ad.status}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <MetricBadge label="CTR" value={ad.ctr > 0 ? `${ad.ctr.toFixed(1)}%` : '—'} diag={ctrDiag} />
        <MetricBadge label="CPC" value={ad.cpc > 0 ? `R$${ad.cpc.toFixed(2)}` : '—'} />
        <MetricBadge label="Leads" value={String(ad.leads || 0)} />
        <MetricBadge label="Gasto" value={ad.spend > 0 ? `R$${ad.spend.toFixed(0)}` : '—'} />
        {ctrDiag && (
          <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', color: ctrDiag.color, background: `${ctrDiag.color}15`, whiteSpace: 'nowrap' }}>
            {ctrDiag.label}
          </span>
        )}
      </div>
    </div>
  );
}

function AdSetRow({ adSet }: { adSet: AdSet }) {
  const [expanded, setExpanded] = useState(false);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const ctrDiag = diagCTR(adSet.ctr);
  const cpaDiag = diagCPA(adSet.cpa);

  async function toggleAds() {
    if (!expanded && ads.length === 0) {
      setLoadingAds(true);
      try {
        const res = await adSetsApi.ads(adSet.id);
        setAds(res.data?.ads || []);
      } catch { /* */ }
      setLoadingAds(false);
    }
    setExpanded((e) => !e);
  }

  const worstDiag = cpaDiag?.color === '#ef4444' ? cpaDiag : ctrDiag?.color === '#ef4444' ? ctrDiag : cpaDiag || ctrDiag;

  return (
    <div style={{ marginBottom: '6px' }}>
      <div
        onClick={toggleAds}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderRadius: '10px', cursor: 'pointer',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          transition: 'border-color 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          {expanded ? <ChevronDown size={14} color="rgba(255,255,255,0.4)" /> : <ChevronRight size={14} color="rgba(255,255,255,0.4)" />}
          <Layers size={13} color="rgba(255,255,255,0.4)" />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{adSet.name}</p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor(adSet.status) }} />
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{adSet.status}</span>
              {adSet.daily_budget > 0 && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>R${adSet.daily_budget.toFixed(0)}/dia</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <MetricBadge label="Impressões" value={adSet.impressions > 0 ? adSet.impressions.toLocaleString('pt-BR') : '—'} />
          <MetricBadge label="CTR" value={adSet.ctr > 0 ? `${adSet.ctr.toFixed(1)}%` : '—'} diag={ctrDiag} />
          <MetricBadge label="CPC" value={adSet.cpc > 0 ? `R$${adSet.cpc.toFixed(2)}` : '—'} />
          <MetricBadge label="CPA" value={adSet.cpa > 0 ? `R$${adSet.cpa.toFixed(0)}` : '—'} diag={cpaDiag} />
          <MetricBadge label="ROAS" value={adSet.roas > 0 ? `${adSet.roas.toFixed(1)}x` : '—'} />
          <MetricBadge label="Leads" value={String(adSet.leads || 0)} />
          <MetricBadge label="Gasto" value={adSet.spend > 0 ? `R$${adSet.spend.toFixed(0)}` : '—'} />
          {worstDiag && (
            <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', color: worstDiag.color, background: `${worstDiag.color}15`, whiteSpace: 'nowrap' }}>
              {worstDiag.tip}
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ marginLeft: '24px', marginTop: '6px' }}>
          {loadingAds ? (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', padding: '8px' }}>Carregando anúncios...</p>
          ) : ads.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', padding: '8px' }}>Nenhum anúncio encontrado. Sincronize primeiro.</p>
          ) : (
            ads.map((ad) => <AdRow key={ad.id} ad={ad} />)
          )}
        </div>
      )}
    </div>
  );
}

function CampaignRow({ campaign }: { campaign: Campaign }) {
  const [expanded, setExpanded] = useState(false);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!expanded && adSets.length === 0) {
      setLoading(true);
      try {
        const res = await adSetsApi.list(campaign.id);
        setAdSets(res.data?.ad_sets || []);
      } catch { /* */ }
      setLoading(false);
    }
    setExpanded((e) => !e);
  }

  const totalSpend = adSets.reduce((s, a) => s + a.spend, 0);
  const totalLeads = adSets.reduce((s, a) => s + a.leads, 0);
  const avgCTR = adSets.length > 0 ? adSets.reduce((s, a) => s + a.ctr, 0) / adSets.filter((a) => a.ctr > 0).length : 0;

  const criticalAdSets = adSets.filter((a) => a.ctr > 0 && a.ctr < 1).length;
  const warningAdSets = adSets.filter((a) => a.ctr >= 1 && a.ctr < 1.5).length;

  return (
    <div style={{
      background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '14px', overflow: 'hidden', marginBottom: '10px',
    }}>
      <div
        onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          {expanded ? <ChevronDown size={16} color="rgba(255,255,255,0.5)" /> : <ChevronRight size={16} color="rgba(255,255,255,0.5)" />}
          <Megaphone size={15} color={CYAN} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{campaign.name}</p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '3px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusColor(campaign.status) }} />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{campaign.platform} · {campaign.status}</span>
              {adSets.length > 0 && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>{adSets.length} conjuntos</span>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          {adSets.length > 0 && (
            <>
              <MetricBadge label="CTR médio" value={avgCTR > 0 ? `${avgCTR.toFixed(1)}%` : '—'} diag={diagCTR(avgCTR)} />
              <MetricBadge label="Leads" value={String(totalLeads)} />
              <MetricBadge label="Gasto 7d" value={totalSpend > 0 ? `R$${totalSpend.toFixed(0)}` : '—'} />
            </>
          )}
          {criticalAdSets > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle size={12} color="#ef4444" />
              <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>{criticalAdSets} crítico{criticalAdSets > 1 ? 's' : ''}</span>
            </div>
          )}
          {criticalAdSets === 0 && warningAdSets > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <AlertTriangle size={12} color="#f59e0b" />
              <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>{warningAdSets} atenção</span>
            </div>
          )}
          {criticalAdSets === 0 && warningAdSets === 0 && adSets.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <CheckCircle size={12} color="#10b981" />
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>Saudável</span>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 20px 16px' }}>
          {loading ? (
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px' }}>Carregando conjuntos...</p>
          ) : adSets.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px' }}>
              Nenhum conjunto encontrado. Faça uma sincronização primeiro.
            </p>
          ) : (
            adSets.map((as) => <AdSetRow key={as.id} adSet={as} />)
          )}
        </div>
      )}
    </div>
  );
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    campaignsApi.list()
      .then((res) => setCampaigns(res.data?.campaigns || res.campaigns || []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await syncApi.meta();
      setSyncMsg(res.data?.message || 'Sincronizado!');
      const res2 = await campaignsApi.list();
      setCampaigns(res2.data?.campaigns || res2.campaigns || []);
    } catch (e: any) {
      setSyncMsg(e?.response?.data?.error?.message || 'Erro na sincronização.');
    }
    setSyncing(false);
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${CYAN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div className="page-pad" style={{ minHeight: '100vh', background: '#000', padding: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Campanhas</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
            Clique em uma campanha para ver conjuntos e anúncios com métricas detalhadas.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '9px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            background: syncing ? 'rgba(255,255,255,0.05)' : CYAN,
            color: syncing ? 'rgba(255,255,255,0.4)' : '#000',
            fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'Sincronizando...' : 'Sincronizar Meta'}
        </button>
      </div>

      {syncMsg && (
        <div style={{
          padding: '10px 16px', borderRadius: '10px', marginBottom: '20px',
          background: syncMsg.includes('Erro') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
          border: `1px solid ${syncMsg.includes('Erro') ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
          fontSize: '13px', color: syncMsg.includes('Erro') ? '#ef4444' : '#10b981',
        }}>
          {syncMsg}
        </div>
      )}

      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <TrendingDown size={14} color="rgba(255,255,255,0.3)" />
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
          CTR: <span style={{ color: '#10b981' }}>verde ≥ 1.5%</span> · <span style={{ color: '#f59e0b' }}>amarelo 1–1.5%</span> · <span style={{ color: '#ef4444' }}>vermelho &lt; 1%</span>
        </span>
      </div>

      {campaigns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
          <Megaphone size={40} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
          <p style={{ fontSize: '15px', marginBottom: '8px' }}>Nenhuma campanha encontrada.</p>
          <p style={{ fontSize: '13px' }}>Conecte o Meta Ads em Configurações e clique em Sincronizar.</p>
        </div>
      ) : (
        campaigns.map((c) => <CampaignRow key={c.id} campaign={c} />)
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
