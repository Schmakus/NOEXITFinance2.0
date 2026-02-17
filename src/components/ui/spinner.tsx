interface SpinnerProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
  fullScreen?: boolean
}

export function Spinner({ text = 'Lade...', size = 'md', fullScreen = false }: SpinnerProps) {
  const sizePx = size === 'sm' ? 32 : size === 'lg' ? 64 : 48;
  const stroke = size === 'sm' ? 4 : size === 'lg' ? 8 : 6;
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <svg
        width={sizePx}
        height={sizePx}
        viewBox={`0 0 ${sizePx} ${sizePx}`}
        className="animate-spin"
      >
        <circle
          cx={sizePx / 2}
          cy={sizePx / 2}
          r={(sizePx - stroke) / 2}
          stroke="#FFD700"
          strokeWidth={stroke}
          strokeDasharray={Math.PI * (sizePx - stroke) * 0.7}
          strokeDashoffset={Math.PI * (sizePx - stroke) * 0.15}
          fill="none"
          opacity="0.95"
          style={{ transition: 'stroke 0.2s' }}
        />
      </svg>
      {text && <p className="text-sm font-semibold text-amber-600 animate-pulse">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      {content}
    </div>
  );
}
