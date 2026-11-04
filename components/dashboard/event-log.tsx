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
    dot: 'rotate-45 rounded-[1px] bg-rose-600 shadow-[0_0_0_3px_rgb(225_29_72/0.12)] dark:bg-red-400 dark:shadow-[0_0_8px_rgb(248_113_113/0.7)]',
    badge:
      'bg-white/70 text-rose-800 ring-1 ring-inset ring-rose-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30',
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
          const isAlert = event.level === 'alert'
          return (
            <li
              key={event.id}
              className={cn(
                'flex flex-col gap-1.5 border-b border-surface-border/70 px-5 py-3 transition-colors animate-in fade-in slide-in-from-top-2 duration-500 last:border-b-0 sm:flex-row sm:items-center sm:gap-4 sm:px-6',
                isAlert
                  ? 'border-y border-rose-100 bg-rose-50/70 hover:bg-rose-50 dark:border-red-900/50 dark:bg-red-950/30 dark:hover:bg-red-950/40'
                  : 'hover:bg-secondary',
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn('size-1.5 shrink-0', isAlert ? level.dot : cn('rounded-full', level.dot))}
                />
                <time
                  className={cn(
                    'shrink-0 font-mono tabular-nums',
                    isAlert
                      ? 'font-medium text-rose-700/80 dark:text-red-300 dark:[text-shadow:0_0_10px_rgb(248_113_113/0.45)]'
                      : 'text-muted-foreground',
                  )}
                >
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
                  isAlert ? 'font-medium text-rose-950 dark:text-white' : 'text-foreground',
                )}
              >
                {event.zone && (
                  <span
                    className={cn(
                      isAlert ? 'text-rose-900/60 dark:text-red-200/60' : 'text-muted-foreground',
                    )}
                  >
                    {event.zone} ·{' '}
                  </span>
                )}
                {event.message}
              </p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
