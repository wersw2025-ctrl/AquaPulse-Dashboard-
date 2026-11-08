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

    await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })
  } catch (err) {
    console.error('Notification dispatch crash:', err)
  }
}

// 📡 CLOUD WEBHOOK HANDLER: Fires automatically when a new row arrives
export async function POST(request: Request) {
  try {
    const { data: records, error } = await supabase
      .from('telemetry')
      .select('vibration, battery, id, created_at')
      .order('id', { ascending: false })
      .limit(2)

    if (error || !records || records.length === 0) {
      return new NextResponse('Telemetry log pool empty', { status: 200 })
    }

    const latestRecord = records[0]
    const currentVibration = latestRecord.vibration ?? 0
    const isCurrentLeak = currentVibration > 5.0
    const currentLogTime = latestRecord.created_at ? new Date(latestRecord.created_at).getTime() : Date.now()

    // Fetch persistent database tracker states
    const { data: stateTrackers } = await supabase.from('alert_state').select('*')
    const leakState = stateTrackers?.find(s => s.id === 'leak')
    const powerState = stateTrackers?.find(s => s.id === 'power')

    if (records.length === 2) {
      const previousRecord = records[1]
      const previousVibration = previousRecord.vibration ?? 0
      const wasPreviousLeak = previousVibration > 5.0
      const previousLogTime = previousRecord.created_at ? new Date(previousRecord.created_at).getTime() : currentLogTime
      const intervalBetweenLogsSeconds = (currentLogTime - previousLogTime) / 1000

      // 🚨 1. LEAK ALERT (Fires when turning from safe to leaking)
      if (isCurrentLeak && (!wasPreviousLeak || leakState?.status_value !== 'leaking')) {
        await sendMobilePushNotification(
          '🚨 CRITICAL LEAK SUSPECTED',
          `Zone 1 Pipe Anomaly! Vibration levels spiking at ${currentVibration} Hz.`,
          'siren'
        )
        await supabase.from('alert_state').update({ status_value: 'leaking', last_notified_id: latestRecord.id }).eq('id', 'leak')
      } 
      // ✅ 2. LEAK SAFE STATUS CLEAR
      else if (!isCurrentLeak && (wasPreviousLeak || leakState?.status_value === 'leaking')) {
        await sendMobilePushNotification(
          '✅ ZONE 1 SAFE STATUS CLEAR',
          `Pipeline monitor metrics stabilized safely at ${currentVibration} Hz.`,
          'bugle'
        )
        await supabase.from('alert_state').update({ status_value: 'safe', last_notified_id: latestRecord.id }).eq('id', 'leak')
      }

      // 🟢 3. POWERED ON ALERT
      if (intervalBetweenLogsSeconds > OFFLINE_THRESHOLD_SECONDS || powerState?.status_value === 'offline') {
        await sendMobilePushNotification(
          '🔌 SYSTEM POWERED ON',
          '🟢 Zone 1 Telemetry Online: Connection established and system power verified.',
          'mechanical'
        )
        await supabase.from('alert_state').update({ status_value: 'online', last_notified_id: latestRecord.id }).eq('id', 'power')
      }
    }

    return new NextResponse(JSON.stringify({ success: true }), { status: 200 })
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 })
  }
}

// 💻 WEB DASHBOARD HANDLER: Provides the frontend stream interface
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

    // Read power state tracker from the database
    const { data: powerState } = await supabase.from('alert_state').select('status_value, last_notified_id').eq('id', 'power').single()

    if (isOffline) {
      // 🔴 4. POWERED OFF ALERTS (Triggers once when silence window crosses)
      if (powerState?.status_value !== 'offline' && powerState?.last_notified_id !== latestRecord.id) {
        await sendMobilePushNotification(
          '🔌 SYSTEM POWERED OFF',
          '🔴 Warning: Zone 1 Telemetry Offline. Sensor transmission dropped.',
          'falling'
        )
        // Store offline event lock markers inside the database rows
        await supabase.from('alert_state').update({ status_value: 'offline', last_notified_id: latestRecord.id }).eq('id', 'power')
      }
    }

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
