import { ShieldCheck, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ZoneStatus } from '@/lib/pipeline-data'

const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function StatusRing({ status }: { status: ZoneStatus }) {
  const isLeak = status === 'leak'

  return (
    <div className="relative flex size-40 items-center justify-center sm:size-44">
      {isLeak && (
        <span
          aria-hidden="true"
          className="absolute inset-3 animate-ring-ping rounded-full border-2 border-alert"
        />
      )}

      <svg
        viewBox="0 0 128 128"
        className={cn(
          'absolute inset-0 size-full -rotate-90',
          isLeak
            ? 'animate-alert-pulse text-alert'
            : 'text-safe drop-shadow-[0_0_10px_var(--safe)]',
        )}
        aria-hidden="true"
      >
        <circle
          cx="64"
          cy="64"
          r={RADIUS}
          fill="none"
          className="stroke-muted"
          strokeWidth="6"
        />
        <circle
          cx="64"
          cy="64"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={isLeak ? `${CIRCUMFERENCE * 0.08} ${CIRCUMFERENCE * 0.045}` : CIRCUMFERENCE}
        />
      </svg>

      <div className="relative flex flex-col items-center gap-1.5 text-center">
        {isLeak ? (
          <TriangleAlert className="size-6 text-alert" aria-hidden="true" />
        ) : (
          <ShieldCheck className="size-6 text-safe" aria-hidden="true" />
        )}
        <span
          className={cn(
            'font-mono text-xs font-semibold tracking-[0.15em]',
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
      </div>
    </div>
  )
}
