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

      {/* Pitch markings */}
      <g stroke="rgba(255,255,255,0.7)" strokeWidth="0.3" fill="none">
        {/* Outer border */}
        <rect x="0" y="0" width="105" height="68" />
        {/* Center line */}
        <line x1="52.5" y1="0" x2="52.5" y2="68" />
        {/* Center circle */}
        <circle cx="52.5" cy="34" r="9.15" />
        {/* Center spot */}
        <circle cx="52.5" cy="34" r="0.4" fill="rgba(255,255,255,0.7)" />
        
        {/* Left Penalty Area */}
        <rect x="0" y="13.85" width="16.5" height="40.3" />
        {/* Left Goal Area */}
        <rect x="0" y="24.84" width="5.5" height="18.32" />
        {/* Left Penalty Arc */}
        <path d="M 16.5 25.68 A 9.15 9.15 0 0 1 16.5 42.32" />
        {/* Left Penalty Spot */}
        <circle cx="11" cy="34" r="0.4" fill="rgba(255,255,255,0.7)" />

        {/* Right Penalty Area */}
        <rect x="88.5" y="13.85" width="16.5" height="40.3" />
        {/* Right Goal Area */}
        <rect x="99.5" y="24.84" width="5.5" height="18.32" />
        {/* Right Penalty Arc */}
        <path d="M 88.5 25.68 A 9.15 9.15 0 0 0 88.5 42.32" />
        {/* Right Penalty Spot */}
        <circle cx="94" cy="34" r="0.4" fill="rgba(255,255,255,0.7)" />
      </g>
    </svg>
  );
}
