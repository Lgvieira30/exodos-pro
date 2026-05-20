import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

const ACCENT = '#00C8FF';
const BG_CARD = '#161617';
const FG = '#E8E8E8';
const FG_MUTED = 'rgba(232,232,232,0.45)';
const BORDER = 'rgba(255,255,255,0.07)';
const BORDER_ACTIVE = 'rgba(0,200,255,0.18)';
const BG_INPUT = '#0D0D0E';

export interface DateRange {
  from: string;
  to: string;
}

const PRESETS = [
  { label: 'Hoje',     days: 0,  offset: 0 },
  { label: 'Ontem',   days: 0,  offset: 1 },
  { label: '7d',      days: 6,  offset: 0 },
  { label: '14d',     days: 13, offset: 0 },
  { label: '30d',     days: 29, offset: 0 },
];

function fmt(d: Date) {
  return d.toISOString().split('T')[0];
}

export function getPresetRange(days: number, offset = 0): DateRange {
  const to = new Date();
  to.setDate(to.getDate() - offset);
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  return { from: fmt(from), to: fmt(to) };
}

export function defaultRange(): DateRange {
  return getPresetRange(6);
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: Props) {
  const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  function isPresetActive(days: number, offset = 0) {
    const p = getPresetRange(days, offset);
    return p.from === value.from && p.to === value.to;
  }

  function selectPreset(days: number, offset = 0) {
    setCustomOpen(false);
    onChange(getPresetRange(days, offset));
  }

  function applyCustom() {
    if (draft.from && draft.to && draft.from <= draft.to) {
      onChange(draft);
      setCustomOpen(false);
    }
  }

  const displayLabel = (() => {
    for (const p of PRESETS) {
      if (isPresetActive(p.days, (p as any).offset)) return p.label;
    }
    return `${value.from.split('-').reverse().join('/')} → ${value.to.split('-').reverse().join('/')}`;
  })();

  const inputStyle: React.CSSProperties = {
    background: BG_INPUT,
    border: `1px solid ${BORDER}`,
    borderRadius: '8px',
    color: FG,
    padding: '6px 10px',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
    colorScheme: 'dark',
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
        {PRESETS.map((p) => {
          const active = isPresetActive(p.days, (p as any).offset);
          return (
            <button
              key={p.label}
              onClick={() => selectPreset(p.days, (p as any).offset)}
              style={{
                padding: '5px 11px', borderRadius: '7px', cursor: 'pointer',
                fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
                border: active ? `1px solid ${BORDER_ACTIVE}` : `1px solid ${BORDER}`,
                background: active ? `rgba(0,200,255,0.12)` : 'rgba(0,200,255,0.03)',
                color: active ? ACCENT : FG_MUTED,
                transition: 'all 0.15s',
              }}
            >
              {p.label}
            </button>
          );
        })}
        <button
          onClick={() => setCustomOpen((o) => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 11px', borderRadius: '7px', cursor: 'pointer',
            fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
            border: customOpen ? `1px solid ${BORDER_ACTIVE}` : `1px solid ${BORDER}`,
            background: customOpen ? 'rgba(0,200,255,0.12)' : 'rgba(0,200,255,0.03)',
            color: customOpen ? ACCENT : FG_MUTED,
            transition: 'all 0.15s',
          }}
        >
          <Calendar size={12} />
          {!PRESETS.some((p) => isPresetActive(p.days, (p as any).offset)) ? displayLabel : 'Período'}
        </button>
      </div>

      {customOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200,
          background: BG_CARD,
          border: `1px solid ${BORDER_ACTIVE}`,
          borderRadius: '12px',
          padding: '16px',
          display: 'flex', gap: '12px', alignItems: 'flex-end',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        }}>
          <div>
            <p style={{ fontSize: '10px', color: ACCENT, marginBottom: '4px', letterSpacing: '0.08em', fontWeight: 700 }}>DE</p>
            <input
              type="date"
              value={draft.from}
              max={draft.to}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div>
            <p style={{ fontSize: '10px', color: ACCENT, marginBottom: '4px', letterSpacing: '0.08em', fontWeight: 700 }}>ATÉ</p>
            <input
              type="date"
              value={draft.to}
              min={draft.from}
              max={fmt(new Date())}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <button
            onClick={applyCustom}
            style={{
              padding: '7px 16px', borderRadius: '8px', border: 'none',
              background: ACCENT, color: '#000', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
