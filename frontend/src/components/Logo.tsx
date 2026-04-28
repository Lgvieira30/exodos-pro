export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="url(#bgGrad)" opacity="0.15" />
      {/* Círculos interligados formando a mandala */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const cx = 50 + 20 * Math.cos(rad);
        const cy = 50 + 20 * Math.sin(rad);
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r="18"
            fill="none"
            stroke="url(#strokeGrad)"
            strokeWidth="5"
            opacity={0.75 + i * 0.03}
          />
        );
      })}
      {/* Centro */}
      <circle cx="50" cy="50" r="8" fill="white" opacity="0.9" />
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3DB8E8" />
          <stop offset="1" stopColor="#1a6fa3" />
        </linearGradient>
        <linearGradient id="strokeGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3DB8E8" />
          <stop offset="1" stopColor="#2596c4" />
        </linearGradient>
      </defs>
    </svg>
  );
}
