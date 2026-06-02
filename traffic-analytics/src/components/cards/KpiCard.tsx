'use client';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string;
  prev?: string;
  delta?: number; // positive = better for most metrics; pass negative if lower is better
  lowerIsBetter?: boolean;
  icon?: React.ReactNode;
  highlight?: 'green' | 'red' | 'yellow' | 'blue' | 'none';
}

export function KpiCard({ label, value, prev, delta, lowerIsBetter, icon, highlight = 'none' }: KpiCardProps) {
  const isGood = delta === undefined ? null : lowerIsBetter ? delta < 0 : delta > 0;
  const isBad = delta === undefined ? null : lowerIsBetter ? delta > 0 : delta < 0;

  const borderClass = {
    green: 'border-l-4 border-l-green-500',
    red: 'border-l-4 border-l-red-500',
    yellow: 'border-l-4 border-l-amber-400',
    blue: 'border-l-4 border-l-blue-500',
    none: '',
  }[highlight];

  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3', borderClass)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
        {icon && <span className="text-gray-300">{icon}</span>}
      </div>

      <div className="text-2xl font-bold text-gray-900 leading-none">{value}</div>

      {(delta !== undefined || prev) && (
        <div className="flex items-center gap-2">
          {delta !== undefined && (
            <span
              className={cn(
                'flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded',
                isGood && 'bg-green-50 text-green-700',
                isBad && 'bg-red-50 text-red-700',
                !isGood && !isBad && 'bg-gray-50 text-gray-500',
              )}
            >
              {isGood ? <TrendingUp className="w-3 h-3" /> : isBad ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
            </span>
          )}
          {prev && <span className="text-xs text-gray-400">vs {prev} anterior</span>}
        </div>
      )}
    </div>
  );
}
