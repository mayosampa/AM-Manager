export function PitchLines() {
  return (
    <svg
      viewBox="0 0 105 68"
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id="grass-stripes" width="10.5" height="68" patternUnits="userSpaceOnUse">
          <rect width="5.25" height="68" fill="#15803d" />
          <rect x="5.25" width="5.25" height="68" fill="#16a34a" />
        </pattern>
      </defs>

      <rect width="105" height="68" fill="url(#grass-stripes)" />

      {/* Pitch markings: all 4 sidelines, 4 corners & 2 goals inside viewBox */}
      <g stroke="rgba(255,255,255,0.75)" strokeWidth="0.45" fill="none">
        {/* Outer border (4 touchlines & goal lines inset inside viewBox) */}
        <rect x="0.35" y="0.35" width="104.3" height="67.3" />
        {/* Corner arcs */}
        <path d="M 0.35 1.35 A 1 1 0 0 0 1.35 0.35" />
        <path d="M 103.65 0.35 A 1 1 0 0 0 104.65 1.35" />
        <path d="M 104.65 66.65 A 1 1 0 0 0 103.65 67.65" />
        <path d="M 1.35 67.65 A 1 1 0 0 0 0.35 66.65" />

        {/* Center line */}
        <line x1="52.5" y1="0.35" x2="52.5" y2="67.65" />
        {/* Center circle */}
        <circle cx="52.5" cy="34" r="9.15" />
        {/* Center spot */}
        <circle cx="52.5" cy="34" r="0.45" fill="rgba(255,255,255,0.75)" />

        {/* Left Penalty Area */}
        <rect x="0.35" y="13.85" width="16.5" height="40.3" />
        {/* Left Goal Area */}
        <rect x="0.35" y="24.84" width="5.5" height="18.32" />
        {/* Left Goal */}
        <rect x="0.05" y="30.34" width="0.3" height="7.32" strokeWidth="0.5" fill="rgba(255,255,255,0.22)" />
        {/* Left Penalty Arc */}
        <path d="M 16.85 25.68 A 9.15 9.15 0 0 1 16.85 42.32" />
        {/* Left Penalty Spot */}
        <circle cx="11.35" cy="34" r="0.45" fill="rgba(255,255,255,0.75)" />

        {/* Right Penalty Area */}
        <rect x="88.15" y="13.85" width="16.5" height="40.3" />
        {/* Right Goal Area */}
        <rect x="99.15" y="24.84" width="5.5" height="18.32" />
        {/* Right Goal */}
        <rect x="104.65" y="30.34" width="0.3" height="7.32" strokeWidth="0.5" fill="rgba(255,255,255,0.22)" />
        {/* Right Penalty Arc */}
        <path d="M 88.15 25.68 A 9.15 9.15 0 0 0 88.15 42.32" />
        {/* Right Penalty Spot */}
        <circle cx="93.65" cy="34" r="0.45" fill="rgba(255,255,255,0.75)" />
      </g>
    </svg>
  );
}
