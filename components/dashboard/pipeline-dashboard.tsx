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

const LOCAL_ESP32_URL = '/api/esp32' 
const FAST_POLL_INTERVAL_MS = 200 
const MAX_EVENTS = 50
const DISCONNECT_TIMEOUT_MS = 3000 

type ESP32DataPacket = {
  vibration: number
  battery: number
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

export function PipelineDashboard() {
  const [zones, setZones] = useState<Zone[]>(initialZones)
  const [events, setEvents] = useState<PipelineEvent[]>(initialEvents)
  const previousStatus = useRef<Record<string, ZoneStatus>>(
    Object.fromEntries(initialZones.map((z) => [z.id, z.status])),
  )
  const lastErrorMessage = useRef<string | null>(null)
  const zonesRef = useRef<Zone[]>(initialZones)
  const lastSuccessRef = useRef<number>(Date.now())

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

    let cancelled = false
    let inFlight = false

    const pollLocalESP32 = async () => {
      // ⏱️ Timeout Check
      const timeSinceLastSuccess = Date.now() - lastSuccessRef.current
      if (timeSinceLastSuccess > DISCONNECT_TIMEOUT_MS) {
        const offlineTransitions: PipelineEvent[] = []
        
        const offlineZones = zonesRef.current.map((zone) => {
          const prev = previousStatus.current[zone.id]
          if (prev !== 'offline') {
            previousStatus.current[zone.id] = 'offline'
            offlineTransitions.push(
              createEvent({
                level: 'alert',
                zone: `Zone ${zone.index}`,
                message: `⚠️ Connection Lost — ${zone.name} is OFFLINE`,
              })
            )
          }

          return {
            ...zone,
            status: 'offline' as ZoneStatus,
            vibrationHz: 0,
          }
        })

        if (!cancelled && offlineTransitions.length > 0) {
          zonesRef.current = offlineZones
          setZones(offlineZones)
          pushEvents(offlineTransitions.reverse())
        }
      }

      if (inFlight) return
      inFlight = true
      
      try {
        const res = await fetch(LOCAL_ESP32_URL, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': 'application/json'
          },
          cache: 'no-store'
        })

        if (!res.ok) {
          throw new Error(`ESP32 Local Hub Unreachable (HTTP ${res.status})`)
        }

        const data = (await res.json()) as ESP32DataPacket
        if (cancelled) return

        // Reset the tracker timestamp since a real connection succeeded
        lastSuccessRef.current = Date.now()

        if (lastErrorMessage.current) {
          lastErrorMessage.current = null
          pushEvents([createEvent({ level: 'info', message: 'Connection to ESP32 restored' })])
        }

        const transitions: PipelineEvent[] = []

        const nextZones = zonesRef.current.map((zone) => {
          if (zone.index === 1) {
            const vibrationValue = data.vibration ?? 0
            const batteryValue = data.battery ?? 0
            const status: ZoneStatus = vibrationValue > 5.0 ? 'leak' : 'safe'

            const prev = previousStatus.current[zone.id]
            if (prev !== status) {
              previousStatus.current[zone.id] = status
              transitions.push(
                createEvent(
                  status === 'leak'
                    ? {
                        level: 'alert',
                        zone: `Zone ${zone.index}`,
                        message: `🚨 LEAK DETECTED — ${zone.name} vibrating at ${vibrationValue} Hz`,
                      }
                    : {
                        level: 'info',
                        zone: `Zone ${zone.index}`,
                        message: `✅ Status cleared — ${zone.name} reporting SAFE baseline`,
                      },
                ),
              )
            }

            return {
              ...zone,
              status,
              batteryV: batteryValue,
              vibrationHz: vibrationValue,
            }
          }
          
          // ✅ FIX: Instantly recover Zone 2 & 3 back to safe when the network stream resumes!
          if (previousStatus.current[zone.id] === 'offline') {
            previousStatus.current[zone.id] = 'safe'
            return { ...zone, status: 'safe' as ZoneStatus, vibrationHz: zone.index === 2 ? 14.8 : 13.1 }
          }
          
          return zone
        })

        zonesRef.current = nextZones
        setZones(nextZones)
        pushEvents(transitions.reverse())
      } catch (error: any) {
        if (cancelled) return
        reportError(`Connection Error: ${error.message || 'Check ESP32 Connection'}`)
      } finally {
        // ✅ CRITICAL FIX: Always release the flight lock so it keeps polling!
        inFlight = false
      }
    }

    pollLocalESP32()
    const interval = setInterval(pollLocalESP32, FAST_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const alertCount = zones.filter((z) => z.status === 'leak').length

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8 lg:gap-6 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-3xl" />
        <div
          className={`absolute -bottom-40 right-0 h-96 w-[36rem] rounded-full blur-3xl transition-colors duration-1000 ${
            alertCount > 0 ? 'bg-alert/[0.08]' : 'bg-safe/[0.07]'
          }`}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--grid-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-line)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
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
