import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jejXifxvgLlognjpynqc.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_U7pUJSL9uLKsCHgqcDi_3Q_ffDSTrOT'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const PUSHOVER_USER_KEY = 'u9x7yhbpjv64cxo4d6douac9kvuebk'
const PUSHOVER_API_TOKEN = 'azua6kre9hb6u8rw4x6a7ktyggid34'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ⏱️ TIMEOUT CONFIGURATION: Defines how many seconds of silence means "Offline"
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
        // 🔗 URL REDIRECT: Tapping your mobile notification opens your web panel dashboard link directly
        url: 'https://your-actual-deployed-dashboard-link-here.com'     
      })
    })
  } catch (err) {
    console.error('Failed to dispatch background mobile push alert:', err)
  }
}

export async function GET() {
  try {
    // 🔍 Fetch the 2 most recent rows including the newly added timestamp column
    const { data: records, error } = await supabase
      .from('telemetry')
      .select('vibration, battery, id, created_at')
      .order('id', { ascending: false })
      .limit(2)

    if (error || !records || records.length === 0) {
      throw new Error(error?.message || 'No telemetry records found')
    }

    const latestRecord = records[0]
    const currentVibration = latestRecord.vibration ?? 0
    const isCurrentLeak = currentVibration > 5.0
    
    // Parse timestamps safely (Fallback to current system clock if database value is null)
    const currentLogTime = latestRecord.created_at ? new Date(latestRecord.created_at).getTime() : Date.now()
    const timeSinceLastUpdateSeconds = (Date.now() - currentLogTime) / 1000

    let deviceStatus = 'online'
    let shouldNotifyLeak = false
    let shouldNotifyStatusChange = false
    let statusMessage = ''

    if (records.length === 2) {
      const previousRecord = records[1]
      const previousVibration = previousRecord.vibration ?? 0
      const wasPreviousLeak = previousVibration > 5.0
      
      const previousLogTime = previousRecord.created_at ? new Date(previousRecord.created_at).getTime() : currentLogTime
      const intervalBetweenLogsSeconds = (currentLogTime - previousLogTime) / 1000

      // 🚨 1. LEAK DETECTION (Anti-spam rate limit logic)
      if (isCurrentLeak && !wasPreviousLeak) {
        shouldNotifyLeak = true
      }

      // 🟢 2. POWERED ON DETECTION
      // If the interval between the last two logs was huge, it means the device was powered down and just woke up
      if (intervalBetweenLogsSeconds > OFFLINE_THRESHOLD_SECONDS) {
        shouldNotifyStatusChange = true
        statusMessage = '🟢 Zone 1 Telemetry Online: Connection established and system power verified.'
      }
    } else {
      if (isCurrentLeak) shouldNotifyLeak = true
    }

    // 🔴 3. POWERED OFF DETECTION
    // If the browser checks the page and no data has arrived within our window limit, mark it dead
    if (timeSinceLastUpdateSeconds > OFFLINE_THRESHOLD_SECONDS) {
      deviceStatus = 'offline'
      // Only alert if the endpoint isn't already registering an offline state downstream
      shouldNotifyStatusChange = true
      statusMessage = '🔴 Warning: Zone 1 Telemetry Offline. Sensor transmission dropped.'
    }

    // Execution Block for Notifications
    if (shouldNotifyLeak) {
      await sendMobilePushNotification(
        '🚨 CRITICAL LEAK SUSPECTED',
        `Zone 1 Pipe Anomaly! Vibration levels spiking at ${currentVibration} Hz.`,
        'siren'
      )
    } else if (shouldNotifyStatusChange) {
      await sendMobilePushNotification(
        '🔌 SYSTEM STATUS ALTERATION',
        statusMessage,
        'mechanical'
      )
    }

    return new NextResponse(
      JSON.stringify({
        vibration: latestRecord.vibration,
        battery: latestRecord.battery,
        rowId: latestRecord.id,
        alertFired: isCurrentLeak,
        status: deviceStatus
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
    return new NextResponse(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    )
  }
}
