import type { Decision, Confidence } from '@/types/dashboard';
import { DECISION_COLORS, DECISION_BG } from '@/lib/decisionEngine';

interface DecisionBadgeProps {
  decision: Decision;
  confidence?: Confidence;
  reason?: string;
}

export function DecisionBadge({ decision, confidence, reason }: DecisionBadgeProps) {
  const color = DECISION_COLORS[decision];
  const bg = DECISION_BG[decision];

  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold w-fit"
        style={{ color, backgroundColor: bg }}
        title={reason}
      >
        {decision}
      </span>
      {confidence && (
        <span className="text-[10px] text-gray-400">Conf. {confidence}</span>
      )}
    </div>
  );
}
