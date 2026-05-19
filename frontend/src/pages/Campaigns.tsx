import React, { useEffect, useState, useCallback } from 'react';
import {
  ChevronDown, ChevronRight, RefreshCw, AlertTriangle,
  CheckCircle, Layers, Image, Megaphone, Star, BarChart3,
} from 'lucide-react';
import { campaignsApi, adSetsApi, syncApi } from '../lib/api';

const CYAN = '#3DB8E8';

interface Campaign {
  id: string; name: string; platform: string; status: string; meta_id?: string;
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
interface DailyRow {
  date: string; label: string;
  spend: number; impressions: number; clicks: number; leads: number;
  ctr: number; cpc: number; cpa: number; roas: number;
}

const S: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Ativa',     color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  paused:    { label: 'Pausada',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  deleted:   { label: 'Excluída',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
  unknown:   { label: 'Inativo',   color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  draft:     { label: 'Rascunho',  color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  completed: { label: 'Concluída', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
};
function scfg(s: string) { return S[s] || S.unknown; }

// Always convert to number first to avoid crashes with Postgres string values
function n(v: unknown): number { return Number(v) || 0; }

function score(cpa: number, ctr: number, roas: number): number {
  let s = 100;
  if (cpa > 0) s -= cpa > 150 ? 40 : cpa > 60 ? 20 : 0;
  if (ctr > 0) s -= ctr < 0.5 ? 30 : ctr < 1 ? 15 : ctr < 1.5 ? 5 : 0;
  if (roas > 0) s -= roas < 1 ? 40 : roas < 2 ? 20 : roas < 3 ? 5 : 0;
  return Math.max(0, Math.min(100, s));
}

function action(sc: number, cpa: number, ctr: number): { label: string; color: string; bg: string; why: string } {
  if (sc >= 75) return { label: 'Escalar', color: '#10b981', bg: 'rgba(16,185,129,0.1)', why: 'Métricas saudáveis — aumente o orçamento 20%.' };
  if (sc >= 55) return { label: 'Monitorar', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', why: 'Aguarde 3 dias antes de escalar.' };
  if (sc >= 35) return {
    label: 'Revisar', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',
    why: ctr > 0 && ctr < 1 ? 'CTR abaixo de 1% — troque o criativo.' : cpa > 60 ? `CPL R$${cpa.toFixed(0)} alto — revise a landing page.` : 'Revise público e oferta.',
  };
  return {
    label: 'Pausar', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',
    why: cpa > 150 ? `CPL R$${cpa.toFixed(0)} crítico — pause imediatamente.` : 'Métricas críticas — pause e reformule.',
  };
}

function cplColor(v: number) { return v <= 0 ? 'rgba(255,255,255,0.3)' : v <= 60 ? '#10b981' : v <= 150 ? '#f59e0b' : '#ef4444'; }
function ctrColor(v: number) { return v <= 0 ? 'rgba(255,255,255,0.3)' : v >= 2.5 ? '#10b981' : v >= 1 ? '#f59e0b' : '#ef4444'; }
function roasColor(v: number) { return v <= 0 ? 'rgba(255,255,255,0.3)' : v >= 3 ? '#10b981' : v >= 2 ? '#f59e0b' : '#ef4444'; }

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: '60px' }}>
      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px', whiteSpace: 'nowrap' }}>{label}</p>
      <p style={{ fontSize: '14px', fontWeight: 700, color: color || '#fff' }}>{value}</p>
    </div>
  );
}

