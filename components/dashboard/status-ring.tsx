import { ShieldCheck, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ZoneStatus } from '@/lib/pipeline-data'

const RADIUS = 56
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const TICKS = Array.from({ length: 60 }, (_, i) => i)

export function StatusRing({ status }: { status: ZoneStatus }) {
  const isLeak = status === 'leak'

  return (
    <div
      className={cn(
        'relative flex size-44 items-center justify-center sm:size-48',
        isLeak && 'animate-ring-vibrate',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-6 rounded-full blur-2xl transition-all duration-700',
          isLeak ? 'bg-alert/25' : 'bg-safe/[0.07]',
        )}
      />

      {isLeak && (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-4 animate-ring-ping rounded-full border border-alert/70"
          />
          <span
            aria-hidden="true"
            className="absolute inset-4 animate-ring-ping rounded-full border border-alert/50 [animation-delay:0.9s]"
          />
        </>
      )}

      <svg viewBox="0 0 140 140" className="absolute inset-0 size-full" aria-hidden="true">
        <g className="text-foreground/15">
          {TICKS.map((i) => (
            <line
              key={i}
              x1="70"
              y1="3"
              x2="70"
              y2={i % 5 === 0 ? 8 : 5.5}
              stroke="currentColor"
              strokeWidth={i % 5 === 0 ? 1 : 0.6}
              transform={`rotate(${i * 6} 70 70)`}
            />
          ))}
        </g>

        <circle cx="70" cy="70" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="1" className="text-foreground/[0.08]" />

        <g
          className={cn(
            'origin-center transition-colors duration-700',
            isLeak ? 'animate-crimson-pulse text-alert' : 'text-safe drop-shadow-[0_0_4px_var(--safe)]',
          )}
        >
          <circle
            cx="70"
            cy="70"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={isLeak ? 3 : 1.75}
            strokeLinecap="round"
            strokeDasharray={
              isLeak ? `${CIRCUMFERENCE * 0.06} ${CIRCUMFERENCE * 0.0233}` : `${CIRCUMFERENCE} 0`
            }
            className="transition-[stroke-width,stroke-dasharray] duration-700 ease-out"
            transform="rotate(-90 70 70)"
          />
        </g>

        {!isLeak && (
          <g className="origin-center animate-ring-scan text-safe">
            <circle
              cx="70"
              cy="70"
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE * 0.04} ${CIRCUMFERENCE}`}
              className="drop-shadow-[0_0_6px_var(--safe)]"
            />
          </g>
        )}
      </svg>

      <div key={status} className="relative flex flex-col items-center gap-2 text-center animate-in fade-in zoom-in-95 duration-500">
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-full border',
            isLeak ? 'border-alert/40 bg-alert/15' : 'border-safe/25 bg-safe/[0.08]',
          )}
        >
          {isLeak ? (
            <TriangleAlert className="size-4 text-alert" aria-hidden="true" />
          ) : (
            <ShieldCheck className="size-4 text-safe" aria-hidden="true" />
          )}
        </span>
        <span
          className={cn(
            'text-[11px] font-semibold leading-tight tracking-[0.22em]',
            isLeak ? 'text-alert' : 'text-safe',
          )}
        >
          {isLeak ? (
            <>
              LEAK
              <br />
              DETECTED
            </>
          ) : (
            'SAFE'
          )}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {isLeak ? 'Action required' : 'Nominal flow'}
        </span>
      </div>
    </div>
  )
}
