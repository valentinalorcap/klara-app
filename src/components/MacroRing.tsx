import { cn } from '@/lib/utils';

type Size = 'lg' | 'sm';

export type MacroRingProps = {
  /** Current consumed value (already-rounded number is fine). */
  current: number;
  /** Target value. Null means "no goal set" — only the value renders. */
  target: number | null;
  /** Accent color for the progress arc. */
  color: string;
  /** Tiny label under the value, e.g. "kcal", "g P". */
  label: string;
  /** What to render as the big number. */
  valueText: string;
  size?: Size;
  className?: string;
};

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function MacroRing({
  current,
  target,
  color,
  label,
  valueText,
  size = 'lg',
  className,
}: MacroRingProps) {
  const hasGoal = target != null && target > 0;
  const isOverflow = hasGoal && current > target;
  // In normal mode the arc fills proportionally to current/target.
  // In overflow mode the *background* shows that the goal is full (red,
  // less opacity) and the *arc* shows how far past the goal the user
  // went — overage / target, capped at one full ring.
  const pct = !hasGoal
    ? 0
    : isOverflow
      ? Math.min((current - target) / target, 1)
      : current / target;
  const dash = CIRCUMFERENCE * pct;
  const trackColor = isOverflow ? 'rgba(248, 113, 113, 0.25)' : 'rgba(255,255,255,0.08)';
  const strokeColor = isOverflow ? '#dc2626' : color;
  const strokeWidth = size === 'lg' ? 9 : 11;

  return (
    <div className={cn('relative aspect-square w-full', className)}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle
          cx={50}
          cy={50}
          r={RADIUS}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {hasGoal ? (
          <circle
            cx={50}
            cy={50}
            r={RADIUS}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p
          className={cn(
            'font-bold text-white tabular-nums',
            size === 'lg' ? 'text-2xl' : 'text-base',
          )}
        >
          {valueText}
        </p>
        <p
          className={cn(
            'mt-0.5 tracking-wider text-neutral-400 uppercase',
            size === 'lg' ? 'text-[10px]' : 'text-[9px]',
          )}
        >
          {label}
        </p>
        {hasGoal ? (
          <p
            className={cn(
              'mt-0.5 tabular-nums',
              isOverflow ? 'text-[var(--danger)]' : 'text-neutral-500',
              size === 'lg' ? 'text-[11px]' : 'text-[9px]',
            )}
          >
            / {Math.round(target as number)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Canonical colors per macro — picked to read on the dark background.
 *  Mirrors the `--macro-*` CSS variables in globals.css. */
export const MACRO_COLORS = {
  protein: '#67e8f9',
  kcal: '#a78bfa',
  carbs: '#fb923c',
  fat: '#f472b6',
} as const;
