import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Image } from 'lucide-react';
import { campaignsApi, adSetsApi, adsApi, dateRangeParams } from '../lib/api';
import DateRangePicker from '../components/DateRangePicker';
import MetricsGrid, { MetricsData } from '../components/MetricsGrid';

interface BreakdownRow {
  breakdown_value: string;
  spend: number;
  clicks: number;
  ctr: number;
  cpa: number;
  leads: number;
  impressions: number;
}

const PRIMARY = '#6B9AE8';

function BdTable({ rows, cols }: { rows: BreakdownRow[]; cols: { key: keyof BreakdownRow; label: string; format?: (v: number | string) => string }[] }) {
  function fmt(v: number | string, format?: (v: number | string) => string) {
    if (format) return format(v);
    return String(v ?? '—');
  }

  return (
    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: '#111' }}>
            {cols.map((c) => (
              <th key={c.key} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={cols.length} style={{ padding: '32px 14px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>
                Sem dados
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {cols.map((c) => (
                <td key={c.key} style={{ padding: '10px 14px', color: '#fff' }}>
                  {fmt(row[c.key] as number | string, c.format)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function brl(v: number | string) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function pct(v: number | string) {
  return `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function num(v: number | string) {
  return Number(v).toLocaleString('pt-BR');
}

export default function AdDetail() {
  const { campaignId, adSetId, adId } = useParams<{ campaignId: string; adSetId: string; adId: string }>();

  const [campaign, setCampaign] = useState<{ name: string } | null>(null);
  const [adSet, setAdSet] = useState<{ name: string } | null>(null);
  const [ad, setAd] = useState<{ name: string; status: string; creative_url?: string; headline?: string; body?: string } | null>(null);
  const [summary, setSummary] = useState<MetricsData | null>(null);
  const [ageGender, setAgeGender] = useState<BreakdownRow[]>([]);
  const [placement, setPlacement] = useState<BreakdownRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [since, setSince] = useState<string | undefined>();
  const [until, setUntil] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<'age' | 'gender' | 'placement'>('age');

  const load = useCallback(async () => {
    if (!campaignId || !adSetId || !adId) return;
    setLoading(true);
    try {
      const params = dateRangeParams(dateRange, since, until);
      const [campRes, adSetRes, adRes] = await Promise.all([
        campaignsApi.get(campaignId),
        adSetsApi.get(adSetId, params),
        adsApi.get(adId, params),
      ]);
      setCampaign(campRes.data?.campaign || null);
      setAdSet(adSetRes.data?.ad_set || null);
      setAd(adRes.data?.ad || null);

      const s = adRes.data?.summary || {};
      setSummary({
        total_spend: Number(s.total_spend ?? 0),
        total_reach: Number(s.total_reach ?? 0),
        total_impressions: Number(s.total_impressions ?? 0),
        avg_frequency: Number(s.avg_frequency ?? 0),
        avg_cpm: Number(s.avg_cpm ?? 0),
        total_clicks: Number(s.total_clicks ?? 0),
        avg_ctr: Number(s.avg_ctr ?? 0),
        avg_cpc: Number(s.avg_cpc ?? 0),
        total_leads: Number(s.total_leads ?? 0),
        avg_cpa: Number(s.avg_cpa ?? 0),
        total_purchases: Number(s.total_purchases ?? 0),
        total_revenue: Number(s.total_revenue ?? 0),
        avg_roas: Number(s.avg_roas ?? 0),
        total_video_views: Number(s.total_video_views ?? 0),
        total_thruplays: Number(s.total_thruplays ?? 0),
        avg_hook_rate: Number(s.avg_hook_rate ?? 0),
        avg_hold_rate: Number(s.avg_hold_rate ?? 0),
      });

      const bds = adRes.data?.breakdowns || {};
      setAgeGender(bds.age_gender || []);
      setPlacement(bds.placement || []);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [campaignId, adSetId, adId, dateRange, since, until]);

  useEffect(() => { load(); }, [load]);

  function handleDateChange(range: string, s?: string, u?: string) {
    setDateRange(range);
    setSince(s);
    setUntil(u);
  }

  const ageGenderCols = [
    { key: 'breakdown_value' as keyof BreakdownRow, label: 'Faixa Etária / Gênero' },
    { key: 'spend' as keyof BreakdownRow, label: 'Gasto', format: brl },
    { key: 'clicks' as keyof BreakdownRow, label: 'Cliques', format: num },
    { key: 'ctr' as keyof BreakdownRow, label: 'CTR', format: pct },
    { key: 'cpa' as keyof BreakdownRow, label: 'CPA', format: brl },
  ];

  const placementCols = [
    { key: 'breakdown_value' as keyof BreakdownRow, label: 'Posicionamento' },
    { key: 'spend' as keyof BreakdownRow, label: 'Gasto', format: brl },
    { key: 'impressions' as keyof BreakdownRow, label: 'Impressões', format: num },
    { key: 'clicks' as keyof BreakdownRow, label: 'Cliques', format: num },
    { key: 'ctr' as keyof BreakdownRow, label: 'CTR', format: pct },
  ];

  const tabs = [
    { key: 'age' as const, label: 'Idade & Gênero' },
    { key: 'placement' as const, label: 'Posicionamento' },
  ];

  return (
    <div style={{ padding: '32px', minHeight: '100vh', background: '#000' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', fontSize: '13px', flexWrap: 'wrap' }}>
        <Link to="/campaigns" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Campanhas</Link>
        <ChevronRight size={14} color="rgba(255,255,255,0.25)" />
        <Link to={`/campaigns/${campaignId}`} style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>{campaign?.name || '...'}</Link>
        <ChevronRight size={14} color="rgba(255,255,255,0.25)" />
        <Link to={`/campaigns/${campaignId}/adsets/${adSetId}`} style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>{adSet?.name || '...'}</Link>
        <ChevronRight size={14} color="rgba(255,255,255,0.25)" />
        <span style={{ color: '#fff', fontWeight: 600 }}>{ad?.name || '...'}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>{ad?.name || ''}</h1>
        <DateRangePicker value={dateRange} onChange={handleDateChange} since={since} until={until} />
      </div>

      <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <div
          style={{
            width: '300px', flexShrink: 0,
            background: '#0a0a0a',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {ad?.creative_url ? (
            <img
              src={ad.creative_url}
              alt="Criativo"
              style={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: '220px' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div style={{
              height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#111', borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <Image size={40} color="rgba(255,255,255,0.1)" />
            </div>
          )}
          <div style={{ padding: '16px' }}>
            {ad?.headline && (
              <p style={{ color: '#fff', fontWeight: 600, fontSize: '14px', margin: '0 0 8px' }}>{ad.headline}</p>
            )}
            {ad?.body && (
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>{ad.body}</p>
            )}
            {!ad?.headline && !ad?.body && (
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', margin: 0 }}>Sem criativo disponível</p>
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div style={{ height: '160px', borderRadius: '10px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)' }} />
          ) : summary ? (
            <MetricsGrid metrics={summary} />
          ) : null}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', gap: '0', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key === 'age' ? 'age' : 'placement')}
              style={{
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: activeTab === tab.key ? 600 : 400,
                color: activeTab === tab.key ? '#fff' : 'rgba(255,255,255,0.35)',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.key ? `2px solid ${PRIMARY}` : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'age' && (
          <BdTable rows={ageGender} cols={ageGenderCols} />
        )}
        {activeTab === 'placement' && (
          <BdTable rows={placement} cols={placementCols} />
        )}
      </div>
    </div>
  );
}
