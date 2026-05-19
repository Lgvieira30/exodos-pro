import React, { useEffect, useState, useCallback } from 'react';
import {
  ChevronDown, ChevronRight, RefreshCw, AlertTriangle,
  CheckCircle, Layers, Image, Megaphone, Star, BarChart3,
} from 'lucide-react';
import { campaignsApi, adSetsApi, syncApi } from '../lib/api';

const CYAN = '#3DB8E8';

interface Campaign {
  id: string; name: string; platform: string; status: string; meta_id?: string;
  total_spend?: number; total_leads?: number; avg_cpa?: number;
  avg_roas?: number; avg_ctr?: number; avg_cpc?: number;
}

interface AdSet {
  id: string; name: string; status: string;
  spend: number; impressions: number; clicks: number; leads: number;
  ctr: number; cpc: number; cpa: number; roas: number; daily_budget: number;
}

interface Ad {
  id: string; name: string; status: string;
  spend: number; impressions: number; clicks: number; leads: number;
  ctr: number; cpc: number; cpa: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  active:    { label: 'Ativa',    color: '#10b981', bg: 'rgba(16,185,129,0.1)',  dot: '#10b981' },
  paused:    { label: 'Pausada',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', dot: '#f59e0b' },
  deleted:   { label: 'Excluída', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   dot: '#ef4444' },
  unknown:   { label: 'Inativo',  color: '#64748b', bg: 'rgba(100,116,139,0.1)', dot: '#64748b' },
  draft:     { label: 'Rascunho', color: '#64748b', bg: 'rgba(100,116,139,0.1)', dot: '#64748b' },
  completed: { label: 'Concluída',color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  dot: '#3b82f6' },
};

function statusCfg(s: string) { return STATUS_CONFIG[s] || STATUS_CONFIG.unknown; }

function scoreAdSet(as: AdSet): number {
  let score = 100;
  if (as.cpa > 0) score -= (as.cpa > 150 ? 40 : as.cpa > 60 ? 20 : 0);
  if (as.ctr > 0) score -= (as.ctr < 0.5 ? 30 : as.ctr < 1 ? 15 : as.ctr < 1.5 ? 5 : 0);
  if (as.roas > 0) score -= (as.roas < 1 ? 40 : as.roas < 2 ? 20 : as.roas < 3 ? 5 : 0);
  return Math.max(0, Math.min(100, score));
}

function actionForScore(score: number, as: AdSet | Ad): { label: string; color: string; bg: string; detail: string } {
  const cpa = as.cpa;
  const ctr = as.ctr;
  if (score >= 75) return { label: 'Escalar', color: '#10b981', bg: 'rgba(16,185,129,0.1)', detail: 'Métricas saudáveis — aumente o orçamento 20%.' };
  if (score >= 55) return { label: 'Monitorar', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', detail: 'Aguarde 3 dias antes de escalar.' };
  if (score >= 35) return {
    label: 'Revisar', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',
    detail: ctr > 0 && ctr < 1 ? 'CTR abaixo de 1% — troque o criativo.' : cpa > 60 ? `CPL R$${cpa.toFixed(0)} alto — revise a landing page.` : 'Revise público e oferta.',
  };
  return {
    label: 'Pausar', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',
    detail: cpa > 150 ? `CPL R$${cpa.toFixed(0)} crítico — pause imediatamente.` : 'Métricas críticas — pause e reformule.',
  };
}

interface DailyRow {
  date: string; label: string; spend: number; impressions: number; clicks: number;
  leads: number; ctr: number; cpc: number; cpa: number; roas: number;
}

function DailyTable({ daily }: { daily: DailyRow[] }) {
  if (!daily.length) return (
    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', padding: '8px 0' }}>Sem dados diários ainda. Sincronize para ver.</p>
  );
  return (
    <div style={{ overflowX: 'auto', marginTop: '10px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr>
            {['Dia', 'Gasto', 'Impressões', 'Cliques', 'CTR', 'CPC', 'Leads', 'CPL'].map((h) => (
              <th key={h} style={{ padding: '4px 10px', textAlign: h === 'Dia' ? 'left' : 'right', color: 'rgba(255,255,255,0.3)', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {daily.map((d) => (
            <tr key={d.date} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <td style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{d.label}</td>
              <td style={{ padding: '5px 10px', textAlign: 'right', color: '#fff' }}>{d.spend > 0 ? `R$${Number(d.spend).toFixed(0)}` : '—'}</td>
              <td style={{ padding: '5px 10px', textAlign: 'right', color: 'rgba(255,255,255,0.5)' }}>{d.impressions > 0 ? Number(d.impressions).toLocaleString('pt-BR') : '—'}</td>
              <td style={{ padding: '5px 10px', textAlign: 'right', color: 'rgba(255,255,255,0.5)' }}>{d.clicks > 0 ? Number(d.clicks).toLocaleString('pt-BR') : '—'}</td>
              <td style={{ padding: '5px 10px', textAlign: 'right', color: Number(d.ctr) >= 2.5 ? '#10b981' : Number(d.ctr) >= 1 ? '#f59e0b' : Number(d.ctr) > 0 ? '#ef4444' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{d.ctr > 0 ? `${Number(d.ctr).toFixed(1)}%` : '—'}</td>
              <td style={{ padding: '5px 10px', textAlign: 'right', color: 'rgba(255,255,255,0.5)' }}>{d.cpc > 0 ? `R$${Number(d.cpc).toFixed(2)}` : '—'}</td>
              <td style={{ padding: '5px 10px', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{d.leads > 0 ? String(d.leads) : '—'}</td>
              <td style={{ padding: '5px 10px', textAlign: 'right', color: Number(d.cpa) <= 60 ? '#10b981' : Number(d.cpa) <= 150 ? '#f59e0b' : Number(d.cpa) > 0 ? '#ef4444' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{d.cpa > 0 ? `R$${Number(d.cpa).toFixed(0)}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MiniMetric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: '52px' }}>
      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '3px', whiteSpace: 'nowrap' }}>{label}</p>
      <p style={{ fontSize: '13px', fontWeight: 700, color: color || '#fff' }}>{value}</p>
    </div>
  );
}

function BestBadge({ label }: { label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '2px 7px', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.25)' }}>
      <Star size={8} /> {label}
    </span>
  );
}

function AdRow({ ad, adSetId, isBest }: { ad: Ad; adSetId: string; isBest: boolean }) {
  const [showDaily, setShowDaily] = useState(false);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const cfg = statusCfg(ad.status);
  const score = scoreAdSet(ad as any);
  const action = actionForScore(score, ad);
  const isActive = ad.status === 'active';

  async function toggleDaily() {
    if (!showDaily && daily.length === 0) {
      setLoadingDaily(true);
      try {
        const res = await adSetsApi.adDaily(adSetId, ad.id);
        setDaily(res.data?.daily || []);
      } catch { /* */ }
      setLoadingDaily(false);
    }
    setShowDaily((v) => !v);
  }

  return (
    <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${isActive ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'}`, marginBottom: '6px', opacity: isActive ? 1 : 0.55 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
          <Image size={13} color="rgba(255,255,255,0.25)" style={{ marginTop: '3px', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: isActive ? '#fff' : 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '320px' }}>{ad.name}</p>
              <span style={{ fontSize: '10px', fontWeight: 600, color: cfg.color, background: cfg.bg, padding: '1px 7px', borderRadius: '8px', flexShrink: 0 }}>{cfg.label}</span>
              {isBest && isActive && <BestBadge label="Melhor anúncio" />}
            </div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: action.color, background: action.bg, padding: '2px 8px', borderRadius: '6px', display: 'inline-block' }}>
              {action.label} — {action.detail}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexShrink: 0 }}>
          {isActive && (
            <>
              <MiniMetric label="CPL" value={ad.cpa > 0 ? `R$${ad.cpa.toFixed(0)}` : '—'} color={ad.cpa > 0 ? (ad.cpa <= 60 ? '#10b981' : ad.cpa <= 150 ? '#f59e0b' : '#ef4444') : undefined} />
              <MiniMetric label="Taxa Cliques" value={ad.ctr > 0 ? `${ad.ctr.toFixed(1)}%` : '—'} color={ad.ctr > 0 ? (ad.ctr >= 2.5 ? '#10b981' : ad.ctr >= 1 ? '#f59e0b' : '#ef4444') : undefined} />
              <MiniMetric label="Leads" value={String(ad.leads || 0)} color="#10b981" />
              <MiniMetric label="Gasto" value={ad.spend > 0 ? `R$${ad.spend.toFixed(0)}` : '—'} />
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${action.color}15`, border: `1px solid ${action.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: action.color }}>{score}</span>
              </div>
            </>
          )}
          {isActive && (
            <button onClick={toggleDaily} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', background: showDaily ? 'rgba(61,184,232,0.08)' : 'transparent', color: showDaily ? CYAN : 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <BarChart3 size={10} />{loadingDaily ? '...' : 'por dia'}
            </button>
          )}
        </div>
      </div>
      {showDaily && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '10px', paddingTop: '4px' }}>
          <DailyTable daily={daily} />
        </div>
      )}
    </div>
  );
}

function AdSetRow({ adSet, isBest }: { adSet: AdSet; isBest: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [showDaily, setShowDaily] = useState(false);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const cfg = statusCfg(adSet.status);
  const score = scoreAdSet(adSet);
  const action = actionForScore(score, adSet);
  const isActive = adSet.status === 'active';

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

  async function toggleDaily(e: React.MouseEvent) {
    e.stopPropagation();
    if (!showDaily && daily.length === 0) {
      setLoadingDaily(true);
      try {
        const res = await adSetsApi.daily(adSet.id);
        setDaily(res.data?.daily || []);
      } catch { /* */ }
      setLoadingDaily(false);
    }
    setShowDaily((v) => !v);
  }

  const bestAd = ads.filter((a) => a.status === 'active').sort((a, b) => {
    const sa = scoreAdSet(a as any), sb = scoreAdSet(b as any);
    return sb - sa;
  })[0];

  return (
    <div style={{ marginBottom: '8px' }}>
      <div
        onClick={toggleAds}
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '12px', cursor: 'pointer', background: expanded ? 'rgba(61,184,232,0.04)' : 'rgba(255,255,255,0.03)', border: `1px solid ${expanded ? CYAN + '25' : 'rgba(255,255,255,0.07)'}`, transition: 'all 0.15s', opacity: isActive ? 1 : 0.6 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
          <div style={{ marginTop: '3px', flexShrink: 0 }}>
            {expanded ? <ChevronDown size={14} color="rgba(255,255,255,0.4)" /> : <ChevronRight size={14} color="rgba(255,255,255,0.4)" />}
          </div>
          <Layers size={13} color={CYAN} style={{ marginTop: '3px', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: isActive ? '#fff' : 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{adSet.name}</p>
              <span style={{ fontSize: '10px', fontWeight: 600, color: cfg.color, background: cfg.bg, padding: '1px 7px', borderRadius: '8px', flexShrink: 0 }}>{cfg.label}</span>
              {isBest && isActive && <BestBadge label="Melhor conjunto" />}
              {adSet.daily_budget > 0 && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>R${adSet.daily_budget.toFixed(0)}/dia</span>}
            </div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: action.color, background: action.bg, padding: '2px 8px', borderRadius: '6px', display: 'inline-block' }}>
              {action.label} — {action.detail}
            </span>
          </div>
        </div>

        {isActive && (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexShrink: 0, marginLeft: '16px' }}>
            <MiniMetric label="CPL" value={adSet.cpa > 0 ? `R$${adSet.cpa.toFixed(0)}` : '—'} color={adSet.cpa > 0 ? (adSet.cpa <= 60 ? '#10b981' : adSet.cpa <= 150 ? '#f59e0b' : '#ef4444') : undefined} />
            <MiniMetric label="Taxa Cliques" value={adSet.ctr > 0 ? `${adSet.ctr.toFixed(1)}%` : '—'} color={adSet.ctr > 0 ? (adSet.ctr >= 2.5 ? '#10b981' : adSet.ctr >= 1 ? '#f59e0b' : '#ef4444') : undefined} />
            <MiniMetric label="ROAS" value={adSet.roas > 0 ? `${adSet.roas.toFixed(1)}x` : '—'} color={adSet.roas >= 3 ? '#10b981' : adSet.roas >= 2 ? '#f59e0b' : adSet.roas > 0 ? '#ef4444' : undefined} />
            <MiniMetric label="Leads" value={String(adSet.leads || 0)} color="#10b981" />
            <MiniMetric label="Gasto" value={adSet.spend > 0 ? `R$${adSet.spend.toFixed(0)}` : '—'} />
            <button onClick={toggleDaily} style={{ padding: '5px 9px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.08)', background: showDaily ? 'rgba(61,184,232,0.1)' : 'transparent', color: showDaily ? CYAN : 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
              <BarChart3 size={11} />{loadingDaily ? '...' : 'por dia'}
            </button>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${action.color}15`, border: `1px solid ${action.color}30`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: action.color, lineHeight: 1 }}>{score}</span>
              <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)', lineHeight: 1 }}>nota</span>
            </div>
          </div>
        )}
      </div>

      {showDaily && (
        <div style={{ marginLeft: '28px', marginTop: '4px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>ÚLTIMOS 7 DIAS — CONJUNTO</p>
          <DailyTable daily={daily} />
        </div>
      )}

      {expanded && (
        <div style={{ marginLeft: '28px', marginTop: '8px' }}>
          {loadingAds ? (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', padding: '12px' }}>Carregando anúncios...</p>
          ) : ads.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', padding: '12px' }}>Nenhum anúncio encontrado. Sincronize primeiro.</p>
          ) : (
            ads.map((ad) => <AdRow key={ad.id} ad={ad} adSetId={adSet.id} isBest={ad.id === bestAd?.id} />)
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
  const cfg = statusCfg(campaign.status);
  const isActive = campaign.status === 'active';

  const toggle = useCallback(async () => {
    if (!expanded && adSets.length === 0) {
      setLoading(true);
      try {
        const res = await adSetsApi.list(campaign.id);
        setAdSets(res.data?.ad_sets || []);
      } catch { /* */ }
      setLoading(false);
    }
    setExpanded((e) => !e);
  }, [expanded, adSets.length, campaign.id]);

  const activeAdSets = adSets.filter((a) => a.status === 'active');
  const bestAdSet = [...activeAdSets].sort((a, b) => scoreAdSet(b) - scoreAdSet(a))[0];

  const totalLeads = adSets.reduce((s, a) => s + a.leads, 0);
  const totalSpend = adSets.reduce((s, a) => s + a.spend, 0);
  const avgCTR = activeAdSets.length > 0 ? activeAdSets.reduce((s, a) => s + a.ctr, 0) / activeAdSets.filter((a) => a.ctr > 0).length : 0;
  const avgCPA = activeAdSets.filter((a) => a.cpa > 0).length > 0
    ? activeAdSets.filter((a) => a.cpa > 0).reduce((s, a) => s + a.cpa, 0) / activeAdSets.filter((a) => a.cpa > 0).length : 0;

  const criticalCount = activeAdSets.filter((a) => scoreAdSet(a) < 35).length;
  const goodCount = activeAdSets.filter((a) => scoreAdSet(a) >= 75).length;

  return (
    <div style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${expanded ? CYAN + '30' : 'rgba(255,255,255,0.07)'}`, borderRadius: '16px', overflow: 'hidden', marginBottom: '12px', transition: 'border-color 0.2s' }}>

      {/* Campaign header row */}
      <div onClick={toggle} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: 0 }}>
          <div style={{ marginTop: '3px', flexShrink: 0 }}>
            {expanded ? <ChevronDown size={18} color="rgba(255,255,255,0.5)" /> : <ChevronRight size={18} color="rgba(255,255,255,0.5)" />}
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${CYAN}15`, border: `1px solid ${CYAN}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Megaphone size={16} color={CYAN} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '400px' }}>{campaign.name}</p>
              <span style={{ fontSize: '11px', fontWeight: 600, color: cfg.color, background: cfg.bg, padding: '2px 9px', borderRadius: '10px', flexShrink: 0 }}>{cfg.label}</span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>{campaign.platform === 'meta' ? 'Meta Ads' : campaign.platform}</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {adSets.length > 0 && (
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{adSets.length} conjuntos · {activeAdSets.length} ativos</span>
              )}
              {criticalCount > 0 && (
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <AlertTriangle size={11} /> {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
                </span>
              )}
              {goodCount > 0 && criticalCount === 0 && (
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <CheckCircle size={11} /> {goodCount} saudável{goodCount > 1 ? 'is' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Campaign summary metrics */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexShrink: 0, marginLeft: '20px' }}>
          {(totalSpend > 0 || isActive) && (
            <>
              <MiniMetric label="CPL Médio" value={avgCPA > 0 ? `R$${avgCPA.toFixed(0)}` : '—'} color={avgCPA > 0 ? (avgCPA <= 60 ? '#10b981' : avgCPA <= 150 ? '#f59e0b' : '#ef4444') : undefined} />
              <MiniMetric label="CTR Médio" value={avgCTR > 0 ? `${avgCTR.toFixed(1)}%` : '—'} color={avgCTR > 0 ? (avgCTR >= 2.5 ? '#10b981' : avgCTR >= 1 ? '#f59e0b' : '#ef4444') : undefined} />
              <MiniMetric label="Leads" value={String(totalLeads)} color={totalLeads > 0 ? '#10b981' : undefined} />
              <MiniMetric label="Gasto 7d" value={totalSpend > 0 ? `R$${totalSpend.toFixed(0)}` : '—'} />
            </>
          )}
        </div>
      </div>

      {/* Best ad set highlight (visible when collapsed and adSets loaded) */}
      {!expanded && bestAdSet && (
        <div style={{ padding: '0 24px 16px' }}>
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Star size={13} color="#f59e0b" />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Melhor conjunto:</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bestAdSet.name}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>Escalar</span>
            {bestAdSet.cpa > 0 && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>CPL R${bestAdSet.cpa.toFixed(0)}</span>}
            {bestAdSet.ctr > 0 && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>CTR {bestAdSet.ctr.toFixed(1)}%</span>}
          </div>
        </div>
      )}

      {/* Expanded: ad sets */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '16px 24px 20px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '20px', color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${CYAN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: '13px' }}>Carregando conjuntos...</span>
            </div>
          ) : adSets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.3)' }}>
              <Layers size={28} style={{ margin: '0 auto 10px', opacity: 0.2 }} />
              <p style={{ fontSize: '13px', marginBottom: '4px' }}>Nenhum conjunto encontrado.</p>
              <p style={{ fontSize: '11px' }}>Sincronize o Meta Ads para ver os conjuntos e anúncios.</p>
            </div>
          ) : (
            <>
              {/* Legend */}
              <div style={{ display: 'flex', gap: '20px', marginBottom: '14px', flexWrap: 'wrap' }}>
                {[
                  { color: '#10b981', label: 'Escalar — CPL ≤ R$60, CTR ≥ 2,5%' },
                  { color: '#3b82f6', label: 'Monitorar — aguardar mais dados' },
                  { color: '#f59e0b', label: 'Revisar — ajustar criativo ou público' },
                  { color: '#ef4444', label: 'Pausar — métricas críticas' },
                ].map(({ color, label }) => (
                  <span key={color} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    {label}
                  </span>
                ))}
              </div>
              {adSets.map((as) => <AdSetRow key={as.id} adSet={as} isBest={as.id === bestAdSet?.id} />)}
            </>
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
      setSyncMsg(res.data?.message || 'Sincronizado com sucesso!');
      const res2 = await campaignsApi.list();
      setCampaigns(res2.data?.campaigns || res2.campaigns || []);
    } catch (e: any) {
      setSyncMsg(e?.response?.data?.error?.message || 'Erro na sincronização.');
    }
    setSyncing(false);
  }

  const active = campaigns.filter((c) => c.status === 'active');
  const paused = campaigns.filter((c) => c.status === 'paused');
  const other = campaigns.filter((c) => c.status !== 'active' && c.status !== 'paused');

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${CYAN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div className="page-pad" style={{ minHeight: '100vh', background: '#000', padding: '32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Campanhas</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
            Clique em uma campanha para ver conjuntos e anúncios.<br />
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>O melhor conjunto é destacado automaticamente com base em CPL, CTR e ROAS.</span>
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 20px', borderRadius: '12px', border: 'none', cursor: syncing ? 'wait' : 'pointer', background: syncing ? 'rgba(255,255,255,0.05)' : CYAN, color: syncing ? 'rgba(255,255,255,0.4)' : '#000', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit' }}
        >
          <RefreshCw size={15} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'Sincronizando...' : 'Sincronizar Meta Ads'}
        </button>
      </div>

      {/* Summary strip */}
      {campaigns.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {[
            { label: 'Campanhas ativas', value: String(active.length), color: '#10b981' },
            { label: 'Pausadas', value: String(paused.length), color: '#f59e0b' },
            { label: 'Total', value: String(campaigns.length), color: 'rgba(255,255,255,0.6)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ padding: '12px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <p style={{ fontSize: '20px', fontWeight: 800, color }}>{value}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sync message */}
      {syncMsg && (
        <div style={{ padding: '12px 18px', borderRadius: '12px', marginBottom: '20px', background: syncMsg.includes('Erro') ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${syncMsg.includes('Erro') ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`, fontSize: '13px', color: syncMsg.includes('Erro') ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {syncMsg.includes('Erro') ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
          {syncMsg}
        </div>
      )}

      {/* Empty state */}
      {campaigns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'rgba(255,255,255,0.3)' }}>
          <Megaphone size={48} style={{ margin: '0 auto 20px', opacity: 0.15 }} />
          <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'rgba(255,255,255,0.5)' }}>Nenhuma campanha encontrada</p>
          <p style={{ fontSize: '13px', lineHeight: 1.7 }}>
            Conecte o Meta Ads em <strong style={{ color: CYAN }}>Configurações</strong> e clique em Sincronizar Meta Ads.
          </p>
        </div>
      ) : (
        <>
          {/* Active campaigns */}
          {active.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>CAMPANHAS ATIVAS ({active.length})</p>
              </div>
              {active.map((c) => <CampaignRow key={c.id} campaign={c} />)}
            </div>
          )}

          {/* Paused campaigns */}
          {paused.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b' }}>PAUSADAS ({paused.length})</p>
              </div>
              {paused.map((c) => <CampaignRow key={c.id} campaign={c} />)}
            </div>
          )}

          {/* Other */}
          {other.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b' }} />
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>OUTRAS ({other.length})</p>
              </div>
              {other.map((c) => <CampaignRow key={c.id} campaign={c} />)}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .page-pad { padding: 20px !important; }
        }
      `}</style>
    </div>
  );
}
