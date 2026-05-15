import React, { useState } from 'react';

const PRIMARY = '#6B9AE8';

const OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'custom', label: 'Personalizado' },
];

interface DateRangePickerProps {
  value: string;
  onChange: (range: string, since?: string, until?: string) => void;
  since?: string;
  until?: string;
}

export default function DateRangePicker({ value, onChange, since, until }: DateRangePickerProps) {
  const [localSince, setLocalSince] = useState(since || '');
  const [localUntil, setLocalUntil] = useState(until || '');

  function handleOptionClick(opt: string) {
    if (opt !== 'custom') {
      onChange(opt);
    } else {
      onChange('custom', localSince || undefined, localUntil || undefined);
    }
  }

  function handleCustomApply() {
    if (localSince && localUntil) {
      onChange('custom', localSince, localUntil);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <div
        style={{
          display: 'flex',
          background: '#0a0a0a',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleOptionClick(opt.value)}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: value === opt.value ? 600 : 400,
              color: value === opt.value ? '#fff' : 'rgba(255,255,255,0.4)',
              background: value === opt.value ? `${PRIMARY}22` : 'transparent',
              border: 'none',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
              outline: value === opt.value ? `1px solid ${PRIMARY}44` : 'none',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {value === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="date"
            value={localSince}
            onChange={(e) => setLocalSince(e.target.value)}
            style={{
              background: '#0a0a0a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '12px',
              padding: '5px 8px',
              fontFamily: 'inherit',
              colorScheme: 'dark',
            }}
          />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>até</span>
          <input
            type="date"
            value={localUntil}
            onChange={(e) => setLocalUntil(e.target.value)}
            style={{
              background: '#0a0a0a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '12px',
              padding: '5px 8px',
              fontFamily: 'inherit',
              colorScheme: 'dark',
            }}
          />
          <button
            onClick={handleCustomApply}
            style={{
              background: PRIMARY,
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              padding: '5px 12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
