import { TriangleAlert, Waves } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'

export function DashboardHeader({ alertCount }: { alertCount: number }) {
  return (
    <header className="surface flex flex-col gap-4 rounded-2xl px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-center gap-3.5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_var(--primary)]">
          <Waves className="size-5" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-balance text-sm font-bold tracking-[0.2em] text-foreground sm:text-base">
            PIPELINE MONITORING SYSTEM
          </h1>
          <p className="text-xs text-muted-foreground">
            Sector 7 <span className="text-foreground/25">/</span> Municipal Water Grid
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {alertCount > 0 && (
          <span
            role="alert"
            className="inline-flex items-center gap-2 rounded-full bg-alert px-3 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-primary-foreground shadow-[0_6px_16px_-6px_var(--alert)] animate-in fade-in zoom-in-95 duration-300"
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
          className="inline-flex items-center gap-2 rounded-full border border-safe/30 bg-safe/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-safe-ink"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-safe opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-safe" />
          </span>
          SYSTEM ONLINE
        </span>
        <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-surface-border sm:block" />
        <ThemeToggle />
      </div>
    </header>
  )
}
