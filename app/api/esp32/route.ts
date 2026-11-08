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
const OFFLINE_THRESHOLD_SECONDS = 20 

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
        url: 'https://your-actual-deployed-dashboard-link-here.com'     
      })
    })
  } catch (err) {
    console.error('Failed to dispatch background mobile push alert:', err)
  }
}

export async function GET() {
  try {
    // 🔍 Fetch the 2 most recent rows including the timestamp column
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
    
    // Parse timestamps safely
    const currentLogTime = latestRecord.created_at ? new Date(latestRecord.created_at).getTime() : Date.now()
    const timeSinceLastUpdateSeconds = (Date.now() - currentLogTime) / 1000

    // Evaluate the absolute live state right now based on system clock window
    const isLiveCurrentlyOffline = timeSinceLastUpdateSeconds > OFFLINE_THRESHOLD_SECONDS

    let shouldNotifyLeak = false
    let shouldNotifyStatusChange = false
    let statusMessage = ''

    if (records.length === 2) {
      const previousRecord = records[1]
      const previousVibration = previousRecord.vibration ?? 0
      const wasPreviousLeak = previousVibration > 5.0
      
      const previousLogTime = previousRecord.created_at ? new Date(previousRecord.created_at).getTime() : currentLogTime
      const intervalBetweenLogsSeconds = (currentLogTime - previousLogTime) / 1000

      // 🚨 1. LEAK DETECTION (Only fire on transition from dry to wet)
      if (isCurrentLeak && !wasPreviousLeak) {
        shouldNotifyLeak = true
      }

      // 🟢 2. ONE-TIME ONLINE TRANSITION
      // Fire ONLY if the latest log just broke a long period of silence, AND the page is checking it fresh
      if (!isLiveCurrentlyOffline && intervalBetweenLogsSeconds > OFFLINE_THRESHOLD_SECONDS) {
        // We use the ID difference to ensure we only report this once per actual database transition row
        const sessionLockKey = `online_alert_fired_${latestRecord.id}`
        // Using global memory mapping to block loop repetition
        if (!(global as any)[sessionLockKey]) {
          shouldNotifyStatusChange = true
          statusMessage = '🟢 Zone 1 Telemetry Online: Connection established and system power verified.'
          ;(global as any)[sessionLockKey] = true
        }
      }

      // 🔴 3. ONE-TIME OFFLINE TRANSITION
      if (isLiveCurrentlyOffline) {
        const sessionLockKey = `offline_alert_fired_${latestRecord.id}`
        if (!(global as any)[sessionLockKey]) {
          shouldNotifyStatusChange = true
          statusMessage = '🔴 Warning: Zone 1 Telemetry Offline. Sensor transmission dropped.'
          ;(global as any)[sessionLockKey] = true
        }
      }
    } else {
      if (isCurrentLeak) shouldNotifyLeak = true
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
        status: isLiveCurrentlyOffline ? 'offline' : 'online'
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
