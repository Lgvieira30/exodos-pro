import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowLeft, DollarSign, Users, Target, Zap, TrendingUp, MousePointer, Eye, BarChart2 } from 'lucide-react';
import { campaignsApi, metricsApi, analyzeApi } from '../lib/api';

const CYAN = '#3DB8E8';

const PRIORITY_COLOR: Record<string, string> = {
  alta: '#ef4444', media: '#f59e0b', baixa: '#10b981',
};

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Ativa',     color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  paused:    { label: 'Pausada',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  draft:     { label: 'Rascunho', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  completed: { label: 'Concluida', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
};

const PLATFORM_LABEL: Record<string, string> = {
  meta: 'Meta Ads', google: 'Google Ads', linkedin: 'LinkedIn',
};

interface Campaign {
  id: string; name: string; platform: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  budget: number; objective: string;
}

interface Metric {
  date: string; spend: number; leads: number; conversions: number;
  impressions: number; clicks: number; cpc: number; cpa: number;
  ctr: number; roas: number;
}

interface Analysis {
  campaign?: string;
  score: number;
  status: string;
  issues: string[];
  actions: { priority: 'alta' | 'media' | 'baixa'; acao: string; motivo: string }[];
}

function fmt(n: number, prefix = '', decimals = 0) {
  if (!n) return '--';
  return `${prefix}${n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [campRes, metricsRes, analyzeRes] = await Promise.all([
          campaignsApi.get(id!).catch(() => null),
          metricsApi.campaign(id!).catch(() => null),
          analyzeApi.campaign(id!).catch(() => null),
        ]);
        if (campRes?.data) setCampaign(campRes.data.campaign ?? campRes.data);
        if (metricsRes?.data) setMetrics(metricsRes.data.metrics ?? metricsRes.data ?? []);
        if (analyzeRes?.data) setAnalysis(analyzeRes.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${CYAN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // Aggregate metrics for KPI row
  const totalSpend = metrics.reduce((s, m) => s + (m.spend || 0), 0);
  const totalLeads = metrics.reduce((s, m) => s + (m.leads || 0), 0);
  const totalImpressions = metrics.reduce((s, m) => s + (m.impressions || 0), 0);
  const totalClicks = metrics.reduce((s, m) => s + (m.clicks || 0), 0);
  const avgCpa = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const avgRoas = metrics.length > 0 ? metrics.reduce((s, m) => s + (m.roas || 0), 0) / metrics.filter(m => m.roas > 0).length || 0 : 0;
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

  const kpis = [
    { label: 'Investimento', value: fmt(totalSpend, 'R$ ', 2), icon: DollarSign, color: '#3b82f6' },
    { label: 'Leads', value: fmt(totalLeads), icon: Users, color: '#10b981' },
    { label: 'CPA', value: fmt(avgCpa, 'R$ ', 2), icon: Target, color: '#f97316' },
    { label: 'ROAS', value: avgRoas > 0 ? `${avgRoas.toFixed(1)}x` : '--', icon: Zap, color: '#a78bfa' },
    { label: 'CTR', value: avgCtr > 0 ? `${avgCtr.toFixed(2)}%` : '--', icon: TrendingUp, color: '#06b6d4' },
    { label: 'CPC', value: fmt(avgCpc, 'R$ ', 2), icon: MousePointer, color: '#f59e0b' },
    { label: 'Impressoes', value: totalImpressions > 0 ? totalImpressions.toLocaleString('pt-BR') : '--', icon: Eye, color: '#64748b' },
    { label: 'Clicks', value: totalClicks > 0 ? totalClicks.toLocaleString('pt-BR') : '--', icon: BarChart2, color: '#ec4899' },
  ];

  const chartData = [...metrics]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30)
    .map(m => ({
      date: new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      spend: m.spend,
      leads: m.leads,
    }));

  const tableRows = [...metrics]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const badge = campaign ? STATUS_BADGE[campaign.status] : null;
  const scoreColor = !analysis ? '#64748b' : analysis.score >= 75 ? '#10b981' : analysis.score >= 50 ? '#f59e0b' : '#ef4444';

  const cardStyle = {
    background: 'rgba(15,23,42,0.8)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000', padding: '32px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px', padding: '8px 12px', color: 'rgba(255,255,255,0.7)',
            fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <ArrowLeft size={15} /> Voltar
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', flex: 1 }}>
          {campaign?.name || 'Campanha'}
        </h1>
        {badge && (
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '12px', color: badge.color, background: badge.bg }}>
            {badge.label}
          </span>
        )}
        {campaign && (
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '12px', color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
            {PLATFORM_LABEL[campaign.platform] || campaign.platform}
          </span>
        )}
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '10px', marginBottom: '24px' }}>
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ ...cardStyle, padding: '16px 14px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
              <Icon size={15} color={color} />
            </div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{value}</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Chart */}
          <div style={{ ...cardStyle, padding: '20px' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Historico (30 dias)</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '16px' }}>Investimento e Leads diarios</p>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="transparent" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }} />
                  <Area type="monotone" dataKey="spend" name="Investimento" stroke="#3b82f6" strokeWidth={2} fill="url(#gSpend)" dot={false} />
                  <Area type="monotone" dataKey="leads" name="Leads" stroke="#10b981" strokeWidth={2} fill="url(#gLeads)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Nenhum dado disponivel para exibir o grafico.</p>
              </div>
            )}
          </div>

          {/* Table */}
          {tableRows.length > 0 && (
            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Dados diarios</p>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Data', 'Invest.', 'Leads', 'CPA', 'ROAS', 'CTR', 'CPC'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Data' ? 'left' : 'right', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '11px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((m, i) => (
                      <tr
                        key={i}
                        onMouseEnter={() => setHoveredRow(i)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: hoveredRow === i ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                      >
                        <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.6)' }}>
                          {new Date(m.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#fff', fontWeight: 600 }}>
                          R$ {Number(m.spend).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#10b981' }}>{m.leads}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: m.cpa > 60 ? '#ef4444' : m.cpa > 0 ? '#10b981' : 'rgba(255,255,255,0.3)' }}>
                          {m.cpa > 0 ? `R$ ${Number(m.cpa).toFixed(2)}` : '--'}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: m.roas >= 3 ? '#10b981' : m.roas >= 2 ? '#f59e0b' : m.roas > 0 ? '#ef4444' : 'rgba(255,255,255,0.3)' }}>
                          {m.roas > 0 ? `${Number(m.roas).toFixed(1)}x` : '--'}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: 'rgba(255,255,255,0.6)' }}>
                          {m.ctr > 0 ? `${Number(m.ctr).toFixed(2)}%` : '--'}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: 'rgba(255,255,255,0.6)' }}>
                          {m.cpc > 0 ? `R$ ${Number(m.cpc).toFixed(2)}` : '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {metrics.length === 0 ? (
            <div style={{ ...cardStyle, padding: '28px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Sem dados ainda</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.6' }}>
                Sincronize suas campanhas para visualizar metricas detalhadas desta campanha.
              </p>
            </div>
          ) : analysis ? (
            <div style={{ ...cardStyle, padding: '20px', border: `1px solid ${scoreColor}25` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>Score IA</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Analise automatica da campanha</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '32px', fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{analysis.score}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>/ 100</p>
                </div>
              </div>

              {analysis.issues.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Problemas</p>
                  {analysis.issues.map((issue, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0, marginTop: '6px' }} />
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5' }}>{issue}</p>
                    </div>
                  ))}
                </div>
              )}

              {analysis.actions.length > 0 && (
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Acoes</p>
                  {analysis.actions.map((action, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '8px',
                      padding: '10px', borderRadius: '10px', marginBottom: '8px',
                      background: `${PRIORITY_COLOR[action.priority]}08`,
                      border: `1px solid ${PRIORITY_COLOR[action.priority]}20`,
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: PRIORITY_COLOR[action.priority], flexShrink: 0, marginTop: '4px' }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{action.acao}</p>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{action.motivo}</p>
                      </div>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, flexShrink: 0,
                        padding: '2px 6px', borderRadius: '10px',
                        color: PRIORITY_COLOR[action.priority],
                        background: `${PRIORITY_COLOR[action.priority]}15`,
                      }}>{action.priority.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
