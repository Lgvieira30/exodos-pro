import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

export function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex items-center">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-slate-600 hover:text-slate-400 transition-colors ml-1"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-52 text-xs text-slate-300 rounded-xl px-3 py-2.5 pointer-events-none" style={{
          background: '#0f172a',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        }}>
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0" style={{
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid rgba(255,255,255,0.1)',
          }} />
        </div>
      )}
    </div>
  );
}
