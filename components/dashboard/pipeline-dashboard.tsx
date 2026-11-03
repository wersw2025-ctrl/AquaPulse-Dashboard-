'use client'

import { useEffect, useState } from 'react'
import {
  initialEvents,
  initialZones,
  type PipelineEvent,
  type Zone,
} from '@/lib/pipeline-data'
import { DashboardHeader } from './dashboard-header'
import { ZoneCard } from './zone-card'
import { EventLog } from './event-log'

const MAX_EVENTS = 50

function jitter(value: number, amount: number, min: number, max: number) {
  const next = value + (Math.random() - 0.5) * amount
  return Math.min(max, Math.max(min, next))
}

function formatTimestamp(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function PipelineDashboard() {
  const [zones, setZones] = useState<Zone[]>(initialZones)
  const [events, setEvents] = useState<PipelineEvent[]>(initialEvents)

  useEffect(() => {
    const telemetry = setInterval(() => {
      setZones((current) =>
        current.map((zone) => ({
          ...zone,
          vibrationHz:
            zone.status === 'leak'
              ? jitter(zone.vibrationHz, 4, 40, 58)
              : jitter(zone.vibrationHz, 1.5, 9, 18),
          batteryV: jitter(zone.batteryV, 0.01, 3.3, 4.1),
        })),
      )
    }, 2000)

    let counter = 0
    const log = setInterval(() => {
      counter += 1
      const now = formatTimestamp(new Date())
      setEvents((current) => {
        const leakZone = initialZones.find((z) => z.status === 'leak')
        const next: PipelineEvent =
          counter % 3 === 0 && leakZone
            ? {
                id: `live-${Date.now()}`,
                timestamp: now,
                level: 'alert',
                zone: `Zone ${leakZone.index}`,
                message: 'Leak persists — dispatch crew notified',
              }
            : {
                id: `live-${Date.now()}`,
                timestamp: now,
                level: 'info',
                message: 'Heartbeat received — 3/3 nodes reporting',
              }
        return [next, ...current].slice(0, MAX_EVENTS)
      })
    }, 6000)

    return () => {
      clearInterval(telemetry)
      clearInterval(log)
    }
  }, [])

  const alertCount = zones.filter((z) => z.status === 'leak').length

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:gap-8 lg:px-8">
      <DashboardHeader alertCount={alertCount} />

      <section aria-label="Pipeline zones" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {zones.map((zone) => (
          <ZoneCard key={zone.id} zone={zone} />
        ))}
      </section>

      <EventLog events={events} />
    </main>
  )
}
