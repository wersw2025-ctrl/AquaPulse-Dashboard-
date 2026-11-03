import { Waves } from 'lucide-react'

export function DashboardHeader({ alertCount }: { alertCount: number }) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-card">
          <Waves className="size-5 text-safe" aria-hidden="true" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-balance text-base font-semibold tracking-[0.2em] text-foreground sm:text-lg">
            PIPELINE MONITORING SYSTEM
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            Sector 7 · Municipal Water Grid
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {alertCount > 0 && (
          <span className="inline-flex items-center gap-2 rounded-full border border-alert/40 bg-alert/10 px-3 py-1.5 font-mono text-xs font-medium tracking-wider text-alert">
            {alertCount} ACTIVE {alertCount === 1 ? 'ALERT' : 'ALERTS'}
          </span>
        )}
        <span
          role="status"
          className="inline-flex items-center gap-2 rounded-full border border-safe/40 bg-safe/10 px-3 py-1.5 font-mono text-xs font-medium tracking-wider text-safe"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-safe opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-safe shadow-[0_0_8px_var(--safe)]" />
          </span>
          SYSTEM ONLINE
        </span>
      </div>
    </header>
  )
}
