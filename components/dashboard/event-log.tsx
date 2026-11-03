import { cn } from '@/lib/utils'
import type { EventLevel, PipelineEvent } from '@/lib/pipeline-data'

const levelStyles: Record<EventLevel, { label: string; className: string }> = {
  boot: { label: 'BOOT', className: 'border-border text-muted-foreground' },
  info: { label: 'INFO', className: 'border-safe/30 text-safe' },
  alert: { label: 'ALERT', className: 'border-alert/40 bg-alert/10 text-alert' },
}

export function EventLog({ events }: { events: PipelineEvent[] }) {
  return (
    <section
      aria-labelledby="event-log-title"
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
        <h2 id="event-log-title" className="text-sm font-semibold tracking-[0.15em] text-foreground">
          LIVE EVENT LOG
        </h2>
        <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-safe" aria-hidden="true" />
          Streaming
        </span>
      </div>

      <ol
        role="log"
        aria-live="polite"
        className="flex h-72 flex-col overflow-y-auto font-mono text-xs sm:text-sm"
      >
        {events.map((event) => {
          const level = levelStyles[event.level]
          return (
            <li
              key={event.id}
              className="flex flex-col gap-1.5 border-b border-border/60 px-5 py-3 animate-in fade-in slide-in-from-top-1 duration-500 last:border-b-0 sm:flex-row sm:items-center sm:gap-4 sm:px-6"
            >
              <div className="flex items-center gap-3">
                <time className="shrink-0 tabular-nums text-muted-foreground">{event.timestamp}</time>
                <span
                  className={cn(
                    'inline-flex w-14 shrink-0 justify-center rounded border px-1.5 py-0.5 text-[11px] font-semibold tracking-wider',
                    level.className,
                  )}
                >
                  {level.label}
                </span>
              </div>
              <p
                className={cn(
                  'leading-relaxed text-pretty',
                  event.level === 'alert' ? 'text-alert' : 'text-foreground/90',
                )}
              >
                {event.zone && <span className="text-muted-foreground">[{event.zone}] </span>}
                {event.message}
              </p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
