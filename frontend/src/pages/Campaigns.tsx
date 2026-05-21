import { useEffect, useState, useCallback, useRef } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, Layers } from 'lucide-react';
import { campaignsApi, adSetsApi, syncApi } from '../lib/api';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG          = '#090909';
const BG_SURFACE  = '#0E0F12';
const BG_ELEVATED = '#13141A';
const BG_HOVER    = 'rgba(255,255,255,0.03)';
const FG          = '#F0F0F0';
const FG_MUTED    = 'rgba(240,240,240,0.4)';
const FG_SUBTLE   = 'rgba(240,240,240,0.18)';
const BORDER      = 'rgba(255,255,255,0.04)';
const BORDER_MED  = 'rgba(255,255,255,0.08)';
const S_BLUE     = '#3DB8E8';
const S_YELLOW    = '#FACC15';
const S_RED       = '#F87171';

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  meta_id?: string;
}

interface AdSet {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  daily_budget: number;
}

export interface Ad {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  ctr: number;
  cpc: number;
  cpa: number;
}

export interface DailyRow {
  date: string;
  label: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function n(v: unknown): number { return Number(v) || 0; }

function score(cpa: number, ctr: number, roas: number): number {
  let s = 100;
  if (cpa  > 0) s -= cpa  > 150 ? 40 : cpa  > 60  ? 20 : 0;
  if (ctr  > 0) s -= ctr  < 0.5 ? 30 : ctr  < 1   ? 15 : ctr < 1.5 ? 5 : 0;
  if (roas > 0) s -= roas < 1   ? 40 : roas < 2   ? 20 : roas < 3  ? 5 : 0;
  return Math.max(0, Math.min(100, s));
}

function action(sc: number, cpa: number, ctr: number): { label: string; dotColor: string; why: string } {
  if (sc >= 75) return { label: 'Escalar',   dotColor: S_BLUE,  why: 'Métricas saudáveis — aumente o orçamento 20%.' };
  if (sc >= 55) return { label: 'Monitorar', dotColor: S_BLUE,   why: 'Aguarde 3 dias antes de escalar.' };
  if (sc >= 35) return {
    label: 'Revisar', dotColor: S_YELLOW,
    why: ctr > 0 && ctr < 1
      ? 'CTR abaixo de 1%.'
      : cpa > 60
        ? `CPL R$${cpa.toFixed(0)} alto.`
        : 'Revise público e oferta.',
  };
  return {
    label: 'Pausar', dotColor: S_RED,
    why: cpa > 150 ? `CPL R$${cpa.toFixed(0)} crítico.` : 'Métricas críticas.',
  };
}

function statusDot(status: string): string {
  if (status === 'active')  return S_BLUE;
  if (status === 'paused')  return S_YELLOW;
  if (status === 'deleted') return S_RED;
  return 'rgba(240,240,240,0.2)';
}

function cplColor(v: number): string {
  return v <= 0 ? FG_SUBTLE : v <= 60 ? S_BLUE : v <= 150 ? S_YELLOW : S_RED;
}

function ctrColor(v: number): string {
  return v <= 0 ? FG_SUBTLE : v >= 2.5 ? S_BLUE : v >= 1 ? S_YELLOW : S_RED;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: BG_SURFACE,
      border: `1px solid ${BORDER}`,
      borderRadius: '10px',
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <p style={{ fontSize: '10px', fontWeight: 600, color: FG_SUBTLE, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontSize: '22px', fontWeight: 700, color: FG, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: '11px', color: FG_MUTED }}>{sub}</p>}
    </div>
  );
}

// ─── Table column header ───────────────────────────────────────────────────────
const COL_TEMPLATE = '1fr 80px 90px 70px 60px 100px 60px';
const COL_HEADERS  = ['Campanhas / Conjuntos', 'Status', 'CPL', 'CTR', 'Leads', 'Gasto', 'Ações'];

