import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from '@/types/dashboard';

export const formatDate = (d: Date) => format(d, 'dd/MM/yyyy', { locale: ptBR });
export const formatDateISO = (d: Date) => format(d, 'yyyy-MM-dd');
export const formatDateShort = (s: string) => {
  const parts = s.split('-');
  return `${parts[2]}/${parts[1]}`;
};

export function getPreviousPeriod(range: DateRange): DateRange {
  const diffDays = Math.round((range.to.getTime() - range.from.getTime()) / 86400000) + 1;
  return {
    from: subDays(range.from, diffDays),
    to: subDays(range.to, diffDays),
  };
}

export function isInRange(dateStr: string, range: DateRange): boolean {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return isWithinInterval(d, { start: startOfDay(range.from), end: endOfDay(range.to) });
  } catch {
    return false;
  }
}

export function getPresets(): { label: string; range: DateRange }[] {
  const today = new Date();
  const startOfToday = startOfDay(today);

  return [
    {
      label: 'Hoje',
      range: { from: startOfToday, to: today },
    },
    {
      label: 'Últimos 7 dias',
      range: { from: subDays(startOfToday, 6), to: today },
    },
    {
      label: 'Últimos 14 dias',
      range: { from: subDays(startOfToday, 13), to: today },
    },
    {
      label: 'Últimos 30 dias',
      range: { from: subDays(startOfToday, 29), to: today },
    },
    {
      label: 'Maio 2026',
      range: { from: new Date('2026-05-01'), to: new Date('2026-05-31') },
    },
  ];
}
