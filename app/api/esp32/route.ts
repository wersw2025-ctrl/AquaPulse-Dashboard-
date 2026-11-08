import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jejXifxvgLlognjpynqc.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_U7pUJSL9uLKsCHgqcDi_3Q_ffDSTrOT'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const PUSHOVER_USER_KEY = 'u9x7yhbpjv64cxo4d6douac9kvuebk'
const PUSHOVER_API_TOKEN = 'azua6kre9hb6u8rw4x6a7ktyggid34'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ⏱️ TIMEOUT CONFIGURATION
const OFFLINE_THRESHOLD_SECONDS = 30 

async function sendMobilePushNotification(title: string, message: string, sound: string = 'siren') {
  if (PUSHOVER_USER_KEY === 'YOUR_PUSHOVER_USER_KEY') return

  try {
    await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: PUSHOVER_API_TOKEN,
        user: PUSHOVER_USER_KEY,
        title: title,
        message: message,
        sound: sound, 
        priority: 1,
        url: 'https://aqua-pulse-dashboard.vercel.app/'     
      })
    })
  } catch (err) {
    console.error('Pushover alert failure:', err)
  }
}

export async function POST(request: Request) {
  try {
    // 🔍 Step 1: Safely capture incoming data direct from Supabase Webhook body or query
    let webhookRecord: any = null
    try {
      const body = await request.json()
      // If triggered by a real Supabase Webhook, row data lives inside .record
      webhookRecord = body.record || body
    } catch {
      // Fallback
    }

    // 🔍 Step 2: Query the 2 most recent rows from the database to evaluate trends
    const { data: records, error } = await supabase
      .from('telemetry')
      .select('vibration, battery, id, created_at')
      .order('id', { ascending: false })
      .limit(2)

    if (error || !records || records.length === 0) {
      return new NextResponse('No telemetry records found', { status: 200 })
    }

    // ✅ FIXED ELEMENT EXTRACTIONS: Explicitly selecting index [0] and [1] to ensure data isn't undefined
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

      // 🚨 1. LEAK ALERT
      if (isCurrentLeak && !wasPreviousLeak) {
        await sendMobilePushNotification(
          '🚨 CRITICAL LEAK SUSPECTED',
          `Zone 1 Pipe Anomaly! Vibration levels spiking at ${currentVibration} Hz.`,
          'siren'
        )
      } 
      // ✅ 2. LEAK CLEAR
      else if (!isCurrentLeak && wasPreviousLeak) {
        await sendMobilePushNotification(
          '✅ ZONE 1 SAFE STATUS CLEAR',
          'Pipeline monitor metrics returned smoothly to an optimal baseline.',
          'bugle'
        )
      }

      // 🟢 3. POWERED ON
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

export async function GET() {
  try {
    const { data: records } = await supabase
      .from('telemetry')
      .select('created_at, id, vibration, battery')
      .order('id', { ascending: false })
      .limit(1)

    if (records && records.length > 0) {
      const latestRecord = records[0]
      const currentLogTime = latestRecord.created_at ? new Date(latestRecord.created_at).getTime() : Date.now()
      const timeSinceLastUpdateSeconds = (Date.now() - currentLogTime) / 1000

      if (timeSinceLastUpdateSeconds > OFFLINE_THRESHOLD_SECONDS) {
        // We look at Vercel memory logs dynamically
        const globalObj = global as any
        if (!globalObj.lastOfflineAlertId || globalObj.lastOfflineAlertId !== latestRecord.id) {
          await sendMobilePushNotification(
            '🔌 SYSTEM POWERED OFF',
            '🔴 Warning: Zone 1 Telemetry Offline. Sensor transmission dropped.',
            'falling'
          )
          globalObj.lastOfflineAlertId = latestRecord.id
        }
        return NextResponse.json({ status: 'offline', ...latestRecord })
      }
    }
    return NextResponse.json({ status: 'online', ...(records ? records[0] : {}) })
  } catch {
    return new NextResponse('Internal error', { status: 500 })
  }
}
