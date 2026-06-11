/**
 * Black-mamba inspired serpent coiled ~1.5 times around a square avatar.
 * Sleek (thin body), monochrome, with animated effects: a glint travelling
 * along the body, a pulsing eye, and a flicking forked tongue.
 */
export default function SnakeFrame() {
  // Inward spiral: outer-left bulge → right bulge → inner-left bulge, head on top.
  const BODY = "M50,94 A44,44 0 0 1 50,6 A38,38 0 0 1 50,82 A30,30 0 0 1 50,22";

  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
      fill="none"
      aria-hidden
    >
      {/* contrast shadow under the body (legible over light avatars) */}
      <path d={BODY} stroke="var(--bg-primary)" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
      {/* sleek body */}
      <path d={BODY} stroke="var(--text-primary)" strokeWidth="3.2" strokeLinecap="round" opacity="0.82" />
      {/* travelling glint (bright segment sliding along the body) */}
      <path
        d={BODY}
        pathLength={100}
        stroke="var(--text-primary)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeDasharray="9 91"
        className="snake-glint"
      />

      {/* head (coffin-shaped), on top */}
      <path d="M50,12.5 L44.5,21.5 L50,28 L55.5,21.5 Z" fill="var(--text-primary)" />
      {/* eye */}
      <circle cx="52.3" cy="20.2" r="1.15" fill="var(--bg-primary)" className="snake-eye" />
      {/* flicking forked tongue */}
      <g className="snake-tongue" stroke="var(--text-primary)" strokeWidth="1" strokeLinecap="round">
        <path d="M50,12.5 L50,7.5" />
        <path d="M50,7.5 L47,3.5" />
        <path d="M50,7.5 L53,3.5" />
      </g>
    </svg>
  );
}
