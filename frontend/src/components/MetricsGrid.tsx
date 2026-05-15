import React from 'react';

export interface MetricsData {
  total_spend?: number;
  total_reach?: number;
  total_impressions?: number;
  avg_frequency?: number;
  avg_cpm?: number;
  total_clicks?: number;
  avg_ctr?: number;
  avg_cpc?: number;
  total_leads?: number;
  avg_cpa?: number;
  total_purchases?: number;
  total_revenue?: number;
  avg_roas?: number;
  total_video_views?: number;
  total_thruplays?: number;
  avg_hook_rate?: number;
  avg_hold_rate?: number;
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatNum(value: number) {
  return value.toLocaleString('pt-BR');
}

function formatPct(value: number) {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

interface MetricCardProps {
  label: string;
  value: string;
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div
      style={{
        background: '#0a0a0a',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '10px',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </span>
      <span style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>
        {value}
      </span>
    </div>
  );
}

interface MetricsGridProps {
  metrics: MetricsData;
}

export default function MetricsGrid({ metrics }: MetricsGridProps) {
  const cards = [
    { label: 'Gasto', value: formatBRL(metrics.total_spend ?? 0) },
    { label: 'Alcance', value: formatNum(metrics.total_reach ?? 0) },
    { label: 'Impressões', value: formatNum(metrics.total_impressions ?? 0) },
    { label: 'Frequência', value: (metrics.avg_frequency ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { label: 'CPM', value: formatBRL(metrics.avg_cpm ?? 0) },
    { label: 'Cliques', value: formatNum(metrics.total_clicks ?? 0) },
    { label: 'CTR', value: formatPct(metrics.avg_ctr ?? 0) },
    { label: 'CPC', value: formatBRL(metrics.avg_cpc ?? 0) },
    { label: 'Leads', value: formatNum(metrics.total_leads ?? 0) },
    { label: 'CPA', value: formatBRL(metrics.avg_cpa ?? 0) },
    { label: 'Compras', value: formatNum(metrics.total_purchases ?? 0) },
    { label: 'Receita', value: formatBRL(metrics.total_revenue ?? 0) },
    { label: 'ROAS', value: (metrics.avg_roas ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { label: 'Views de Vídeo', value: formatNum(metrics.total_video_views ?? 0) },
    { label: 'ThruPlays', value: formatNum(metrics.total_thruplays ?? 0) },
    ...(metrics.avg_hook_rate !== undefined
      ? [{ label: 'Hook Rate', value: formatPct(metrics.avg_hook_rate) }]
      : []),
    ...(metrics.avg_hold_rate !== undefined
      ? [{ label: 'Hold Rate', value: formatPct(metrics.avg_hold_rate) }]
      : []),
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '10px',
      }}
    >
      {cards.map((card) => (
        <MetricCard key={card.label} label={card.label} value={card.value} />
      ))}
    </div>
  );
}
