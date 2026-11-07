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
const FAST_POLL_INTERVAL_MS = 1000 
const MAX_EVENTS = 50

type APIResponsePacket = {
  vibration?: number
  battery?: number
  rowId?: number
  error?: string
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
  
  const lastRowIdRef = useRef<number | null>(null)
  const lastChangeTimeRef = useRef<number>(Date.now())
  const isOfflineRef = useRef<boolean>(false)

  // 🔔 Request Browser Notification Permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }, [])

  // 📣 Helper function to trigger a native desktop popup notification
  const sendDesktopNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '/favicon.ico', // Uses your app icon if available
      })
    }
  }

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
      if (inFlight) return
      inFlight = true
      
      try {
        const res = await fetch(`${LOCAL_ESP32_URL}?t=${Date.now()}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          cache: 'no-store'
        })

        const data = (await res.json()) as APIResponsePacket
        if (cancelled) return

        if (!res.ok || data.error) {
          throw new Error(data.error || 'Server error fetching telemetry')
        }

        const now = Date.now()

        if (data.rowId !== undefined && data.rowId !== lastRowIdRef.current) {
          lastRowIdRef.current = data.rowId
          lastChangeTimeRef.current = now
        }

        const secondsSinceLastUpdate = (now - lastChangeTimeRef.current) / 1000
        if (secondsSinceLastUpdate > 4) {
          throw new Error('ESP32 data stream is frozen (device offline)')
        }

        const transitions: PipelineEvent[] = []
        const wasOffline = isOfflineRef.current
        
        isOfflineRef.current = false
        if (lastErrorMessage.current || wasOffline) {
          lastErrorMessage.current = null
          transitions.push(createEvent({ level: 'info', message: 'Connection to ESP32 restored' }))
        }

        const nextZones = zonesRef.current.map((zone) => {
          if (zone.index === 1) {
            const vibrationValue = data.vibration ?? 0
            const batteryValue = data.battery ?? 0
            const status: ZoneStatus = vibrationValue > 5.0 ? 'leak' : 'safe'

            const prev = previousStatus.current[zone.id]
            if (prev !== status || wasOffline) {
              previousStatus.current[zone.id] = status
              
              if (!wasOffline) {
                transitions.push(
                  createEvent(
                    status === 'leak'
                      ? { level: 'alert', zone: `Zone ${zone.index}`, message: `🚨 LEAK DETECTED — ${zone.name} vibrating at ${vibrationValue} Hz` }
                      : { level: 'info', zone: `Zone ${zone.index}`, message: `✅ Status cleared — ${zone.name} reporting SAFE baseline` }
                  )
                )

                // 🚨 TRIGGER SYSTEM NOTIFICATION WINDOWS
                if (status === 'leak') {
                  sendDesktopNotification(
                    `🚨 CRITICAL PIPELINE BREAK`, 
                    `Warning: Critical leak suspected in Zone 1 (${zone.name})! Vibration anomaly: ${vibrationValue} Hz.`
                  )
                } else {
                  sendDesktopNotification(
                    `✅ Zone 1 Clear`, 
                    `Status updated: Zone 1 (${zone.name}) has returned to a safe baseline.`
                  )
                }
              }
            }

            return { ...zone, status, batteryV: batteryValue, vibrationHz: vibrationValue }
          }
          
          previousStatus.current[zone.id] = 'offline'
          return { 
            ...zone, 
            status: 'offline' as ZoneStatus, 
            vibrationHz: 0,
            batteryV: 0
          }
        })

        zonesRef.current = nextZones
        setZones(nextZones)
        pushEvents(transitions.reverse())
      } catch (error: any) {
        if (cancelled) return
        
        const wasOnline = !isOfflineRef.current
        isOfflineRef.current = true
        reportError(`Offline: ${error.message || 'Check ESP32'}`)
        
        // 🚨 CRITICAL NOTIFICATION: Trigger desktop system alert when hardware connection drops out
        if (wasOnline) {
          sendDesktopNotification(
            `⚠️ PIPELINE MONITOR OFFLINE`,
            `Alert: Critical telemetry loss! Connection to Zone 1 ESP32 sensor has been severed.`
          )
        }

        const offlineZones = zonesRef.current.map((zone) => {
          previousStatus.current[zone.id] = 'offline'
          return { 
            ...zone, 
            status: 'offline' as ZoneStatus, 
            vibrationHz: 0, 
            batteryV: 0 
          }
        })
        
        zonesRef.current = offlineZones
        setZones(offlineZones)
      } // Removed fill-in-finally/finally since handled implicitly cleanly
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
