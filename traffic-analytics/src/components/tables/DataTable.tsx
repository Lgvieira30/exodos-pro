'use client';
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  flexRender, createColumnHelper, type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { AggregatedRow } from '@/types/dashboard';
import { DecisionBadge } from './DecisionBadge';
import { fmtBRL, fmtNum, fmtPct } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const col = createColumnHelper<AggregatedRow>();

const columns = [
  col.accessor('name', {
    header: 'Nome',
    cell: (i) => (
      <span className="font-medium text-gray-900 text-xs max-w-[180px] block truncate" title={i.getValue()}>
        {i.getValue()}
      </span>
    ),
  }),
  col.accessor('cost', {
    header: 'Invest.',
    cell: (i) => <span className="text-xs tabular-nums">{fmtBRL(i.getValue())}</span>,
  }),
  col.accessor('clicks', {
    header: 'Cliques',
    cell: (i) => <span className="text-xs tabular-nums">{fmtNum(i.getValue())}</span>,
  }),
  col.accessor('cpc', {
    header: 'CPC',
    cell: (i) => <span className="text-xs tabular-nums">{fmtBRL(i.getValue())}</span>,
  }),
  col.accessor('leads', {
    header: 'Leads',
    cell: (i) => <span className="text-xs tabular-nums font-medium">{fmtNum(i.getValue())}</span>,
  }),
  col.accessor('won', {
    header: 'Ganhou',
    cell: (i) => <span className="text-xs tabular-nums text-green-700 font-medium">{fmtNum(i.getValue())}</span>,
  }),
  col.accessor('lost', {
    header: 'Perdeu',
    cell: (i) => <span className="text-xs tabular-nums text-red-500">{fmtNum(i.getValue())}</span>,
  }),
  col.accessor('open', {
    header: 'Abertos',
    cell: (i) => <span className="text-xs tabular-nums text-amber-600">{fmtNum(i.getValue())}</span>,
  }),
  col.accessor('cplReal', {
    header: 'CPL',
    cell: (i) => <span className="text-xs tabular-nums">{i.getValue() > 0 ? fmtBRL(i.getValue()) : '—'}</span>,
  }),
  col.accessor('closeRate', {
    header: 'Win Rate',
    cell: (i) => {
      const v = i.getValue();
      return (
        <span className={cn('text-xs tabular-nums font-semibold', v >= 25 ? 'text-green-700' : v < 10 ? 'text-red-500' : 'text-amber-600')}>
          {fmtPct(v)}
        </span>
      );
    },
  }),
  col.accessor('decision', {
    header: 'Decisão',
    cell: (i) => (
      <DecisionBadge
        decision={i.getValue()}
        confidence={i.row.original.confidence}
        reason={i.row.original.decisionReason}
      />
    ),
    enableSorting: false,
  }),
];

interface DataTableProps {
  data: AggregatedRow[];
  title: string;
}

export function DataTable({ data, title }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'cost', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Filtrar..."
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-gray-100">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    onClick={h.column.getToggleSortingHandler()}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider',
                      h.column.getCanSort() && 'cursor-pointer select-none hover:text-gray-600',
                    )}
                  >
                    <span className="flex items-center gap-1">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getCanSort() && (
                        h.column.getIsSorted() === 'asc' ? <ChevronUp className="w-3 h-3" /> :
                        h.column.getIsSorted() === 'desc' ? <ChevronDown className="w-3 h-3" /> :
                        <ChevronsUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center text-xs text-gray-400 py-8">
                  Nenhum dado encontrado
                </td>
              </tr>
            )}
            {table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                className={cn('border-b border-gray-50 hover:bg-gray-50/50', i % 2 === 0 ? 'bg-white' : 'bg-gray-50/20')}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-2.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 text-xs text-gray-400 border-t border-gray-100">
        {table.getFilteredRowModel().rows.length} registros
      </div>
    </div>
  );
}
