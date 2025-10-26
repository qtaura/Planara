interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizes[size]} relative`}>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Gradient definition */}
          <defs>
            <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>

          {/* Background circle */}
          <rect width="32" height="32" rx="8" fill="url(#logo-gradient)" />

          {/* Letter P in modern geometric style */}
          <path
            d="M10 8h7c2.76 0 5 2.24 5 5s-2.24 5-5 5h-3v6h-4V8zm4 4v4h3c1.1 0 2-.9 2-2s-.9-2-2-2h-3z"
            fill="white"
          />

          {/* Subtle accent dot */}
          <circle cx="23" cy="23" r="2" fill="white" opacity="0.6" />
        </svg>
      </div>
      {showText && (
        <span className={`${textSizes[size]} tracking-tight text-slate-900 dark:text-white`}>
          Planara
        </span>
      )}
    </div>
  );
}