function DailyTable({ daily }: { daily: DailyRow[] }) {
  if (!daily.length) return (
    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', padding: '8px 0' }}>Sem dados diários — sincronize para ver.</p>
  );
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr>
            {['Dia', 'Gasto', 'Impressões', 'Cliques', 'CTR', 'CPC', 'Leads', 'CPL'].map((h) => (
              <th key={h} style={{ padding: '5px 10px', textAlign: h === 'Dia' ? 'left' : 'right', color: 'rgba(255,255,255,0.3)', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {daily.map((d) => {
            const dc = n(d.cpa); const dt = n(d.ctr);
            return (
              <tr key={d.date} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '6px 10px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{d.label}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', color: '#fff' }}>{n(d.spend) > 0 ? `R$${n(d.spend).toFixed(0)}` : '—'}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', color: 'rgba(255,255,255,0.5)' }}>{n(d.impressions) > 0 ? n(d.impressions).toLocaleString('pt-BR') : '—'}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', color: 'rgba(255,255,255,0.5)' }}>{n(d.clicks) > 0 ? n(d.clicks).toLocaleString('pt-BR') : '—'}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', color: ctrColor(dt), fontWeight: 600 }}>{dt > 0 ? `${dt.toFixed(1)}%` : '—'}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', color: 'rgba(255,255,255,0.5)' }}>{n(d.cpc) > 0 ? `R$${n(d.cpc).toFixed(2)}` : '—'}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{n(d.leads) > 0 ? String(n(d.leads)) : '—'}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', color: cplColor(dc), fontWeight: 600 }}>{dc > 0 ? `R$${dc.toFixed(0)}` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AdRow({ ad, adSetId, isBest }: { ad: Ad; adSetId: string; isBest: boolean }) {
  const [showDaily, setShowDaily] = useState(false);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(false);

  const cfg = scfg(ad.status);
  const cpa = n(ad.cpa); const ctr = n(ad.ctr); const cpc = n(ad.cpc);
  const leads = n(ad.leads); const spend = n(ad.spend);
  const sc = score(cpa, ctr, 0);
  const act = action(sc, cpa, ctr);
  const isActive = ad.status === 'active';

  async function toggleDaily(e: React.MouseEvent) {
    e.stopPropagation();
    if (!showDaily && daily.length === 0) {
      setLoadingDaily(true);
      try { const res = await adSetsApi.adDaily(adSetId, ad.id); setDaily(res.data?.daily || []); }
      catch { /* */ } finally { setLoadingDaily(false); }
    }
    setShowDaily((v) => !v);
  }

  return (
    <div style={{ borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,${isActive ? '0.06' : '0.03'})`, marginBottom: '6px', overflow: 'hidden', opacity: isActive ? 1 : 0.5 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <Image size={12} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: isActive ? '#fff' : 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{ad.name}</p>
              <span style={{ fontSize: '9px', fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '1px 6px', borderRadius: '6px', flexShrink: 0 }}>{cfg.label}</span>
              {isBest && isActive && (
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '1px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Star size={7} />Melhor anúncio
                </span>
              )}
            </div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: act.color, background: act.bg, padding: '1px 7px', borderRadius: '5px', display: 'inline-block', marginTop: '3px' }}>
              {act.label} — {act.why}
            </span>
          </div>
        </div>
        {isActive && (
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexShrink: 0 }}>
            <Kpi label="CPL" value={cpa > 0 ? `R$${cpa.toFixed(0)}` : '—'} color={cplColor(cpa)} />
            <Kpi label="CTR" value={ctr > 0 ? `${ctr.toFixed(1)}%` : '—'} color={ctrColor(ctr)} />
            <Kpi label="Leads" value={leads > 0 ? String(leads) : '—'} color="#10b981" />
            <Kpi label="Gasto" value={spend > 0 ? `R$${spend.toFixed(0)}` : '—'} />
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: `${act.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: act.color }}>{sc}</span>
            </div>
            <button onClick={toggleDaily} style={{ padding: '4px 8px', borderRadius: '6px', border: `1px solid ${showDaily ? CYAN + '40' : 'rgba(255,255,255,0.08)'}`, background: showDaily ? 'rgba(61,184,232,0.08)' : 'transparent', color: showDaily ? CYAN : 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
              <BarChart3 size={9} />{loadingDaily ? '...' : '7 dias'}
            </button>
          </div>
        )}
      </div>
      {showDaily && (
        <div style={{ padding: '0 14px 12px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <DailyTable daily={daily} />
        </div>
      )}
    </div>
  );
}

function AdSetBlock({ adSet, isBest }: { adSet: AdSet; isBest: boolean }) {
  const [adsExpanded, setAdsExpanded] = useState(false);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [showDaily, setShowDaily] = useState(false);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(false);

  const cfg = scfg(adSet.status);
  const cpa = n(adSet.cpa); const ctr = n(adSet.ctr); const roas = n(adSet.roas);
  const cpc = n(adSet.cpc); const leads = n(adSet.leads); const spend = n(adSet.spend);
  const budget = n(adSet.daily_budget);
  const sc = score(cpa, ctr, roas);
  const act = action(sc, cpa, ctr);
  const isActive = adSet.status === 'active';

  const bestAd = [...ads].filter((a) => a.status === 'active').sort((a, b) => score(n(b.cpa), n(b.ctr), 0) - score(n(a.cpa), n(a.ctr), 0))[0];

  async function loadAds() {
    if (ads.length > 0) { setAdsExpanded((v) => !v); return; }
    setLoadingAds(true);
    try { const res = await adSetsApi.ads(adSet.id); setAds(res.data?.ads || []); setAdsExpanded(true); }
    catch { /* */ } finally { setLoadingAds(false); }
  }

  async function toggleDaily(e: React.MouseEvent) {
    e.stopPropagation();
    if (!showDaily && daily.length === 0) {
      setLoadingDaily(true);
      try { const res = await adSetsApi.daily(adSet.id); setDaily(res.data?.daily || []); }
      catch { /* */ } finally { setLoadingDaily(false); }
    }
    setShowDaily((v) => !v);
  }

  return (
    <div style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.025)', border: `1px solid ${isActive ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)'}`, marginBottom: '8px', overflow: 'hidden', opacity: isActive ? 1 : 0.55 }}>
      {/* Ad set header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <Layers size={13} color={CYAN} style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: isActive ? '#fff' : 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>{adSet.name}</p>
              <span style={{ fontSize: '10px', fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '1px 7px', borderRadius: '7px', flexShrink: 0 }}>{cfg.label}</span>
              {isBest && isActive && (
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '1px 7px', borderRadius: '7px', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                  <Star size={8} />Melhor conjunto
                </span>
              )}
              {budget > 0 && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>R${budget.toFixed(0)}/dia</span>}
            </div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: act.color, background: act.bg, padding: '2px 8px', borderRadius: '6px', display: 'inline-block' }}>
              {act.label} — {act.why}
            </span>
          </div>
        </div>

        {isActive && (
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexShrink: 0 }}>
            <Kpi label="CPL" value={cpa > 0 ? `R$${cpa.toFixed(0)}` : '—'} color={cplColor(cpa)} />
            <Kpi label="CTR" value={ctr > 0 ? `${ctr.toFixed(1)}%` : '—'} color={ctrColor(ctr)} />
            <Kpi label="ROAS" value={roas > 0 ? `${roas.toFixed(1)}x` : '—'} color={roasColor(roas)} />
            <Kpi label="Leads" value={leads > 0 ? String(leads) : '—'} color="#10b981" />
            <Kpi label="Gasto" value={spend > 0 ? `R$${spend.toFixed(0)}` : '—'} />
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: `${act.color}15`, border: `1px solid ${act.color}25`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: act.color, lineHeight: 1 }}>{sc}</span>
              <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.2)' }}>nota</span>
            </div>
            <button onClick={toggleDaily} style={{ padding: '5px 9px', borderRadius: '7px', border: `1px solid ${showDaily ? CYAN + '40' : 'rgba(255,255,255,0.08)'}`, background: showDaily ? 'rgba(61,184,232,0.08)' : 'transparent', color: showDaily ? CYAN : 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
              <BarChart3 size={11} />{loadingDaily ? '...' : '7 dias'}
            </button>
            <button onClick={loadAds} style={{ padding: '5px 9px', borderRadius: '7px', border: `1px solid ${adsExpanded ? CYAN + '40' : 'rgba(255,255,255,0.08)'}`, background: adsExpanded ? 'rgba(61,184,232,0.06)' : 'transparent', color: adsExpanded ? CYAN : 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
              {adsExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}{loadingAds ? '...' : 'anúncios'}
            </button>
          </div>
        )}
      </div>

      {/* Daily table */}
      {showDaily && (
        <div style={{ padding: '0 16px 12px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', padding: '8px 0 4px' }}>ÚLTIMOS 7 DIAS — CONJUNTO</p>
          <DailyTable daily={daily} />
        </div>
      )}

      {/* Ads list */}
      {adsExpanded && (
        <div style={{ padding: '0 16px 12px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', marginBottom: '8px' }}>ANÚNCIOS ({ads.length})</p>
          {ads.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', padding: '8px' }}>Nenhum anúncio. Sincronize para ver.</p>
          ) : (
            ads.map((ad) => <AdRow key={ad.id} ad={ad} adSetId={adSet.id} isBest={ad.id === bestAd?.id} />)
          )}
        </div>
      )}
    </div>
  );
}

function CampaignBlock({ campaign }: { campaign: Campaign }) {
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(campaign.status === 'active');

  const cfg = scfg(campaign.status);
  const isActive = campaign.status === 'active';

  useEffect(() => {
    adSetsApi.list(campaign.id)
      .then((res) => setAdSets(res.data?.ad_sets || []))
      .catch(() => setAdSets([]))
      .finally(() => setLoading(false));
  }, [campaign.id]);

  const activeAdSets = adSets.filter((a) => a.status === 'active');
  const bestAdSet = [...activeAdSets].sort((a, b) => score(n(b.cpa), n(b.ctr), n(b.roas)) - score(n(a.cpa), n(a.ctr), n(a.roas)))[0];

  const totalSpend = adSets.reduce((s, a) => s + n(a.spend), 0);
  const totalLeads = adSets.reduce((s, a) => s + n(a.leads), 0);
  const activeCPAs = activeAdSets.filter((a) => n(a.cpa) > 0);
  const avgCPA = activeCPAs.length > 0 ? activeCPAs.reduce((s, a) => s + n(a.cpa), 0) / activeCPAs.length : 0;
  const activeCTRs = activeAdSets.filter((a) => n(a.ctr) > 0);
  const avgCTR = activeCTRs.length > 0 ? activeCTRs.reduce((s, a) => s + n(a.ctr), 0) / activeCTRs.length : 0;

  const criticals = activeAdSets.filter((a) => score(n(a.cpa), n(a.ctr), n(a.roas)) < 35).length;

  return (
    <div style={{ background: 'rgba(15,23,42,0.85)', border: `2px solid ${isActive ? CYAN + '22' : 'rgba(255,255,255,0.07)'}`, borderRadius: '18px', marginBottom: '16px', overflow: 'hidden' }}>

      {/* Campaign header */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', cursor: 'pointer', gap: '16px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: `${CYAN}15`, border: `1px solid ${CYAN}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Megaphone size={18} color={CYAN} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '5px' }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '380px' }}>{campaign.name}</p>
              <span style={{ fontSize: '11px', fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '2px 9px', borderRadius: '9px', flexShrink: 0 }}>{cfg.label}</span>
            </div>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                {campaign.platform === 'meta' ? 'Meta Ads' : campaign.platform}
              </span>
              {!loading && adSets.length > 0 && (
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                  {adSets.length} conjuntos · {activeAdSets.length} ativos
                </span>
              )}
              {criticals > 0 && (
                <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <AlertTriangle size={11} />{criticals} crítico{criticals > 1 ? 's' : ''}
                </span>
              )}
              {criticals === 0 && activeAdSets.length > 0 && (
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <CheckCircle size={11} />Saudável
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Summary KPIs */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexShrink: 0 }}>
          {totalSpend > 0 && (
            <>
              <Kpi label="CPL Médio" value={avgCPA > 0 ? `R$${avgCPA.toFixed(0)}` : '—'} color={cplColor(avgCPA)} />
              <Kpi label="CTR Médio" value={avgCTR > 0 ? `${avgCTR.toFixed(1)}%` : '—'} color={ctrColor(avgCTR)} />
              <Kpi label="Leads 7d" value={String(totalLeads)} color="#10b981" />
              <Kpi label="Gasto 7d" value={`R$${totalSpend.toFixed(0)}`} />
            </>
          )}
          <div style={{ color: 'rgba(255,255,255,0.3)' }}>
            {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </div>
        </div>
      </div>

      {/* Best ad set strip (when collapsed) */}
      {!expanded && bestAdSet && (
        <div style={{ margin: '0 24px 16px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Star size={12} color="#f59e0b" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>Melhor conjunto:</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bestAdSet.name}</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', flexShrink: 0 }}>Escalar</span>
          {n(bestAdSet.cpa) > 0 && <span style={{ fontSize: '11px', color: cplColor(n(bestAdSet.cpa)), flexShrink: 0 }}>CPL R${n(bestAdSet.cpa).toFixed(0)}</span>}
        </div>
      )}

      {/* Expanded: ad sets */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px 20px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${CYAN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: '12px' }}>Carregando conjuntos...</span>
            </div>
          ) : adSets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.3)' }}>
              <Layers size={24} style={{ margin: '0 auto 10px', opacity: 0.2 }} />
              <p style={{ fontSize: '13px' }}>Nenhum conjunto encontrado.</p>
              <p style={{ fontSize: '11px', marginTop: '4px' }}>Sincronize o Meta Ads para ver os conjuntos e anúncios.</p>
            </div>
          ) : (
            <>
              {/* Legend */}
              <div style={{ display: 'flex', gap: '18px', marginBottom: '14px', flexWrap: 'wrap' }}>
                {[
                  { color: '#10b981', txt: 'Escalar — CPL ≤ R$60, CTR ≥ 2,5%' },
                  { color: '#3b82f6', txt: 'Monitorar — aguardar mais dados' },
                  { color: '#f59e0b', txt: 'Revisar — ajustar criativo ou público' },
                  { color: '#ef4444', txt: 'Pausar — métricas críticas' },
                ].map(({ color, txt }) => (
                  <span key={color} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />{txt}
                  </span>
                ))}
              </div>
              {adSets.map((as) => (
                <AdSetBlock key={as.id} adSet={as} isBest={as.id === bestAdSet?.id} />
              ))}
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

  const load = useCallback(() => {
    campaignsApi.list()
      .then((res) => setCampaigns(res.data?.campaigns || res.campaigns || []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSync() {
    setSyncing(true); setSyncMsg('');
    try {
      const res = await syncApi.meta();
      setSyncMsg(res.data?.message || 'Sincronizado com sucesso!');
      load();
    } catch (e: any) {
      setSyncMsg(e?.response?.data?.error?.message || 'Erro na sincronização.');
    }
    setSyncing(false);
  }

  const active = campaigns.filter((c) => c.status === 'active');
  const paused = campaigns.filter((c) => c.status === 'paused');
  const other  = campaigns.filter((c) => c.status !== 'active' && c.status !== 'paused');

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${CYAN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div className="page-pad" style={{ minHeight: '100vh', background: '#000', padding: '32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Campanhas</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            Campanhas ativas expandem automaticamente com seus conjuntos de anúncios.
          </p>
        </div>
        <button
          onClick={handleSync} disabled={syncing}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 20px', borderRadius: '12px', border: 'none', cursor: syncing ? 'wait' : 'pointer', background: syncing ? 'rgba(255,255,255,0.05)' : CYAN, color: syncing ? 'rgba(255,255,255,0.4)' : '#000', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit' }}
        >
          <RefreshCw size={15} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'Sincronizando...' : 'Sincronizar Meta Ads'}
        </button>
      </div>

      {/* Counters */}
      {campaigns.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {[
            { label: 'Ativas', value: active.length, color: '#10b981' },
            { label: 'Pausadas', value: paused.length, color: '#f59e0b' },
            { label: 'Total', value: campaigns.length, color: 'rgba(255,255,255,0.5)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, color }}>{value}</span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sync message */}
      {syncMsg && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', background: syncMsg.includes('Erro') ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${syncMsg.includes('Erro') ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`, fontSize: '13px', color: syncMsg.includes('Erro') ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {syncMsg.includes('Erro') ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
          {syncMsg}
        </div>
      )}

      {campaigns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'rgba(255,255,255,0.3)' }}>
          <Megaphone size={48} style={{ margin: '0 auto 20px', opacity: 0.15 }} />
          <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'rgba(255,255,255,0.5)' }}>Nenhuma campanha encontrada</p>
          <p style={{ fontSize: '13px' }}>Conecte o Meta Ads em <strong style={{ color: CYAN }}>Configurações</strong> e clique em Sincronizar.</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', letterSpacing: '0.05em' }}>CAMPANHAS ATIVAS ({active.length})</p>
              </div>
              {active.map((c) => <CampaignBlock key={c.id} campaign={c} />)}
            </section>
          )}
          {paused.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', letterSpacing: '0.05em' }}>PAUSADAS ({paused.length})</p>
              </div>
              {paused.map((c) => <CampaignBlock key={c.id} campaign={c} />)}
            </section>
          )}
          {other.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b', display: 'inline-block' }} />
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>OUTRAS ({other.length})</p>
              </div>
              {other.map((c) => <CampaignBlock key={c.id} campaign={c} />)}
            </section>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) { .page-pad { padding: 16px !important; } }
      `}</style>
    </div>
  );
}
