import { TriangleAlert, Waves } from 'lucide-react'

export function DashboardHeader({ alertCount }: { alertCount: number }) {
  return (
    <header className="glass flex flex-col gap-4 rounded-2xl px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-center gap-3.5">
        <div className="relative flex size-10 items-center justify-center rounded-xl border border-safe/25 bg-safe/[0.08]">
          <Waves className="size-5 text-safe" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-balance text-sm font-semibold tracking-[0.22em] text-foreground sm:text-base">
            PIPELINE MONITORING SYSTEM
          </h1>
          <p className="text-xs text-muted-foreground">
            Sector 7 <span className="text-foreground/20">/</span> Municipal Water Grid
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {alertCount > 0 && (
          <span
            role="alert"
            className="inline-flex items-center gap-2 rounded-full border border-alert/40 bg-alert/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-alert shadow-[0_0_24px_-8px_var(--alert)] animate-in fade-in zoom-in-95 duration-300"
          >
            <TriangleAlert className="size-3.5" aria-hidden="true" />
            <span key={alertCount} className="inline-block animate-value-in font-mono">
              {alertCount}
            </span>
            ACTIVE {alertCount === 1 ? 'ALERT' : 'ALERTS'}
          </span>
        )}
        <span
          role="status"
          className="inline-flex items-center gap-2 rounded-full border border-safe/30 bg-safe/[0.08] px-3 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-safe"
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
