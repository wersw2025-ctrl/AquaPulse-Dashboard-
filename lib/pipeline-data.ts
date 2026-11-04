export type ZoneStatus = 'safe' | 'leak'

export type Zone = {
  id: string
  index: number
  name: string
  sensorId: string
  status: ZoneStatus
  vibrationHz: number
  batteryV: number
}

export type EventLevel = 'boot' | 'info' | 'alert'

export type PipelineEvent = {
  id: string
  timestamp: string
  level: EventLevel
  zone?: string
  message: string
}

export const VIBRATION_THRESHOLD_HZ = 35
export const BATTERY_MIN_V = 3.0
export const BATTERY_MAX_V = 4.2

export const initialZones: Zone[] = [
  {
    id: 'zone-1',
    index: 1,
    name: 'Inlet',
    sensorId: 'PX-0141',
    status: 'safe',
    vibrationHz: 12.4,
    batteryV: 3.92,
  },
  {
    id: 'zone-2',
    index: 2,
    name: 'Main Line',
    sensorId: 'PX-0217',
    status: 'safe',
    vibrationHz: 14.8,
    batteryV: 3.78,
  },
  {
    id: 'zone-3',
    index: 3,
    name: 'Valve Junction',
    sensorId: 'PX-0398',
    status: 'safe',
    vibrationHz: 13.1,
    batteryV: 3.41,
  },
]

export const initialEvents: PipelineEvent[] = [
  {
    id: 'e-mock-alert',
    timestamp: '2026-03-11 06:05:00',
    level: 'alert',
    message: 'Mock Zone 1 Moisture Spike Detected',
  },
  {
    id: 'e-5',
    timestamp: '2026-03-11 06:02:10',
    level: 'info',
    message: 'Telemetry sync complete — 3/3 nodes reporting',
  },
  {
    id: 'e-4',
    timestamp: '2026-03-11 06:00:09',
    level: 'boot',
    zone: 'Zone 3',
    message: 'Sensor node PX-0398 online',
  },
  {
    id: 'e-3',
    timestamp: '2026-03-11 06:00:07',
    level: 'boot',
    zone: 'Zone 2',
    message: 'Sensor node PX-0217 online',
  },
  {
    id: 'e-2',
    timestamp: '2026-03-11 06:00:05',
    level: 'boot',
    zone: 'Zone 1',
    message: 'Sensor node PX-0141 online',
  },
  {
    id: 'e-1',
    timestamp: '2026-03-11 06:00:01',
    level: 'boot',
    message: 'Gateway boot sequence complete — firmware v2.4.1',
  },
]
