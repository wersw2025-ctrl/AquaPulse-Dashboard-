import { cn } from '@/lib/utils'
import type { EventLevel, PipelineEvent } from '@/lib/pipeline-data'

const levelStyles: Record<EventLevel, { label: string; dot: string; badge: string }> = {
  boot: {
    label: 'BOOT',
    dot: 'bg-muted-foreground/60',
    badge: 'bg-secondary text-muted-foreground',
  },
  info: {
    label: 'INFO',
    dot: 'bg-primary',
    badge: 'bg-primary/10 text-primary',
  },
  alert: {
    label: 'ALERT',
    dot: 'bg-alert',
    badge: 'bg-alert text-primary-foreground',
  },
}

export function EventLog({ events }: { events: PipelineEvent[] }) {
  return (
    <section
      aria-labelledby="event-log-title"
      className="surface flex flex-col overflow-hidden rounded-2xl"
    >
      <div className="flex items-center justify-between border-b border-surface-border px-5 py-4 sm:px-6">
        <div className="flex items-baseline gap-3">
          <h2 id="event-log-title" className="text-xs font-bold tracking-[0.2em] text-foreground">
            LIVE EVENT LOG
          </h2>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {events.length} entries
          </span>
        </div>
        <span className="flex items-center gap-2 text-[11px] font-medium text-primary">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden="true" />
          Streaming
        </span>
      </div>

      <ol
        role="log"
        aria-live="polite"
        className="flex h-72 flex-col overflow-y-auto text-xs [mask-image:linear-gradient(to_bottom,black_85%,transparent)] sm:text-[13px]"
      >
        {events.map((event) => {
          const level = levelStyles[event.level]
          return (
            <li
              key={event.id}
              className={cn(
                'flex flex-col gap-1.5 border-b border-surface-border/70 px-5 py-3 transition-colors animate-in fade-in slide-in-from-top-2 duration-500 last:border-b-0 hover:bg-secondary sm:flex-row sm:items-center sm:gap-4 sm:px-6',
                event.level === 'alert' && 'bg-alert/[0.05]',
              )}
            >
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', level.dot)} />
                <time className="shrink-0 font-mono tabular-nums text-muted-foreground">
                  {event.timestamp}
                </time>
                <span
                  className={cn(
                    'inline-flex w-14 shrink-0 justify-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.12em]',
                    level.badge,
                  )}
                >
                  {level.label}
                </span>
              </div>
              <p
                className={cn(
                  'text-pretty leading-relaxed',
                  event.level === 'alert' ? 'font-semibold text-alert-ink' : 'text-foreground',
                )}
              >
                {event.zone && <span className="text-muted-foreground">{event.zone} · </span>}
                {event.message}
              </p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
