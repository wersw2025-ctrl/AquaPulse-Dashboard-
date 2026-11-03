import { Activity, BatteryMedium } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  BATTERY_MAX_V,
  BATTERY_MIN_V,
  VIBRATION_THRESHOLD_HZ,
  type Zone,
} from '@/lib/pipeline-data'
import { StatusRing } from './status-ring'

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value))
}

export function ZoneCard({ zone }: { zone: Zone }) {
  const isLeak = zone.status === 'leak'
  const vibrationPct = clampPercent((zone.vibrationHz / 60) * 100)
  const thresholdPct = (VIBRATION_THRESHOLD_HZ / 60) * 100
  const batteryPct = clampPercent(
    ((zone.batteryV - BATTERY_MIN_V) / (BATTERY_MAX_V - BATTERY_MIN_V)) * 100,
  )

  return (
    <article
      aria-labelledby={`${zone.id}-title`}
      className={cn(
        'flex flex-col gap-6 rounded-2xl border bg-card p-5 transition-colors sm:p-6',
        isLeak ? 'border-alert/40 shadow-[0_0_40px_-12px_var(--alert)]' : 'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground">
            ZONE {String(zone.index).padStart(2, '0')}
          </span>
          <h2 id={`${zone.id}-title`} className="text-lg font-semibold text-foreground">
            {zone.name}
          </h2>
        </div>
        <span className="rounded-md border border-border bg-secondary px-2 py-1 font-mono text-xs text-muted-foreground">
          {zone.sensorId}
        </span>
      </div>

      <div className="flex justify-center py-2">
        <StatusRing status={zone.status} />
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3 rounded-xl bg-secondary p-3">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Activity className="size-3.5" aria-hidden="true" />
            Vibration Level
          </dt>
          <dd className="flex flex-col gap-2">
            <span className="font-mono text-xl font-semibold tabular-nums text-foreground">
              {zone.vibrationHz.toFixed(1)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">Hz</span>
            </span>
            <span className="relative h-1 w-full overflow-hidden rounded-full bg-muted-foreground/20">
              <span
                className={cn(
                  'absolute inset-y-0 left-0 rounded-full transition-[width] duration-700',
                  isLeak ? 'bg-alert' : 'bg-safe',
                )}
                style={{ width: `${vibrationPct}%` }}
              />
              <span
                aria-hidden="true"
                className="absolute inset-y-0 w-px bg-foreground/60"
                style={{ left: `${thresholdPct}%` }}
              />
            </span>
          </dd>
        </div>

        <div className="flex flex-col gap-3 rounded-xl bg-secondary p-3">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BatteryMedium className="size-3.5" aria-hidden="true" />
            Battery Voltage
          </dt>
          <dd className="flex flex-col gap-2">
            <span className="font-mono text-xl font-semibold tabular-nums text-foreground">
              {zone.batteryV.toFixed(2)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">V</span>
            </span>
            <span className="relative h-1 w-full overflow-hidden rounded-full bg-muted-foreground/20">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-foreground/70 transition-[width] duration-700"
                style={{ width: `${batteryPct}%` }}
              />
            </span>
          </dd>
        </div>
      </dl>
    </article>
  )
}
