/**
 * Black serpent coiling back and forth (~2.5 turns) over a white avatar.
 * Monochrome, no tongue. Effects: a sheen gliding along the body + a pulsing eye.
 */
export default function SnakeFrame() {
  // Alternating semicircles spiralling inward → a "winding back and forth" coil.
  const BODY =
    "M50,92 A42,42 0 0 1 50,8 A37,37 0 0 1 50,82 A32,32 0 0 1 50,18 A27,27 0 0 1 50,72 A22,22 0 0 1 50,28";

  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full pointer-events-none"
      fill="none"
      aria-hidden
    >
      {/* sleek black body */}
      <path d={BODY} stroke="var(--bg-primary)" strokeWidth="3.1" strokeLinecap="round" />
      {/* sheen gliding along the body */}
      <path
        d={BODY}
        pathLength={100}
        stroke="var(--text-primary)"
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeDasharray="8 92"
        opacity="0.5"
        className="snake-glint"
      />

      {/* head (coffin-shaped), on top */}
      <path d="M50,20 L45.3,28 L50,33.5 L54.7,28 Z" fill="var(--bg-primary)" />
      {/* eye */}
      <circle cx="52.2" cy="28.6" r="1.1" fill="var(--text-primary)" className="snake-eye" />
    </svg>
  );
}
