
import { spinnerVariants } from "./spinner-variants"
import type { SpinnerVariantProps } from "./spinner-variants"

interface SpinnerProps extends SpinnerVariantProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
  fullScreen?: boolean
}

export function Spinner({ text = 'Lade...', size = 'md', fullScreen = false, variant = 'amber' }: SpinnerProps) {
  const sizePx = size === 'sm' ? 32 : size === 'lg' ? 64 : 48;
  const stroke = size === 'sm' ? 4 : size === 'lg' ? 8 : 6;
  const color = variant === 'amber' ? '#FFD700' : 'currentColor';
  const textClass = variant === 'amber' ? 'text-amber-600' : '';
  const content = (
    <div className={spinnerVariants({ variant })}>
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
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={Math.PI * (sizePx - stroke) * 0.7}
          strokeDashoffset={Math.PI * (sizePx - stroke) * 0.15}
          fill="none"
          opacity="0.95"
          style={{ transition: 'stroke 0.2s' }}
        />
      </svg>
      {text && <p className={`text-sm font-semibold animate-pulse ${textClass}`}>{text}</p>}
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