// ─── AdSetRow ─────────────────────────────────────────────────────────────────
function AdSetRow({ adSet }: { adSet: AdSet }) {
  const cpa  = n(adSet.cpa);
  const ctr  = n(adSet.ctr);
  const sc   = score(cpa, ctr, n(adSet.roas));
  const act  = action(sc, cpa, ctr);
  const budget = n(adSet.daily_budget);

  return (
    <div
      className="row-hover"
      style={{
        display: 'grid',
        gridTemplateColumns: COL_TEMPLATE,
        padding: '10px 20px 10px 52px',
        borderBottom: `1px solid ${BORDER}`,
        transition: 'background 0.1s',
        opacity: adSet.status === 'active' ? 1 : 0.5,
      }}
    >
      {/* Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: act.dotColor, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <p style={{
            fontSize: '12px', color: FG,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px',
          }}>{adSet.name}</p>
          {(budget > 0 || act.label) && (
            <p style={{ fontSize: '10px', color: FG_SUBTLE, marginTop: '1px' }}>
              {budget > 0 ? `R$${budget.toFixed(0)}/dia` : ''}
              {budget > 0 && act.label ? ' • ' : ''}
              {act.label}
            </p>
          )}
        </div>
      </div>

      {/* Status dot */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusDot(adSet.status) }} />
      </div>

      {/* CPL */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '12px', fontWeight: 500, color: cpa > 0 ? FG : FG_SUBTLE }}>
          {cpa > 0 ? `R$ ${cpa.toFixed(2)}` : '—'}
        </span>
      </div>

      {/* CTR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '12px', color: ctr > 0 ? FG : FG_SUBTLE }}>
          {ctr > 0 ? `${ctr.toFixed(1)}%` : '—'}
        </span>
      </div>

      {/* Leads */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '12px', color: FG }}>
          {n(adSet.leads) > 0 ? n(adSet.leads) : '—'}
        </span>
      </div>

      {/* Gasto */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '12px', color: FG_MUTED }}>
          {n(adSet.spend) > 0
            ? `R$ ${n(adSet.spend).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            : '—'}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '14px', color: FG_SUBTLE, cursor: 'pointer', letterSpacing: '1px' }}>···</span>
      </div>
    </div>
  );
}

// ─── CampaignRow ──────────────────────────────────────────────────────────────
interface CampaignRowProps {
  campaign: Campaign;
  onAdSetsLoaded: (campaignId: string, adSets: AdSet[]) => void;
  defaultExpanded?: boolean;
}

function CampaignRow({ campaign, onAdSetsLoaded, defaultExpanded = true }: CampaignRowProps) {
  const [expanded, setExpanded]   = useState(defaultExpanded);
  const [adSets,   setAdSets]     = useState<AdSet[]>([]);
  const [loading,  setLoading]    = useState(false);
  const loaded = useRef(false);

  // Load ad sets on mount (always, so KPIs are computed even when collapsed)
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    setLoading(true);
    adSetsApi.list(campaign.id)
      .then((res) => {
        const sets: AdSet[] = res.data?.ad_sets || res.ad_sets || [];
        setAdSets(sets);
        onAdSetsLoaded(campaign.id, sets);
      })
      .catch(() => {
        setAdSets([]);
        onAdSetsLoaded(campaign.id, []);
      })
      .finally(() => setLoading(false));
  }, [campaign.id, onAdSetsLoaded]);

  const activeAdSets = adSets.filter((a) => a.status === 'active');
  const totalLeads  = adSets.reduce((s, a) => s + n(a.leads), 0);
  const totalSpend  = adSets.reduce((s, a) => s + n(a.spend), 0);

  const cpaItems = activeAdSets.filter((a) => n(a.cpa) > 0);
  const avgCPL   = cpaItems.length > 0
    ? cpaItems.reduce((s, a) => s + n(a.cpa), 0) / cpaItems.length
    : 0;

  const ctrItems = activeAdSets.filter((a) => n(a.ctr) > 0);
  const avgCTR   = ctrItems.length > 0
    ? ctrItems.reduce((s, a) => s + n(a.ctr), 0) / ctrItems.length
    : 0;

  const dot = statusDot(campaign.status);

  function handleRowClick() {
    setExpanded((v) => !v);
  }

  return (
    <div>
      {/* Campaign row */}
      <div
        onClick={handleRowClick}
        className="row-hover"
        style={{
          display: 'grid',
          gridTemplateColumns: COL_TEMPLATE,
          padding: '12px 20px',
          cursor: 'pointer',
          transition: 'background 0.1s',
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        {/* Col 1: name + meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span style={{ color: FG_SUBTLE, flexShrink: 0 }}>
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
          <Layers size={14} color={FG_SUBTLE} style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <p style={{
              fontSize: '13px', fontWeight: 500, color: FG, letterSpacing: '-0.01em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{campaign.name}</p>
            <p style={{ fontSize: '11px', color: FG_MUTED, marginTop: '2px' }}>
              {campaign.platform === 'meta' ? 'Meta Ads' : campaign.platform}
              {adSets.length > 0 && ` • ${adSets.length} conjuntos`}
              {totalLeads  > 0 && ` • ${totalLeads} leads`}
              {avgCPL      > 0 && ` • CPL R$${avgCPL.toFixed(0)}`}
            </p>
          </div>
        </div>

        {/* Status dot */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot }} />
        </div>

        {/* CPL */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: avgCPL > 0 ? FG : FG_SUBTLE }}>
            {avgCPL > 0 ? `R$ ${avgCPL.toFixed(2)}` : loading ? '…' : '—'}
          </span>
        </div>

        {/* CTR */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '13px', color: avgCTR > 0 ? FG : FG_SUBTLE }}>
            {avgCTR > 0 ? `${avgCTR.toFixed(1)}%` : loading ? '…' : '—'}
          </span>
        </div>

        {/* Leads */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: FG }}>
            {loading ? '…' : totalLeads > 0 ? totalLeads : '—'}
          </span>
        </div>

        {/* Gasto */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '13px', color: FG_MUTED }}>
            {loading
              ? '…'
              : totalSpend > 0
                ? `R$ ${totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                : '—'}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <span
            style={{ fontSize: '16px', color: FG_SUBTLE, cursor: 'pointer', letterSpacing: '1px' }}
            onClick={(e) => e.stopPropagation()}
          >···</span>
        </div>
      </div>

      {/* Expanded ad sets */}
      {expanded && (
        <div style={{ borderBottom: `1px solid ${BORDER}` }}>
          {loading ? (
            <div style={{ padding: '14px 20px 14px 52px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '14px', height: '14px', borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.1)',
                borderTop: '1px solid rgba(240,240,240,0.4)',
                animation: 'spin 0.8s linear infinite',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '12px', color: FG_MUTED }}>Carregando conjuntos…</span>
            </div>
          ) : adSets.length === 0 ? (
            <div style={{ padding: '14px 20px 14px 52px' }}>
              <p style={{ fontSize: '12px', color: FG_MUTED }}>
                Nenhum conjunto encontrado. Sincronize o Meta Ads para ver os dados.
              </p>
            </div>
          ) : (
            <>
              <div style={{ padding: '6px 20px 6px 52px', borderBottom: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: '10px', fontWeight: 600, color: FG_SUBTLE, letterSpacing: '0.05em' }}>
                  CONJUNTOS ({adSets.length})
                </p>
              </div>
              {adSets.map((as) => <AdSetRow key={as.id} adSet={as} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CampaignTable section ────────────────────────────────────────────────────
interface TableSectionProps {
  title: string;
  count: number;
  campaigns: Campaign[];
  onAdSetsLoaded: (campaignId: string, adSets: AdSet[]) => void;
  defaultExpanded?: boolean;
}

function TableSection({ title, count, campaigns, onAdSetsLoaded, defaultExpanded = true }: TableSectionProps) {
  if (campaigns.length === 0) return null;

  return (
    <div style={{
      background: BG_SURFACE,
      border: `1px solid ${BORDER}`,
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '20px',
    }}>
      {/* Section header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: FG }}>{title}</p>
          <span style={{
            fontSize: '11px', color: FG_SUBTLE,
            background: 'rgba(255,255,255,0.05)',
            padding: '1px 7px', borderRadius: '10px', fontWeight: 600,
          }}>{count}</span>
        </div>
      </div>

      <div className="camp-table-scroll" style={{ overflowX: 'auto' }}>
      {/* Table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: COL_TEMPLATE,
        padding: '8px 20px',
        borderBottom: `1px solid ${BORDER}`,
        minWidth: '560px',
      }}>
        {COL_HEADERS.map((h, i) => (
          <div key={h} style={{
            fontSize: '10px', fontWeight: 600, color: FG_SUBTLE,
            letterSpacing: '0.05em', textTransform: 'uppercase',
            textAlign: i === 0 ? 'left' : 'right',
          }}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ minWidth: '560px' }}>
      {campaigns.map((c) => (
        <CampaignRow
          key={c.id}
          campaign={c}
          onAdSetsLoaded={onAdSetsLoaded}
          defaultExpanded={defaultExpanded}
        />
      ))}
      </div>
      </div>{/* end camp-table-scroll */}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [syncing,        setSyncing]        = useState(false);
  const [syncingGoogle,  setSyncingGoogle]  = useState(false);
  const [syncMsg,        setSyncMsg]        = useState('');

  // KPI accumulator – keyed by campaign id
  const adSetDataRef = useRef<Record<string, AdSet[]>>({});
  const [kpiData, setKpiData] = useState({
    spend: 0, leads: 0, clicks: 0, ctrSum: 0, ctrCount: 0,
  });

  const load = useCallback(() => {
    setLoading(true);
    adSetDataRef.current = {};          // reset on re-sync
    setKpiData({ spend: 0, leads: 0, clicks: 0, ctrSum: 0, ctrCount: 0 });
    campaignsApi.list()
      .then((res) => setCampaigns(res.data?.campaigns || res.campaigns || []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleAdSetsLoaded(campaignId: string, sets: AdSet[]) {
    adSetDataRef.current[campaignId] = sets;
    const all = Object.values(adSetDataRef.current).flat();
    const spend    = all.reduce((s, a) => s + n(a.spend),  0);
    const leads    = all.reduce((s, a) => s + n(a.leads),  0);
    const clicks   = all.reduce((s, a) => s + n(a.clicks), 0);
    const ctrItems = all.filter((a) => n(a.ctr) > 0);
    const ctrSum   = ctrItems.reduce((s, a) => s + n(a.ctr), 0);
    setKpiData({ spend, leads, clicks, ctrSum, ctrCount: ctrItems.length });
  }

  async function handleSync() {
    setSyncing(true); setSyncMsg('');
    try {
      const res = await syncApi.meta();
      setSyncMsg(res.data?.message || res.message || 'Sincronizado!');
      load();
    } catch (e: any) {
      setSyncMsg(e?.response?.data?.error?.message || 'Erro na sincronização.');
    }
    setSyncing(false);
  }

  async function handleSyncGoogle() {
    setSyncingGoogle(true); setSyncMsg('');
    try {
      const res = await syncApi.google();
      setSyncMsg(res.data?.message || res.message || 'Google Ads sincronizado!');
      load();
    } catch (e: any) {
      setSyncMsg(e?.response?.data?.error?.message || 'Erro na sincronização Google Ads.');
    }
    setSyncingGoogle(false);
  }

  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const pausedCampaigns = campaigns.filter((c) => c.status === 'paused');
  const otherCampaigns  = campaigns.filter((c) => c.status !== 'active' && c.status !== 'paused');

  const cpl    = kpiData.leads  > 0 ? kpiData.spend / kpiData.leads : 0;
  const avgCtr = kpiData.ctrCount > 0 ? kpiData.ctrSum / kpiData.ctrCount : 0;
  const conv   = kpiData.clicks > 0 ? (kpiData.leads / kpiData.clicks) * 100 : 0;

  // Full-page loading spinner
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: BG }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.1)',
        borderTop: '1px solid rgba(240,240,240,0.4)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div className="page-pad" style={{ minHeight: '100vh', background: BG, padding: '32px 36px' }}>

      {/* ── Page header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: '28px', flexWrap: 'wrap', gap: '16px',
      }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: FG, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Campanhas
          </h1>
          <p style={{ fontSize: '13px', color: FG_MUTED }}>
            Visão geral de todas as campanhas ativas.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 16px', borderRadius: '8px',
              border: `1px solid ${BORDER_MED}`,
              background: syncing ? BG_ELEVATED : BG_SURFACE,
              color: syncing ? FG_MUTED : FG,
              fontSize: '13px', fontWeight: 500,
              cursor: syncing ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Sincronizando...' : 'Sincronizar Meta Ads'}
          </button>
          <button
            onClick={handleSyncGoogle}
            disabled={syncingGoogle}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 16px', borderRadius: '8px',
              border: `1px solid ${BORDER_MED}`,
              background: syncingGoogle ? BG_ELEVATED : BG_SURFACE,
              color: syncingGoogle ? FG_MUTED : FG,
              fontSize: '13px', fontWeight: 500,
              cursor: syncingGoogle ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            <RefreshCw size={13} style={{ animation: syncingGoogle ? 'spin 1s linear infinite' : 'none' }} />
            {syncingGoogle ? 'Sincronizando...' : 'Sincronizar Google Ads'}
          </button>
        </div>
      </div>

      {/* ── Sync message ── */}
      {syncMsg && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: syncMsg.toLowerCase().includes('erro')
            ? 'rgba(248,113,113,0.05)'
            : 'rgba(61,184,232,0.05)',
          border: `1px solid ${syncMsg.toLowerCase().includes('erro')
            ? 'rgba(248,113,113,0.15)'
            : 'rgba(61,184,232,0.15)'}`,
          fontSize: '12px',
          color: syncMsg.toLowerCase().includes('erro') ? S_RED : S_BLUE,
        }}>
          {syncMsg}
        </div>
      )}

      {/* ── KPI strip ── */}
      <div className="camp-kpi-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '10px',
        marginBottom: '28px',
      }}>
        <KpiCard
          label="Investimento"
          value={kpiData.spend > 0
            ? `R$ ${kpiData.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            : '—'}
        />
        <KpiCard
          label="Leads"
          value={kpiData.leads > 0 ? String(kpiData.leads) : '—'}
        />
        <KpiCard
          label="CPL Médio"
          value={cpl > 0 ? `R$ ${cpl.toFixed(2)}` : '—'}
          sub={cpl > 0 ? (cpl <= 60 ? 'Bom' : cpl <= 150 ? 'Monitorar' : 'Alto') : undefined}
        />
        <KpiCard
          label="CTR Médio"
          value={avgCtr > 0 ? `${avgCtr.toFixed(1)}%` : '—'}
          sub={avgCtr > 0 ? (avgCtr >= 2.5 ? 'Excelente' : avgCtr >= 1 ? 'Regular' : 'Baixo') : undefined}
        />
        <KpiCard
          label="Conversão"
          value={conv > 0 ? `${conv.toFixed(1)}%` : '—'}
          sub={conv > 0 ? 'leads / cliques' : undefined}
        />
        <KpiCard
          label="Campanhas Ativas"
          value={String(activeCampaigns.length)}
          sub={campaigns.length > 0 ? `de ${campaigns.length} total` : undefined}
        />
      </div>

      {/* ── Empty state ── */}
      {campaigns.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          background: BG_SURFACE,
          border: `1px solid ${BORDER}`,
          borderRadius: '12px',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${BORDER_MED}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Layers size={18} color={FG_SUBTLE} />
          </div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: FG, marginBottom: '6px' }}>
            Nenhuma campanha encontrada
          </p>
          <p style={{ fontSize: '13px', color: FG_MUTED }}>
            Conecte o Meta Ads em <span style={{ color: S_BLUE }}>Configurações</span> e clique em Sincronizar.
          </p>
        </div>
      )}

      {/* ── Active campaigns table ── */}
      <TableSection
        title="Campanhas Ativas"
        count={activeCampaigns.length}
        campaigns={activeCampaigns}
        onAdSetsLoaded={handleAdSetsLoaded}
        defaultExpanded={true}
      />

      {/* ── Paused campaigns table ── */}
      <TableSection
        title="Campanhas Pausadas"
        count={pausedCampaigns.length}
        campaigns={pausedCampaigns}
        onAdSetsLoaded={handleAdSetsLoaded}
        defaultExpanded={false}
      />

      {/* ── Other campaigns ── */}
      <TableSection
        title="Outras Campanhas"
        count={otherCampaigns.length}
        campaigns={otherCampaigns}
        onAdSetsLoaded={handleAdSetsLoaded}
        defaultExpanded={false}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .row-hover:hover { background: ${BG_HOVER} !important; }
        @media (max-width: 900px) {
          .page-pad { padding: 16px !important; }
        }
        @media (max-width: 1100px) {
          .kpi-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .camp-kpi-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .camp-table-scroll { overflow-x: auto !important; }
        }
        @media (max-width: 480px) {
          .camp-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
