export function MandalaIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <g transform="translate(200 200)">
        <circle r="172" stroke="currentColor" strokeOpacity=".1" />
        <circle r="160" stroke="currentColor" strokeOpacity=".3" />
        <circle r="135" stroke="currentColor" strokeOpacity=".15" />
        <circle r="90" stroke="currentColor" strokeOpacity=".4" />
        <circle r="44" stroke="currentColor" strokeOpacity=".6" />
        {Array.from({ length: 16 }, (_, index) => (
          <g key={index} transform={`rotate(${index * 22.5})`}>
            <path
              d="M0-44 C-22-60-30-88 0-127 C30-88 22-60 0-44Z"
              stroke="currentColor"
              strokeOpacity={index % 4 === 0 ? '.9' : '.4'}
              fill="currentColor"
              fillOpacity={index % 4 === 0 ? '.1' : '.015'}
            />
            <path
              d="M0-95 C-16-117-18-137 0-157 C18-137 16-117 0-95Z"
              stroke="currentColor"
              strokeOpacity=".55"
            />
            <path d="M0-53 L0-112" stroke="currentColor" strokeOpacity=".25" />
            <circle cy="-167" r="2" fill="currentColor" fillOpacity=".6" />
          </g>
        ))}
        {Array.from({ length: 8 }, (_, index) => (
          <path
            key={index}
            d="M0-8 C-16-16-19-28 0-40 C19-28 16-16 0-8Z"
            transform={`rotate(${index * 45})`}
            stroke="currentColor"
            strokeOpacity=".8"
            fill="currentColor"
            fillOpacity=".12"
          />
        ))}
        <circle r="8" fill="currentColor" fillOpacity=".6" />
      </g>
    </svg>
  );
}
