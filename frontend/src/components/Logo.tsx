const BLUE = '#3D6EC9';
const BLUE_DARK = '#1E4590';
const BLUE_LIGHT = '#6B9AE8';

// Ring sector: outer r=30, inner r=18, 240deg arc starting at top (-90deg)
// Outer start: (50, 20)
// Outer end after 240deg CW: (50+30*cos(150deg), 50+30*sin(150deg)) = (24.02, 65)
// Inner end: (50+18*cos(150deg), 50+18*sin(150deg)) = (34.41, 59)
// Inner start: (50, 32)
const BLADE = "M 50 20 A 30 30 0 1 1 24.02 65 L 34.41 59 A 18 18 0 1 0 50 32 Z";

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bladeGrad" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor={BLUE_LIGHT} />
          <stop offset="100%" stopColor={BLUE_DARK} />
        </radialGradient>
        <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="0" stdDeviation="1" floodColor={BLUE_DARK} floodOpacity="0.4" />
        </filter>
      </defs>

      {/* 6 blades rotated at 60deg intervals */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <path
          key={i}
          d={BLADE}
          fill="url(#bladeGrad)"
          opacity="0.88"
          transform={`rotate(${angle} 50 50)`}
          filter="url(#logoShadow)"
        />
      ))}

      {/* White center dot */}
      <circle cx="50" cy="50" r="7" fill="white" />
      <circle cx="50" cy="50" r="3.5" fill={BLUE} />
    </svg>
  );
}

export function LogoWithText({ size = 36 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <Logo size={size} />
      <span style={{
        fontSize: `${size * 0.42}px`,
        fontWeight: 400,
        color: BLUE_LIGHT,
        letterSpacing: '0.5px',
        fontFamily: "'Inter', sans-serif",
      }}>
        conversion
      </span>
    </div>
  );
}
