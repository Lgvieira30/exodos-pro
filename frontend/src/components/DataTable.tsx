import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  type?: 'status' | 'creative' | 'currency' | 'percent' | 'number' | 'text';
  render?: (value: unknown, row: Row) => React.ReactNode;
}

export type Row = Record<string, unknown>;

interface DataTableProps {
  columns: Column[];
  rows: Row[];
  onRowClick?: (row: Row) => void;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active: { bg: 'rgba(52,211,153,0.12)', color: '#34d399' },
  paused: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
  draft: { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af' },
  completed: { bg: 'rgba(107,154,232,0.12)', color: '#6B9AE8' },
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  draft: 'Rascunho',
  completed: 'Concluído',
};

function formatBRL(value: unknown): string {
  const n = Number(value ?? 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPct(value: unknown): string {
  const n = Number(value ?? 0);
  return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatNum(value: unknown): string {
  return Number(value ?? 0).toLocaleString('pt-BR');
}

function CellValue({ col, value, row }: { col: Column; value: unknown; row: Row }) {
  if (col.render) return <>{col.render(value, row)}</>;

  if (col.type === 'status') {
    const s = String(value || 'draft').toLowerCase();
    const style = STATUS_COLORS[s] || STATUS_COLORS.draft;
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 600,
          background: style.bg,
          color: style.color,
        }}
      >
        {STATUS_LABELS[s] || s}
      </span>
    );
  }

  if (col.type === 'creative') {
    const url = value as string | undefined;
    return url ? (
      <img
        src={url}
        alt=""
        style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '6px', display: 'block' }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    ) : (
      <div
        style={{
          width: 40, height: 40, borderRadius: '6px',
          background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)',
        }}
      />
    );
  }

  if (col.type === 'currency') return <>{formatBRL(value)}</>;
  if (col.type === 'percent') return <>{formatPct(value)}</>;
  if (col.type === 'number') return <>{formatNum(value)}</>;

  return <>{value !== null && value !== undefined ? String(value) : '—'}</>;
}

export default function DataTable({ columns, rows, onRowClick }: DataTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = [...rows].sort((a, b) => {
    if (!sortKey) return 0;
    const va = a[sortKey];
    const vb = b[sortKey];
    const na = Number(va);
    const nb = Number(vb);
    const numA = isNaN(na) ? String(va || '') : na;
    const numB = isNaN(nb) ? String(vb || '') : nb;
    if (numA < numB) return sortDir === 'asc' ? -1 : 1;
    if (numA > numB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: '#111' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => col.sortable && handleSort(col.key)}
                style={{
                  padding: '11px 14px',
                  textAlign: 'left',
                  fontWeight: 600,
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  cursor: col.sortable ? 'pointer' : 'default',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '40px 14px',
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.2)',
                  fontSize: '13px',
                }}
              >
                Nenhum dado disponível
              </td>
            </tr>
          )}
          {sorted.map((row, idx) => (
            <tr
              key={idx}
              onClick={() => onRowClick?.(row)}
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => {
                if (onRowClick) (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.03)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
              }}
            >
              {columns.map((col) => (
                <td key={col.key} style={{ padding: '11px 14px', color: '#fff', whiteSpace: 'nowrap' }}>
                  <CellValue col={col} value={row[col.key]} row={row} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
