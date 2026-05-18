import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

const CYAN = '#3DB8E8';

export interface DateRange {
  from: string;
  to: string;
}

const PRESETS = [
  { label: 'Hoje', days: 0 },
  { label: 'Ontem', days: 1, offset: 1 },
  { label: '7 dias', days: 6 },
  { label: '14 dias', days: 13 },
  { label: '30 dias', days: 29 },
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
  return getPresetRange(6); // last 7 days
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

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => selectPreset(p.days, (p as any).offset)}
            style={{
              padding: '5px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
              background: isPresetActive(p.days, (p as any).offset) ? CYAN : 'rgba(255,255,255,0.06)',
              color: isPresetActive(p.days, (p as any).offset) ? '#000' : 'rgba(255,255,255,0.5)',
              transition: 'all 0.15s',
            }}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setCustomOpen((o) => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 12px', borderRadius: '8px', cursor: 'pointer',
            fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
            background: customOpen ? `${CYAN}20` : 'rgba(255,255,255,0.06)',
            border: customOpen ? `1px solid ${CYAN}50` : '1px solid transparent',
            color: customOpen ? CYAN : 'rgba(255,255,255,0.5)',
            transition: 'all 0.15s',
          }}
        >
          <Calendar size={12} />
          {!PRESETS.some((p) => isPresetActive(p.days, (p as any).offset)) ? displayLabel : 'Personalizado'}
        </button>
      </div>

      {customOpen && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '8px', zIndex: 100,
          background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
          padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-end', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <div>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>DE</p>
            <input
              type="date"
              value={draft.from}
              max={draft.to}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', color: '#fff', padding: '6px 10px', fontSize: '13px',
                fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>
          <div>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>ATÉ</p>
            <input
              type="date"
              value={draft.to}
              min={draft.from}
              max={fmt(new Date())}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', color: '#fff', padding: '6px 10px', fontSize: '13px',
                fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>
          <button
            onClick={applyCustom}
            style={{
              padding: '7px 16px', borderRadius: '8px', border: 'none',
              background: CYAN, color: '#000', fontSize: '12px', fontWeight: 700,
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
