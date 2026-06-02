export const fmtBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtNum = (n: number, decimals = 0) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const fmtPct = (n: number, decimals = 1) => `${n.toFixed(decimals)}%`;

export const fmtShort = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return fmtNum(n);
};

export const fmtDelta = (curr: number, prev: number): { pct: number; label: string } => {
  if (!prev || prev === 0) return { pct: 0, label: '—' };
  const pct = ((curr - prev) / prev) * 100;
  const label = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
  return { pct, label };
};
