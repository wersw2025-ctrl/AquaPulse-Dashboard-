import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ✅ LOCKED ACTIVE DATABASE INSTANCE ROUTE
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
    // ✅ FIXED DATA LAYOUT FORMAT: Convert parameters to Form URL-Encoding for Pushover API compatibility
    const params = new URLSearchParams()
    params.append('token', PUSHOVER_API_TOKEN)
    params.append('user', PUSHOVER_USER_KEY)
    params.append('title', title)
    params.append('message', message)
    params.append('sound', sound)
    params.append('priority', '1')
    params.append('url', 'https://aqua-pulse-dashboard.vercel.app/')

    const res = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })
    
    console.log('Pushover Server Response Status:', res.status)
  } catch (err) {
    console.error('Pushover notification failure:', err)
  }
}

// 📡 CLOUD WEBHOOK HANDLER: Processes database updates when your laptop is completely turned off
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

    if (records.length === 2) {
      const previousRecord = records[1]
      const previousVibration = previousRecord.vibration ?? 0
      const wasPreviousLeak = previousVibration > 5.0
      const previousLogTime = previousRecord.created_at ? new Date(previousRecord.created_at).getTime() : currentLogTime
      const intervalBetweenLogsSeconds = (currentLogTime - previousLogTime) / 1000

      // 🚨 Leak Alert
      if (isCurrentLeak && !wasPreviousLeak) {
        await sendMobilePushNotification(
          '🚨 CRITICAL LEAK SUSPECTED',
          `Zone 1 Pipe Anomaly! Vibration levels spiking at ${currentVibration} Hz.`,
          'siren'
        )
      } 
      // ✅ Leak Clear
      else if (!isCurrentLeak && wasPreviousLeak) {
        await sendMobilePushNotification(
          '✅ ZONE 1 SAFE STATUS CLEAR',
          'Pipeline monitor metrics returned smoothly to an optimal baseline.',
          'bugle'
        )
      }

      // 🟢 Sensor Powered On
      if (intervalBetweenLogsSeconds > OFFLINE_THRESHOLD_SECONDS) {
        await sendMobilePushNotification(
          '🔌 SYSTEM POWERED ON',
          '🟢 Zone 1 Telemetry Online: Connection established and system power verified.',
          'mechanical'
        )
      }
    }

    return new NextResponse(JSON.stringify({ success: true }), { status: 200 })
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 })
  }
}

// 💻 WEB DASHBOARD HANDLER: Provides the real-time parameter streaming interface
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

    // 🔴 Sensor Powered Off
    if (isOffline) {
      const globalObj = global as any
      if (!globalObj.lastOfflineAlertId || globalObj.lastOfflineAlertId !== latestRecord.id) {
        await sendMobilePushNotification(
          '🔌 SYSTEM POWERED OFF',
          '🔴 Warning: Zone 1 Telemetry Offline. Sensor transmission dropped.',
          'falling'
        )
        globalObj.lastOfflineAlertId = latestRecord.id
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
