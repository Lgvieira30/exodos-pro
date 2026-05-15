import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { campaignsApi, adSetsApi, adsApi, dateRangeParams } from '../lib/api';
import DateRangePicker from '../components/DateRangePicker';
import MetricsGrid, { MetricsData } from '../components/MetricsGrid';
import DataTable, { Column, Row } from '../components/DataTable';

const ADS_COLUMNS: Column[] = [
  { key: 'creative_url', label: 'Criativo', type: 'creative' },
  { key: 'name', label: 'Nome', type: 'text', sortable: true },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'total_spend', label: 'Gasto', type: 'currency', sortable: true },
  { key: 'total_impressions', label: 'Impressões', type: 'number', sortable: true },
  { key: 'total_clicks', label: 'Cliques', type: 'number', sortable: true },
  { key: 'avg_ctr', label: 'CTR', type: 'percent', sortable: true },
  { key: 'avg_cpc', label: 'CPC', type: 'currency', sortable: true },
  { key: 'total_leads', label: 'Leads', type: 'number', sortable: true },
  { key: 'avg_cpa', label: 'CPA', type: 'currency', sortable: true },
];

export default function AdSetDetail() {
  const { campaignId, adSetId } = useParams<{ campaignId: string; adSetId: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<{ name: string } | null>(null);
  const [adSet, setAdSet] = useState<{ name: string } | null>(null);
  const [summary, setSummary] = useState<MetricsData | null>(null);
  const [ads, setAds] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [since, setSince] = useState<string | undefined>();
  const [until, setUntil] = useState<string | undefined>();

  const load = useCallback(async () => {
    if (!campaignId || !adSetId) return;
    setLoading(true);
    try {
      const params = dateRangeParams(dateRange, since, until);
      const [campRes, adSetRes, adsRes] = await Promise.all([
        campaignsApi.get(campaignId),
        adSetsApi.get(adSetId, params),
        adsApi.list(adSetId, params),
      ]);
      setCampaign(campRes.data?.campaign || null);
      setAdSet(adSetRes.data?.ad_set || null);
      const s = adSetRes.data?.summary || {};
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
      });
      setAds(adsRes.data?.ads || []);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [campaignId, adSetId, dateRange, since, until]);

  useEffect(() => { load(); }, [load]);

  function handleDateChange(range: string, s?: string, u?: string) {
    setDateRange(range);
    setSince(s);
    setUntil(u);
  }

  return (
    <div style={{ padding: '32px', minHeight: '100vh', background: '#000' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', fontSize: '13px' }}>
        <Link to="/campaigns" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Campanhas</Link>
        <ChevronRight size={14} color="rgba(255,255,255,0.25)" />
        <Link to={`/campaigns/${campaignId}`} style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>{campaign?.name || '...'}</Link>
        <ChevronRight size={14} color="rgba(255,255,255,0.25)" />
        <span style={{ color: '#fff', fontWeight: 600 }}>{adSet?.name || '...'}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>{adSet?.name || ''}</h1>
        <DateRangePicker value={dateRange} onChange={handleDateChange} since={since} until={until} />
      </div>

      {loading ? (
        <div style={{ height: '160px', borderRadius: '10px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)' }} />
      ) : summary ? (
        <MetricsGrid metrics={summary} />
      ) : null}

      <div style={{ marginTop: '32px' }}>
        <h2 style={{ color: '#fff', fontSize: '15px', fontWeight: 600, marginBottom: '14px' }}>Anúncios</h2>
        {loading ? (
          <div style={{ height: '120px', borderRadius: '10px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)' }} />
        ) : (
          <DataTable
            columns={ADS_COLUMNS}
            rows={ads}
            onRowClick={(row) => navigate(`/campaigns/${campaignId}/adsets/${adSetId}/ads/${row.id}`)}
          />
        )}
      </div>
    </div>
  );
}
