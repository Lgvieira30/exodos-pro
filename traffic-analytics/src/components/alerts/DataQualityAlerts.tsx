'use client';
import { AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { DataQualityIssue } from '@/types/dashboard';
import { fmtNum } from '@/lib/formatters';

interface DataQualityAlertsProps {
  issues: DataQualityIssue[];
}

export function DataQualityAlerts({ issues }: DataQualityAlertsProps) {
  const [expanded, setExpanded] = useState(false);

  if (issues.length === 0) return null;

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const visible = expanded ? issues : issues.slice(0, 2);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-800">
            Qualidade de dados — {errors.length > 0 ? `${errors.length} erro${errors.length > 1 ? 's' : ''}` : ''}{errors.length > 0 && warnings.length > 0 ? ', ' : ''}{warnings.length > 0 ? `${warnings.length} aviso${warnings.length > 1 ? 's' : ''}` : ''}
          </span>
        </div>
        {issues.length > 2 && (
          expanded ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-amber-400" />
        )}
      </button>

      <div className="mt-3 space-y-2">
        {visible.map((issue, i) => (
          <div key={i} className="flex items-start gap-2">
            {issue.severity === 'error'
              ? <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
              : <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
            }
            <div>
              <span className="text-xs font-medium text-gray-700">{issue.type}</span>
              <span className="text-xs text-gray-500 ml-1.5">({fmtNum(issue.count)})</span>
              <p className="text-xs text-gray-500">{issue.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
