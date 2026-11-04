import type { ReactNode } from 'react'
import { Activity, BatteryMedium, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  BATTERY_MAX_V,
  BATTERY_MIN_V,
  VIBRATION_THRESHOLD_HZ,
  type Zone,
} from '@/lib/pipeline-data'
import { StatusRing } from './status-ring'

const VIBRATION_SCALE_HZ = 60
const BATTERY_SEGMENTS = 10

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value))
}

function MetricTile({
  icon,
  label,
  value,
  unit,
  children,
}: {
  icon: ReactNode
  label: string
  value: string
  unit: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-secondary p-3 transition-colors duration-300 hover:bg-accent">
      <dt className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-card text-primary shadow-sm dark:bg-primary/15 dark:shadow-none">
          {icon}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
      </dt>
      <dd className="flex flex-col gap-2.5">
        <span className="flex items-baseline gap-1">
          <span
            key={value}
            className="inline-block animate-value-in font-mono text-2xl font-semibold tracking-tight tabular-nums text-foreground"
          >
            {value}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">{unit}</span>
        </span>
        {children}
      </dd>
    </div>
  )
}

export function ZoneCard({ zone }: { zone: Zone }) {
  const isLeak = zone.status === 'leak'
  const vibrationPct = clampPercent((zone.vibrationHz / VIBRATION_SCALE_HZ) * 100)
  const thresholdPct = (VIBRATION_THRESHOLD_HZ / VIBRATION_SCALE_HZ) * 100
  const batteryPct = clampPercent(
    ((zone.batteryV - BATTERY_MIN_V) / (BATTERY_MAX_V - BATTERY_MIN_V)) * 100,
  )
  const litSegments = Math.round((batteryPct / 100) * BATTERY_SEGMENTS)
  const batteryLow = batteryPct < 25

  return (
    <article
      aria-labelledby={`${zone.id}-title`}
      className={cn(
        'surface group relative flex flex-col gap-5 overflow-hidden rounded-2xl p-5 transition-all duration-500 ease-out hover:-translate-y-0.5 hover:shadow-lg sm:p-6',
        isLeak && 'border-alert/50 shadow-[0_12px_32px_-12px_color-mix(in_oklch,var(--alert)_40%,transparent)]',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-1 transition-colors duration-700',
          isLeak ? 'bg-alert' : 'bg-gradient-to-r from-primary to-safe',
        )}
      />

      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            Zone {String(zone.index).padStart(2, '0')}
          </span>
          <h2 id={`${zone.id}-title`} className="text-lg font-semibold tracking-tight text-foreground">
            {zone.name}
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-secondary px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
          <Radio className="size-3" aria-hidden="true" />
          {zone.sensorId}
        </span>
      </header>

      <div className="flex justify-center py-1">
        <StatusRing status={zone.status} />
      </div>

      <dl className="grid grid-cols-2 gap-2.5">
        <MetricTile
          icon={<Activity className="size-3.5" aria-hidden="true" />}
          label="Vibration"
          value={zone.vibrationHz.toFixed(1)}
          unit="Hz"
        >
          <span
            className="relative h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.08]"
            role="presentation"
          >
            <span
              className={cn(
                'absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-700 ease-out',
                isLeak ? 'bg-alert' : 'bg-primary',
              )}
              style={{ width: `${vibrationPct}%` }}
            />
            <span
              aria-hidden="true"
              className="absolute inset-y-0 w-0.5 bg-foreground/40"
              style={{ left: `${thresholdPct}%` }}
            />
          </span>
        </MetricTile>

        <MetricTile
          icon={<BatteryMedium className="size-3.5" aria-hidden="true" />}
          label="Battery"
          value={zone.batteryV.toFixed(2)}
          unit="V"
        >
          <span className="flex h-1.5 w-full gap-0.5" role="presentation">
            {Array.from({ length: BATTERY_SEGMENTS }, (_, i) => (
              <span
                key={i}
                className={cn(
                  'h-full flex-1 rounded-full transition-colors duration-500',
                  i < litSegments
                    ? batteryLow
                      ? 'bg-alert'
                      : 'bg-safe'
                    : 'bg-foreground/[0.08]',
                )}
                style={{ transitionDelay: `${i * 30}ms` }}
              />
            ))}
          </span>
        </MetricTile>
      </dl>

      <footer className="flex items-center justify-between border-t border-surface-border pt-4 text-[11px] text-muted-foreground">
        <span className="font-mono">feed · zone-{zone.index}-leak</span>
        <span className="flex items-center gap-1.5 font-medium">
          <span
            aria-hidden="true"
            className={cn('size-1.5 rounded-full', isLeak ? 'animate-pulse bg-alert' : 'bg-safe')}
          />
          Live
        </span>
      </footer>
    </article>
  )
}
