export function Logo({ size = 36 }: { size?: number }) {
  const c = 50;
  const r = 18;
  const dist = 16;
  const angles = [0, 60, 120, 180, 240, 300];

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="lg1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3DB8E8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0d5a7a" stopOpacity="0.7" />
        </radialGradient>
        <radialGradient id="lg2" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#5ecfee" />
          <stop offset="100%" stopColor="#1a7ca8" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* 6 círculos sobrepostos em anel — padrão flor de vida */}
      {angles.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const cx = c + dist * Math.cos(rad);
        const cy = c + dist * Math.sin(rad);
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="url(#lg2)"
            strokeWidth="4.5"
            opacity="0.85"
            filter="url(#glow)"
          />
        );
      })}

      {/* Círculo central */}
      <circle cx={c} cy={c} r={r} fill="none" stroke="url(#lg1)" strokeWidth="4.5" opacity="0.9" filter="url(#glow)" />

      {/* Ponto branco central */}
      <circle cx={c} cy={c} r="5" fill="white" opacity="0.95" />
      <circle cx={c} cy={c} r="2.5" fill="#3DB8E8" opacity="1" />
    </svg>
  );
}
