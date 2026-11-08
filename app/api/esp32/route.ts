import { NextResponse } from 'next/server'

const PUSHOVER_USER_KEY = 'u9x7yhbpjv64cxo4d6douac9kvuebk'
const PUSHOVER_API_TOKEN = 'azua6kre9hb6u8rw4x6a7ktyggid34'

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
        url: 'https://aqua-pulse-dashboard.vercel.app'     
      })
    })
  } catch (err) {
    console.error('Pushover alert failure:', err)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Supabase Webhooks pass the row data inside the 'record' property
    const newRecord = body.record
    if (!newRecord) return new NextResponse('No record found', { status: 400 })

    const currentVibration = newRecord.vibration ?? 0

    // 🚨 INSTANT LEAK DETECTION
    if (currentVibration > 5.0) {
      await sendMobilePushNotification(
        '🚨 CRITICAL LEAK SUSPECTED',
        `Zone 1 Pipe Anomaly! Vibration levels spiking at ${currentVibration} Hz.`,
        'siren'
      )
    }

    return new NextResponse(JSON.stringify({ success: true }), { status: 200 })
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 })
  }
}







import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jejXifxvgLlognjpynqc.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_U7pUJSL9uLKsCHgqcDi_3Q_ffDSTrOT'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const PUSHOVER_USER_KEY = 'u9x7yhbpjv64cxo4d6douac9kvuebk'
const PUSHOVER_API_TOKEN = 'azua6kre9hb6u8rw4x6a7ktyggid34'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ⏱️ TIMEOUT CONFIGURATION: If the gap between sensor entries is wider than this, it means it woke up from being off.
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
    // 🔍 Step 1: Grab the 2 most recent rows from the database to evaluate state history
    const { data: records, error } = await supabase
      .from('telemetry')
      .select('vibration, battery, id, created_at')
      .order('id', { ascending: false })
      .limit(2)

    if (error || !records || records.length === 0) {
      return new NextResponse('No telemetry records found', { status: 200 })
    }

    const latestRecord = records[0]
    const currentVibration = latestRecord.vibration ?? 0
    const isCurrentLeak = currentVibration > 5.0

    // Safely extract the time the row was inserted
    const currentLogTime = latestRecord.created_at ? new Date(latestRecord.created_at).getTime() : Date.now()

    if (records.length === 2) {
      const previousRecord = records[1]
      const previousVibration = previousRecord.vibration ?? 0
      const wasPreviousLeak = previousVibration > 5.0

      const previousLogTime = previousRecord.created_at ? new Date(previousRecord.created_at).getTime() : currentLogTime
      const intervalBetweenLogsSeconds = (currentLogTime - previousLogTime) / 1000

      // 🚨 1. INSTANT LEAK ALERT (Jumped from safe to leaking)
      if (isCurrentLeak && !wasPreviousLeak) {
        await sendMobilePushNotification(
          '🚨 CRITICAL LEAK SUSPECTED',
          `Zone 1 Pipe Anomaly! Vibration levels spiking at ${currentVibration} Hz.`,
          'siren'
        )
      } 
      // ✅ 2. LEAK BECOMES STABLE / CLEAR (Dropped from leaking back to safe)
      else if (!isCurrentLeak && wasPreviousLeak) {
        await sendMobilePushNotification(
          '✅ ZONE 1 SAFE STATUS CLEAR',
          'Pipeline monitor metrics returned smoothly to an optimal baseline.',
          'bugle'
        )
      }

      // 🟢 3. TURNED ON / POWERED ON ALERT
      // If the time gap between the previous record and this new record is huge, the device was off!
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

// 🔴 4. TURNED OFF / POWERED OFF DETECTOR
// Since an offline device can't send rows, we keep a fast GET route active so the dashboard's loop checks the time age.
export async function GET() {
  try {
    const { data: records } = await supabase
      .from('telemetry')
      .select('created_at, id')
      .order('id', { ascending: false })
      .limit(1)

    if (records && records.length > 0) {
      const latestRecord = records[0]
      const currentLogTime = latestRecord.created_at ? new Date(latestRecord.created_at).getTime() : Date.now()
      const timeSinceLastUpdateSeconds = (Date.now() - currentLogTime) / 1000

      if (timeSinceLastUpdateSeconds > OFFLINE_THRESHOLD_SECONDS) {
        const sessionLockKey = `offline_alert_fired_${latestRecord.id}`
        if (!(global as any)[sessionLockKey]) {
          await sendMobilePushNotification(
            '🔌 SYSTEM POWERED OFF',
            '🔴 Warning: Zone 1 Telemetry Offline. Sensor transmission dropped.',
            'falling'
          )
          ;(global as any)[sessionLockKey] = true
        }
        return NextResponse.json({ status: 'offline' })
      }
    }
    return NextResponse.json({ status: 'online' })
  } catch {
    return new NextResponse('Internal error', { status: 500 })
  }
}
