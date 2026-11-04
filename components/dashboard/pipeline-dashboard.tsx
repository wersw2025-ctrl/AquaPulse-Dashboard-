'use client'

import { useEffect, useRef, useState } from 'react'
import {
  initialEvents,
  initialZones,
  type PipelineEvent,
  type Zone,
  type ZoneStatus,
} from '@/lib/pipeline-data'
import { DashboardHeader } from './dashboard-header'
import { ZoneCard } from './zone-card'
import { EventLog } from './event-log'

const AIO_USERNAME = "Dani_tonga";
const AIO_KEY = "aio_rnJg328EyVoH23MhQfS2vnyuhJyO";

const POLL_INTERVAL_MS = 4000
const MAX_EVENTS = 50
const AIO_FEEDS_URL = `https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds`

type AdafruitFeed = {
  key: string
  last_value: string | null
}

function formatTimestamp(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function createEvent(event: Omit<PipelineEvent, 'id' | 'timestamp'>): PipelineEvent {
  return {
    ...event,
    id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: formatTimestamp(new Date()),
  }
}

function parseNumber(value: string | null | undefined) {
  if (value == null) return undefined
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function PipelineDashboard() {
  const [zones, setZones] = useState<Zone[]>(initialZones)
  const [events, setEvents] = useState<PipelineEvent[]>(initialEvents)
  const previousStatus = useRef<Record<string, ZoneStatus>>(
    Object.fromEntries(initialZones.map((z) => [z.id, z.status])),
  )
  const lastErrorMessage = useRef<string | null>(null)
  const zonesRef = useRef<Zone[]>(initialZones)

  useEffect(() => {
    const pushEvents = (newEvents: PipelineEvent[]) => {
      if (newEvents.length === 0) return
      setEvents((current) => [...newEvents, ...current].slice(0, MAX_EVENTS))
    }

    const reportError = (message: string) => {
      if (lastErrorMessage.current === message) return
      lastErrorMessage.current = message
      pushEvents([createEvent({ level: 'alert', message })])
    }

    if (AIO_KEY === 'PASTE_YOUR_ADAFRUIT_IO_KEY_HERE') {
      reportError('Adafruit IO key not configured — paste your AIO Key to go live')
      return
    }

    let cancelled = false
    let inFlight = false

    const poll = async () => {
      if (inFlight) return
      inFlight = true
      try {
        // A single /feeds request returns every feed's last_value, which keeps
        // polling well under the free-tier rate limit (30 requests/min).
        const res = await fetch(AIO_FEEDS_URL, {
          headers: { 'X-AIO-Key': AIO_KEY },
          cache: 'no-store',
        })
        if (!res.ok) {
          throw new Error(
            res.status === 401 || res.status === 403
              ? 'Adafruit IO rejected credentials — check username and AIO Key'
              : res.status === 429
                ? 'Adafruit IO rate limit reached — retrying'
                : `Adafruit IO request failed (HTTP ${res.status})`,
          )
        }

        const feeds = (await res.json()) as AdafruitFeed[]
        if (cancelled) return

        const feedValues = new Map(feeds.map((f) => [f.key, f.last_value]))

        if (lastErrorMessage.current) {
          lastErrorMessage.current = null
          pushEvents([createEvent({ level: 'info', message: 'Adafruit IO connection restored' })])
        }

        const transitions: PipelineEvent[] = []

        const nextZones = zonesRef.current.map((zone) => {
            const prefix = `zone-${zone.index}`
            const leakValue = feedValues.get(`${prefix}-leak`)
            const battery = parseNumber(feedValues.get(`${prefix}-battery`))
            const vibration = parseNumber(feedValues.get(`${prefix}-vibration`))

            const status: ZoneStatus =
              leakValue == null
                ? zone.status
                : leakValue.trim() === '1'
                  ? 'leak'
                  : 'safe'

            const prev = previousStatus.current[zone.id]
            if (prev !== status) {
              previousStatus.current[zone.id] = status
              transitions.push(
                createEvent(
                  status === 'leak'
                    ? {
                        level: 'alert',
                        zone: `Zone ${zone.index}`,
                        message: `LEAK DETECTED — ${zone.name} (${zone.sensorId})`,
                      }
                    : {
                        level: 'info',
                        zone: `Zone ${zone.index}`,
                        message: `Status cleared — ${zone.name} reporting SAFE`,
                      },
                ),
              )
            }

            return {
              ...zone,
              status,
              batteryV: battery ?? zone.batteryV,
              vibrationHz: vibration ?? zone.vibrationHz,
            }
          })

        zonesRef.current = nextZones
        setZones(nextZones)
        pushEvents(transitions.reverse())
      } catch (error) {
        if (cancelled) return
        reportError(
          error instanceof Error && error.message.startsWith('Adafruit')
            ? error.message
            : 'Unable to reach Adafruit IO — check network connection',
        )
      } finally {
        inFlight = false
      }
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const alertCount = zones.filter((z) => z.status === 'leak').length

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8 lg:gap-6 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-safe/[0.06] blur-3xl" />
        <div
          className={`absolute -bottom-40 right-0 h-96 w-[36rem] rounded-full blur-3xl transition-colors duration-1000 ${
            alertCount > 0 ? 'bg-alert/[0.08]' : 'bg-sky-500/[0.05]'
          }`}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(1_0_0/3%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/3%)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      </div>

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
