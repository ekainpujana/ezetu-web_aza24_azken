export function Ikurrina({ className = 'w-6 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 160"
      className={className}
      aria-label="Ikurriña"
      role="img"
      preserveAspectRatio="xMidYMid slice"
      shapeRendering="geometricPrecision"
    >
      <rect width="240" height="160" fill="#D52B1E" />
      <path d="M0,0 L21,0 L240,146 L240,160 L219,160 L0,14 Z" fill="#009B48" />
      <path d="M219,0 L240,0 L240,14 L21,160 L0,160 L0,146 Z" fill="#009B48" />
      <rect x="108" width="24" height="160" fill="#FFFFFF" />
      <rect y="68" width="240" height="24" fill="#FFFFFF" />
    </svg>
  );
}