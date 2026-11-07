import { ShieldCheck, TriangleAlert, RadioOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ZoneStatus } from '@/lib/pipeline-data'

const RADIUS = 56
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const TICKS = Array.from({ length: 60 }, (_, i) => i)

export function StatusRing({ status }: { status: ZoneStatus }) {
  const isLeak = status === 'leak'
  const isOffline = status === 'offline'

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
          'absolute inset-5 rounded-full transition-colors duration-700',
          isOffline ? 'bg-muted/10' : isLeak ? 'bg-alert/[0.08]' : 'bg-safe/[0.06]',
        )}
      />

      {isLeak && (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-4 animate-ring-ping rounded-full border-2 border-alert/60"
          />
          <span
            aria-hidden="true"
            className="absolute inset-4 animate-ring-ping rounded-full border border-alert/40 [animation-delay:0.9s]"
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

        <circle
          cx="70"
          cy="70"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          className="text-foreground/[0.06]"
        />

        <g
          className={cn(
            'origin-center transition-colors duration-700',
            isOffline
              ? 'text-muted-foreground/30'
              : isLeak
              ? 'animate-alert-pulse text-alert'
              : 'text-safe dark:drop-shadow-[0_0_6px_color-mix(in_oklch,var(--safe)_60%,transparent)]',
          )}
        >
          <circle
            cx="70"
            cy="70"
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={isLeak ? 5 : 4}
            strokeLinecap="round"
            strokeDasharray={
              isLeak ? `${CIRCUMFERENCE * 0.06} ${CIRCUMFERENCE * 0.0233}` : `${CIRCUMFERENCE} 0`
            }
            className="transition-[stroke-width,stroke-dasharray] duration-700 ease-out"
            transform="rotate(-90 70 70)"
          />
        </g>

        {!isLeak && !isOffline && (
          <g className="origin-center animate-ring-scan text-safe-ink">
            <circle
              cx="70"
              cy="70"
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE * 0.05} ${CIRCUMFERENCE}`}
            />
          </g>
        )}
      </svg>

      {isLeak && (
        <span aria-hidden="true" className="absolute right-[13%] top-[13%] flex size-3.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-alert opacity-80" />
          <span className="relative inline-flex size-3.5 rounded-full border-2 border-card bg-alert" />
        </span>
      )}

      <div
        key={status}
        className="relative flex flex-col items-center gap-2 text-center animate-in fade-in zoom-in-95 duration-500"
      >
        <span
          className={cn(
            'flex size-10 items-center justify-center rounded-full',
            isOffline
              ? 'bg-muted text-muted-foreground'
              : isLeak
              ? 'bg-alert text-primary-foreground'
              : 'bg-safe/15 text-safe-ink',
          )}
        >
          {isOffline ? (
            <RadioOff className="size-[18px]" aria-hidden="true" />
          ) : isLeak ? (
            <TriangleAlert className="size-[18px]" aria-hidden="true" />
          ) : (
            <ShieldCheck className="size-[18px]" aria-hidden="true" />
          )}
        </span>
        <span
          className={cn(
            'text-xs font-bold leading-tight tracking-[0.2em]',
            isOffline ? 'text-muted-foreground' : isLeak ? 'text-alert-ink' : 'text-safe-ink',
          )}
        >
          {isOffline ? (
            'OFFLINE'
          ) : isLeak ? (
            <>
              LEAK
              <br />
              DETECTED
            </>
          ) : (
            'SAFE'
          )}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {isOffline ? 'No telemetry' : isLeak ? 'Action required' : 'Nominal flow'}
        </span>
      </div>
    </div>
  )
}
