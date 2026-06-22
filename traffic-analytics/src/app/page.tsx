'use client';
import { useState, useMemo } from 'react';
import {
  BarChart2, DollarSign, Users, Target, Trophy, Clock,
  Zap, Upload, RefreshCw, TrendingUp, TrendingDown, Minus,
  ChevronRight, AlertTriangle,
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { useDashboardStore } from '@/store/dashboardStore';
import { CSVUpload } from '@/components/upload/CSVUpload';
import { DataTable } from '@/components/tables/DataTable';
import { DateRangePicker } from '@/components/filters/DateRangePicker';
import { computeSummary, aggregateBy, aggregateByDay, checkDataQuality } from '@/lib/calculations';
import { getPreviousPeriod, isInRange, formatDate, formatDateShort } from '@/lib/dateUtils';
import { fmtBRL, fmtNum, fmtPct } from '@/lib/formatters';
import type { DashboardSummary, DailyRow } from '@/types/dashboard';
import { cn } from '@/lib/utils';

const DIMENSIONS = [
  { label: 'Campanha',      adsDim: 'campaign', crmDim: 'campaign' },
  { label: 'Grupo de Anúncio', adsDim: 'adGroup', crmDim: 'adGroup' },
  { label: 'Anúncio',      adsDim: 'adId',     crmDim: 'adId' },
  { label: 'Palavra-chave', adsDim: 'campaign', crmDim: 'keyword' },
  { label: 'Segmento',     adsDim: 'campaign', crmDim: 'segment' },
  { label: 'UF',           adsDim: 'campaign', crmDim: 'state' },
  { label: 'Faixa de Frota', adsDim: 'campaign', crmDim: 'fleetRange' },
] as const;

function delta(curr: number, prev: number) {
  if (!prev) return 0;
  return ((curr - prev) / prev) * 100;
}

// ─── KPI CARD ────────────────────────────────────────────────────────────────

interface KpiProps {
  label: string;
  value: string;
  sub?: string;
  d?: number;
  lowerIsBetter?: boolean;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

function KpiCard({ label, value, sub, d, lowerIsBetter, icon, color, bgColor }: KpiProps) {
  const isGood = d === undefined ? null : lowerIsBetter ? d < 0 : d > 0;
  const isBad  = d === undefined ? null : lowerIsBetter ? d > 0 : d < 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between gap-4 min-h-[148px]">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bgColor }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>

      <div>
        <div className="text-4xl font-black text-gray-900 tracking-tight leading-none mb-1.5">{value}</div>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
      </div>

      {d !== undefined && (
        <div className={cn(
          'flex items-center gap-1 text-xs font-bold w-fit px-2.5 py-1 rounded-lg',
          isGood && 'bg-emerald-50 text-emerald-700',
          isBad  && 'bg-red-50 text-red-600',
          !isGood && !isBad && 'bg-gray-50 text-gray-400',
        )}>
          {isGood ? <TrendingUp className="w-3 h-3" /> : isBad ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {d > 0 ? '+' : ''}{d.toFixed(1)}%
        </div>
      )}
    </div>
  );
}

// ─── DAILY CHART ──────────────────────────────────────────────────────────────

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-xl p-3 text-xs">
      <p className="font-bold text-gray-800 mb-2 pb-1.5 border-b border-gray-100">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-6 py-0.5">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold text-gray-900">
            {p.dataKey === 'cost' ? fmtBRL(p.value) : fmtNum(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

function DailyChart({ data }: { data: DailyRow[] }) {
  const fmt = data.map(d => ({ ...d, dateLabel: formatDateShort(d.date) }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={fmt} margin={{ top: 8, right: 20, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="lineCost" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={4} />
        <YAxis yAxisId="l" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={26} />
        <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={48}
          tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<ChartTip />} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} iconType="circle" iconSize={8} />
        <Bar yAxisId="l" dataKey="won"  name="Ganhou" stackId="s" fill="#059669" maxBarSize={16} />
        <Bar yAxisId="l" dataKey="open" name="Aberto" stackId="s" fill="#f59e0b" maxBarSize={16} />
        <Bar yAxisId="l" dataKey="lost" name="Perdeu" stackId="s" fill="#ef4444" radius={[3,3,0,0]} maxBarSize={16} />
        <Line yAxisId="r" type="monotone" dataKey="cost" name="Investimento" stroke="url(#lineCost)" dot={false} strokeWidth={3} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ─── FUNNEL ───────────────────────────────────────────────────────────────────

function Funnel({ s }: { s: DashboardSummary }) {
  const steps = [
    { label: 'Cliques', value: s.clicks, pct: 100, color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
    { label: 'Leads',   value: s.leads,  pct: s.clicks > 0 ? (s.leads / s.clicks) * 100 : 0, color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
    { label: 'Ganhou',  value: s.won,    pct: s.leads  > 0 ? (s.won   / s.leads)  * 100 : 0, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  ];
  const maxVal = steps[0].value || 1;

  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const w = Math.max(30, (step.value / maxVal) * 100);
        return (
          <div key={step.label}>
            {i > 0 && (
              <div className="flex items-center gap-1 pl-3 my-1.5">
                <div className="w-px h-4 bg-gray-200 ml-2" />
                <span className="text-[10px] text-gray-400 font-semibold">{fmtPct(step.pct)} conv.</span>
              </div>
            )}
            <div className="transition-all duration-700"
              style={{ width: `${w}%`, minWidth: 140 }}>
              <div className="rounded-xl flex items-center justify-between px-4 py-3 border"
                style={{ background: step.bg, borderColor: step.border }}>
                <span className="text-xs font-semibold" style={{ color: step.color }}>{step.label}</span>
                <span className="text-2xl font-black" style={{ color: step.color }}>{fmtNum(step.value)}</span>
              </div>
            </div>
          </div>
        );
      })}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
        {[
          { label: 'Perdidos', value: fmtNum(s.lost), color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Agendados', value: fmtNum(s.scheduled), color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Win Rate', value: fmtPct(s.closeRate), color: 'text-emerald-700', bg: 'bg-emerald-50' },
        ].map(m => (
          <div key={m.label} className={cn('rounded-xl p-3 text-center', m.bg)}>
            <div className={cn('text-xl font-black', m.color)}>{m.value}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── COMPARE ROW ─────────────────────────────────────────────────────────────

function CompareRow({ label, curr, prev, fmt, lower }: { label: string; curr: number; prev: number; fmt: (v: number) => string; lower?: boolean }) {
  const d = delta(curr, prev);
  const good = lower ? d <= 0 : d >= 0;
  const max = Math.max(curr, prev, 1);
  return (
    <div className="grid grid-cols-[1fr_56px_1fr] items-center gap-2 py-2.5">
      <div>
        <div className="text-sm font-bold text-gray-900">{fmt(curr)}</div>
        <div className="h-1 rounded-full bg-gray-100 mt-1 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${(curr / max) * 100}%`, background: good ? '#059669' : '#ef4444' }} />
        </div>
      </div>
      <div className="text-center px-1">
        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</div>
        <span className={cn('text-[11px] font-black px-1.5 py-0.5 rounded-md', good ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50')}>
          {d > 0 ? '+' : ''}{d.toFixed(0)}%
        </span>
      </div>
      <div className="text-right">
        <div className="text-sm text-gray-400">{fmt(prev)}</div>
        <div className="h-1 rounded-full bg-gray-100 mt-1 overflow-hidden flex justify-end">
          <div className="h-full rounded-full bg-gray-300" style={{ width: `${(prev / max) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { adsData, crmData, dateRange, setDateRange, targetCpl, usingMock, resetToMock } = useDashboardStore();
  const [showUpload, setShowUpload]   = useState(false);
  const [showCompare, setShowCompare] = useState(true);
  const [activeDim, setActiveDim]     = useState(0);

  const prevRange    = useMemo(() => getPreviousPeriod(dateRange), [dateRange]);
  const filteredAds  = useMemo(() => adsData.filter(r => isInRange(r.date, dateRange)), [adsData, dateRange]);
  const filteredCrm  = useMemo(() => crmData.filter(r => isInRange(r.date, dateRange)), [crmData, dateRange]);
  const prevAds      = useMemo(() => adsData.filter(r => isInRange(r.date, prevRange)), [adsData, prevRange]);
  const prevCrm      = useMemo(() => crmData.filter(r => isInRange(r.date, prevRange)), [crmData, prevRange]);
  const cur          = useMemo(() => computeSummary(filteredAds, filteredCrm), [filteredAds, filteredCrm]);
  const prev         = useMemo(() => computeSummary(prevAds, prevCrm), [prevAds, prevCrm]);
  const daily        = useMemo(() => aggregateByDay(filteredAds, filteredCrm), [filteredAds, filteredCrm]);
  const quality      = useMemo(() => checkDataQuality(filteredAds, filteredCrm), [filteredAds, filteredCrm]);
  const dim          = DIMENSIONS[activeDim];
  const tableData    = useMemo(
    () => aggregateBy(filteredAds, filteredCrm, dim.adsDim as any, dim.crmDim as any, targetCpl),
    [filteredAds, filteredCrm, dim, targetCpl],
  );

  const errors = quality.filter(q => q.severity === 'error');

  return (
    <div className="min-h-screen" style={{ background: '#f0f4f8' }}>
      {showUpload && <CSVUpload onClose={() => setShowUpload(false)} />}

      {/* ── Header ── */}
      <header style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)' }}>
        <div className="max-w-[1400px] mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-black text-white leading-none">Painel Analytics</div>
              <div className="text-xs font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Google Ads + CRM · Inteligência de Tráfego Pago
              </div>
            </div>
            {usingMock && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-1" style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24' }}>
                DEMO
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <button
              onClick={() => setShowCompare(!showCompare)}
              className={cn('text-xs font-semibold px-3 py-2 rounded-lg border transition-all',
                showCompare
                  ? 'text-white border-white/30 bg-white/10 backdrop-blur'
                  : 'text-white/50 border-white/10 hover:border-white/20 hover:bg-white/5',
              )}
            >
              ⇄ Comparar
            </button>
            {!usingMock && (
              <button onClick={resetToMock} className="text-white/40 hover:text-white/70 p-2 rounded-lg hover:bg-white/10 transition-colors" title="Demo">
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-all text-blue-900"
              style={{ background: 'white' }}
            >
              <Upload className="w-3.5 h-3.5" />
              Importar dados
            </button>
          </div>
        </div>

        {/* Sub-bar: date range info */}
        <div className="max-w-[1400px] mx-auto px-6 pb-4 flex items-center gap-6 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <span>{formatDate(dateRange.from)} – {formatDate(dateRange.to)}</span>
          {showCompare && <span>vs {formatDate(prevRange.from)} – {formatDate(prevRange.to)}</span>}
          <span className="ml-auto">{filteredAds.length} rows Ads · {filteredCrm.length} leads CRM</span>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">

        {/* ── Alerts ── */}
        {errors.length > 0 && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="font-semibold">{errors.length} erro{errors.length > 1 ? 's' : ''}:</span>
            <span>{errors.map(e => e.type).join(' · ')}</span>
          </div>
        )}

        {/* ── KPI Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard
            label="Investimento" value={fmtBRL(cur.cost)}
            sub={`${fmtNum(cur.clicks)} cliques`}
            d={showCompare ? delta(cur.cost, prev.cost) : undefined}
            icon={<DollarSign className="w-5 h-5" />}
            color="#2563eb" bgColor="#dbeafe"
          />
          <KpiCard
            label="Leads CRM" value={fmtNum(cur.leads)}
            sub={`${fmtNum(cur.conversions)} conv. Ads`}
            d={showCompare ? delta(cur.leads, prev.leads) : undefined}
            icon={<Users className="w-5 h-5" />}
            color="#7c3aed" bgColor="#ede9fe"
          />
          <KpiCard
            label="CPL Real" value={fmtBRL(cur.cplReal)}
            sub="custo por lead CRM"
            d={showCompare ? delta(cur.cplReal, prev.cplReal) : undefined} lowerIsBetter
            icon={<Target className="w-5 h-5" />}
            color="#ea580c" bgColor="#ffedd5"
          />
          <KpiCard
            label="Negócios Ganhos" value={fmtNum(cur.won)}
            sub={`de ${fmtNum(cur.leads)} leads`}
            d={showCompare ? delta(cur.won, prev.won) : undefined}
            icon={<Trophy className="w-5 h-5" />}
            color="#059669" bgColor="#d1fae5"
          />
          <KpiCard
            label="Win Rate" value={fmtPct(cur.closeRate)}
            sub={`${fmtNum(cur.scheduled)} agendamentos`}
            d={showCompare ? delta(cur.closeRate, prev.closeRate) : undefined}
            icon={<Zap className="w-5 h-5" />}
            color="#0891b2" bgColor="#cffafe"
          />
          <KpiCard
            label="Abertos" value={fmtNum(cur.open)}
            sub={`${fmtNum(cur.lost)} perdidos`}
            d={showCompare ? delta(cur.open, prev.open) : undefined}
            icon={<Clock className="w-5 h-5" />}
            color="#b45309" bgColor="#fef3c7"
          />
        </div>

        {/* ── Chart + Side ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">

          {/* Daily bars */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-black text-gray-900">Leads por Dia</h2>
                <p className="text-xs text-gray-400 mt-0.5">Status + investimento Google Ads</p>
              </div>
              <div className="flex gap-4 text-xs text-gray-400 font-medium">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Ganhou</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" />Aberto</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" />Perdeu</span>
              </div>
            </div>
            <DailyChart data={daily} />
          </div>

          {/* Funnel */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-black text-gray-900 mb-5">Funil de Resultados</h2>
            <Funnel s={cur} />
          </div>
        </div>

        {/* ── Comparison (when on) ── */}
        {showCompare && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-black text-gray-900">Comparativo de Período</h2>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="text-gray-700">{formatDate(dateRange.from)} – {formatDate(dateRange.to)}</span>
                <span className="text-gray-300">vs</span>
                <span className="text-gray-400">{formatDate(prevRange.from)} – {formatDate(prevRange.to)}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 divide-y sm:divide-y-0 divide-gray-100">
              {[
                { label: 'Invest.',  curr: cur.cost,      prev: prev.cost,      fmt: fmtBRL, lower: true },
                { label: 'Leads',    curr: cur.leads,     prev: prev.leads,     fmt: fmtNum },
                { label: 'CPL',      curr: cur.cplReal,   prev: prev.cplReal,   fmt: fmtBRL, lower: true },
                { label: 'Win Rate', curr: cur.closeRate, prev: prev.closeRate, fmt: fmtPct },
                { label: 'Ganhou',   curr: cur.won,       prev: prev.won,       fmt: fmtNum },
                { label: 'CTR',      curr: cur.ctr,       prev: prev.ctr,       fmt: fmtPct },
              ].map(m => (
                <CompareRow key={m.label} {...m} />
              ))}
            </div>
          </div>
        )}

        {/* ── Dimension Analysis ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex flex-wrap items-center gap-2">
            <h2 className="text-base font-black text-gray-900 mr-3">Análise por</h2>
            {DIMENSIONS.map((d, i) => (
              <button
                key={d.label}
                onClick={() => setActiveDim(i)}
                className={cn(
                  'text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all',
                  activeDim === i
                    ? 'text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-100',
                )}
                style={activeDim === i ? { background: 'linear-gradient(135deg,#2563eb,#7c3aed)' } : {}}
              >
                {d.label}
              </button>
            ))}
          </div>
          <DataTable data={tableData} title="" />
        </div>

      </main>
    </div>
  );
}
