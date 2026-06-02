'use client';
import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { formatDate, getPresets } from '@/lib/dateUtils';
import type { DateRange } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  showCompare?: boolean;
  compareValue?: DateRange;
  onCompareChange?: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange, showCompare, compareValue, onCompareChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const presets = getPresets();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 hover:border-gray-300 transition-colors"
      >
        <Calendar className="w-4 h-4 text-gray-400" />
        <span>{formatDate(value.from)} – {formatDate(value.to)}</span>
        <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-3 min-w-[200px]">
          <p className="text-xs text-gray-400 font-medium mb-2 px-1">Períodos rápidos</p>
          {presets.map((preset) => {
            const active =
              formatDate(preset.range.from) === formatDate(value.from) &&
              formatDate(preset.range.to) === formatDate(value.to);
            return (
              <button
                key={preset.label}
                onClick={() => { onChange(preset.range); setOpen(false); }}
                className={cn(
                  'w-full text-left text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors',
                  active ? 'text-blue-600 font-medium bg-blue-50' : 'text-gray-700',
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
