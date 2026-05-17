'use client';

interface Props {
  color?: string;
  size?: number;
  thickness?: number;
  inset?: number;
  active?: boolean;
}

export function HudCorners({
  color = 'var(--color-accent)',
  size = 14,
  thickness = 1.5,
  inset = 4,
  active = false,
}: Props) {
  const opacity = active ? 1 : 0.55;
  const glow = active
    ? `drop-shadow(0 0 6px color-mix(in oklch, ${color} 70%, transparent))`
    : 'none';

  const corner = (transform: string) => (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        position: 'absolute',
        transform,
        opacity,
        filter: glow,
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      <path
        d={`M 0 ${size} L 0 0 L ${size} 0`}
        stroke={color}
        strokeWidth={thickness}
        fill="none"
        strokeLinecap="square"
      />
    </svg>
  );

  return (
    <>
      <span style={{ position: 'absolute', top: inset, left: inset }}>
        {corner('rotate(0deg)')}
      </span>
      <span style={{ position: 'absolute', top: inset, right: inset }}>
        {corner('rotate(90deg)')}
      </span>
      <span style={{ position: 'absolute', bottom: inset, right: inset }}>
        {corner('rotate(180deg)')}
      </span>
      <span style={{ position: 'absolute', bottom: inset, left: inset }}>
        {corner('rotate(270deg)')}
      </span>
    </>
  );
}
