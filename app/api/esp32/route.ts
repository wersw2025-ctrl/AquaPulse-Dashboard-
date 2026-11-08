import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ✅ CONFIGURATION DEFINITIONS
const SUPABASE_URL = 'https://jejXifxvgLlognjpynqc.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_U7pUJSL9uLKsCHgqcDi_3Q_ffDSTrOT'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const PUSHOVER_USER_KEY = 'u9x7yhbpjv64cxo4d6douac9kvuebk'
const PUSHOVER_API_TOKEN = 'azua6kre9hb6u8rw4x6a7ktyggid34'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const OFFLINE_THRESHOLD_SECONDS = 30 

async function sendMobilePushNotification(title: string, message: string, sound: string = 'siren') {
  if (PUSHOVER_USER_KEY === 'YOUR_PUSHOVER_USER_KEY') return

  try {
    const params = new URLSearchParams()
    params.append('token', PUSHOVER_API_TOKEN)
    params.append('user', PUSHOVER_USER_KEY)
    params.append('title', title)
    params.append('message', message)
    params.append('sound', sound)
    params.append('priority', '1')
    params.append('url', 'https://aqua-pulse-dashboard.vercel.app/')

    // Direct synchronous fetch out to the main notification gateway
    await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })
  } catch (err) {
    console.error('Notification dispatch crash:', err)
  }
}

// 📡 CLOUD WEBHOOK HANDLER: Fires instantly on every single database entry
export async function POST(request: Request) {
  try {
    // Read raw data coming straight from your database insert event
    let body: any = {}
    try {
      body = await request.json()
    } catch (e) {}

    // Pull the single absolute newest row directly to remove delay calculations
    const { data: records, error } = await supabase
      .from('telemetry')
      .select('vibration, battery, id')
      .order('id', { ascending: false })
      .limit(1)

    if (error || !records || records.length === 0) {
      return new NextResponse('Empty registry', { status: 200 })
    }

    const latestRecord = records[0]
    const currentVibration = latestRecord.vibration ?? 0

    // 🚨 ABSOLUTE DIRECT TRIGGER: If it is over 5, send the alert instantly!
    if (currentVibration > 5.0) {
      await sendMobilePushNotification(
        '🚨 CRITICAL LEAK SUSPECTED',
        `Zone 1 Pipe Anomaly! Vibration levels spiking at ${currentVibration} Hz.`,
        'siren'
          )
    } else {
      // ✅ ABSOLUTE DIRECT TRIGGER: If it is normal, send the safe status clear instantly!
      await sendMobilePushNotification(
        '✅ ZONE 1 SAFE STATUS CLEAR',
        `Pipeline monitor metrics stabilized safely at ${currentVibration} Hz.`,
        'bugle'
      )
    }

    return new NextResponse(JSON.stringify({ success: true }), { status: 200 })
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 })
  }
}

// 💻 WEB DASHBOARD HANDLER: Handles browser requests and watches for drops in power states
export async function GET() {
  try {
    const { data: records, error } = await supabase
      .from('telemetry')
      .select('created_at, id, vibration, battery')
      .order('id', { ascending: false })
      .limit(1)

    if (error || !records || records.length === 0) {
      throw new Error('No telemetry data available')
    }

    const latestRecord = records[0]
    const currentLogTime = latestRecord.created_at ? new Date(latestRecord.created_at).getTime() : Date.now()
    const timeSinceLastUpdateSeconds = (Date.now() - currentLogTime) / 1000
    const isOffline = timeSinceLastUpdateSeconds > OFFLINE_THRESHOLD_SECONDS

    if (isOffline) {
      // 🔴 POWERED OFF ALERTS
      await sendMobilePushNotification(
        '🔌 SYSTEM POWERED OFF',
        '🔴 Warning: Zone 1 Telemetry Offline. Sensor transmission dropped.',
        'falling'
      )
    } else {
      // 🟢 POWERED ON ALERTS
      const globalObj = global as any
      if (globalObj.wasLastKnownOffline) {
        await sendMobilePushNotification(
          '🔌 SYSTEM POWERED ON',
          '🟢 Zone 1 Telemetry Online: Connection established and system power verified.',
          'mechanical'
        )
        globalObj.wasLastKnownOffline = false
      }
    }

    // Save tracking state to memory
    ;(global as any).wasLastKnownOffline = isOffline

    return new NextResponse(
      JSON.stringify({
        vibration: latestRecord.vibration,
        battery: latestRecord.battery,
        rowId: latestRecord.id,
        alertFired: (latestRecord.vibration ?? 0) > 5.0,
        status: isOffline ? 'offline' : 'online'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
      }
    )
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
