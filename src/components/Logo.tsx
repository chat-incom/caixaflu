type LogoProps = {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
};

export function Logo({ size = 'medium', showText = true }: LogoProps) {
  const dimensions = {
    small: { width: 120, height: 40, fontSize: '18px' },
    medium: { width: 180, height: 60, fontSize: '28px' },
    large: { width: 240, height: 80, fontSize: '36px' },
  };

  const { width, height, fontSize } = dimensions[size];

  return (
    <div className="flex items-center gap-3">
      <svg
        width={height * 0.9}
        height={height * 0.9}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#1D4ED8', stopOpacity: 1 }} />
          </linearGradient>
          <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#10B981', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#059669', stopOpacity: 1 }} />
          </linearGradient>
        </defs>

        <rect
          x="15"
          y="20"
          width="50"
          height="60"
          rx="8"
          fill="url(#gradient1)"
          opacity="0.9"
        />

        <rect
          x="20"
          y="25"
          width="40"
          height="8"
          rx="2"
          fill="white"
          opacity="0.3"
        />
        <rect
          x="20"
          y="38"
          width="40"
          height="8"
          rx="2"
          fill="white"
          opacity="0.3"
        />
        <rect
          x="20"
          y="51"
          width="40"
          height="8"
          rx="2"
          fill="white"
          opacity="0.3"
        />
        <rect
          x="20"
          y="64"
          width="30"
          height="8"
          rx="2"
          fill="white"
          opacity="0.3"
        />

        <g className="animate-pulse">
          <path
            d="M 55 30 Q 70 30, 75 35 T 85 35"
            stroke="url(#gradient2)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 80 32 L 85 35 L 80 38"
            stroke="url(#gradient2)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        <g className="animate-pulse" style={{ animationDelay: '0.5s' }}>
          <path
            d="M 55 45 Q 70 45, 75 50 T 85 50"
            stroke="url(#gradient2)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 80 47 L 85 50 L 80 53"
            stroke="url(#gradient2)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        <g className="animate-pulse" style={{ animationDelay: '1s' }}>
          <path
            d="M 55 60 Q 70 60, 75 65 T 85 65"
            stroke="url(#gradient2)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 80 62 L 85 65 L 80 68"
            stroke="url(#gradient2)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span
            className="font-bold text-gray-800 leading-tight tracking-tight"
            style={{ fontSize }}
          >
            Caixa<span className="text-blue-600">Flu</span>
          </span>
          <span className="text-xs text-gray-500 -mt-1">
            Controle Financeiro
          </span>
        </div>
      )}
    </div>
  );
}
