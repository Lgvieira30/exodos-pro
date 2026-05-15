import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Megaphone } from 'lucide-react';
import { campaignsApi, syncApi, dateRangeParams } from '../lib/api';
import DateRangePicker from '../components/DateRangePicker';
import DataTable, { Column, Row } from '../components/DataTable';

const PRIMARY = '#6B9AE8';

interface Campaign extends Row {
  id: string;
  name: string;
  status: string;
  platform: string;
  total_spend: number;
  total_reach: number;
  total_impressions: number;
  total_clicks: number;
  avg_ctr: number;
  total_leads: number;
  avg_cpa: number;
  avg_roas: number;
}

const COLUMNS: Column[] = [
  { key: 'name', label: 'Nome', type: 'text', sortable: true },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'platform', label: 'Plataforma', type: 'text' },
  { key: 'total_spend', label: 'Gasto', type: 'currency', sortable: true },
  { key: 'total_reach', label: 'Alcance', type: 'number', sortable: true },
  { key: 'total_impressions', label: 'Impressões', type: 'number', sortable: true },
  { key: 'total_clicks', label: 'Cliques', type: 'number', sortable: true },
  { key: 'avg_ctr', label: 'CTR', type: 'percent', sortable: true },
  { key: 'total_leads', label: 'Leads', type: 'number', sortable: true },
  { key: 'avg_cpa', label: 'CPA', type: 'currency', sortable: true },
  { key: 'avg_roas', label: 'ROAS', sortable: true, render: (v) => Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) },
];

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dateRange, setDateRange] = useState('7d');
  const [since, setSince] = useState<string | undefined>();
  const [until, setUntil] = useState<string | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = dateRangeParams(dateRange, since, until);
      const res = await campaignsApi.list(params);
      setCampaigns(res.data?.campaigns || []);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange, since, until]);

  useEffect(() => { load(); }, [load]);

  async function handleSync() {
    setSyncing(true);
    try {
      await syncApi.meta({ date_range: dateRange, start_date: since, end_date: until });
      await load();
    } finally {
      setSyncing(false);
    }
  }

  function handleDateChange(range: string, s?: string, u?: string) {
    setDateRange(range);
    setSince(s);
    setUntil(u);
  }

  return (
    <div style={{ padding: '32px', minHeight: '100vh', background: '#000' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Megaphone size={22} color={PRIMARY} />
          <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>Campanhas</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <DateRangePicker value={dateRange} onChange={handleDateChange} since={since} until={until} />
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '7px 16px', borderRadius: '8px',
              background: PRIMARY, border: 'none', color: '#fff',
              fontSize: '13px', fontWeight: 600, cursor: syncing ? 'not-allowed' : 'pointer',
              opacity: syncing ? 0.7 : 1, fontFamily: 'inherit',
              transition: 'opacity 0.15s',
            }}
          >
            <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: '10px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                height: '48px', borderRadius: '8px',
                background: 'linear-gradient(90deg, #111 0%, #1a1a1a 50%, #111 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }}
            />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div
          style={{
            textAlign: 'center', padding: '80px 20px',
            color: 'rgba(255,255,255,0.2)', fontSize: '14px',
          }}
        >
          <Megaphone size={40} style={{ marginBottom: '16px', opacity: 0.2 }} />
          <p style={{ margin: 0 }}>Nenhuma campanha encontrada.</p>
          <p style={{ margin: '8px 0 0', fontSize: '12px' }}>Clique em Sincronizar para importar do Meta Ads.</p>
        </div>
      ) : (
        <DataTable
          columns={COLUMNS}
          rows={campaigns as Row[]}
          onRowClick={(row) => navigate(`/campaigns/${row.id}`)}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>
    </div>
  );
}
