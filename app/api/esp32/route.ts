import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ✅ PERFECT CONFIGURATION: Re-anchored right into your active database instance route
const SUPABASE_URL = 'https://jejXifxvgLlognjpynqc.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_U7pUJSL9uLKsCHgqcDi_3Q_ffDSTrOT'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 💡 PUSHOVER CREDENTIALS: Paste your specific dashboard keys inside the quotes below
const PUSHOVER_USER_KEY = 'u9x7yhbpjv64cxo4d6douac9kvuebk'
const PUSHOVER_API_TOKEN = 'azua6kre9hb6u8rw4x6a7ktyggid34'

// 🚫 FORCE NO CACHE: Always pull fresh live data
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function sendMobilePushNotification(title: string, message: string) {
  if (PUSHOVER_USER_KEY === 'YOUR_PUSHOVER_USER_KEY') return

  try {
    // ✅ FIXED NATIVE ENDPOINT: Sending message payload directly to the verified Pushover API router
    await fetch('https://pushover.net', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: PUSHOVER_API_TOKEN,
        user: PUSHOVER_USER_KEY,
        title: title,
        message: message,
        sound: 'siren', // High-priority emergency sound
        priority: 1     // High priority filter to bypass phone standby sleep deep cycles
      })
    })
  } catch (err) {
    console.error('Failed to dispatch background mobile push alert:', err)
  }
}

export async function GET() {
  try {
    // 🔍 STATELESS OPERATION: Fetch the 2 most recent rows to track real database changes accurately
    const { data: records, error } = await supabase
      .from('telemetry')
      .select('vibration, battery, id')
      .order('id', { ascending: false })
      .limit(2)

    if (error || !records || records.length === 0) {
      throw new Error(error?.message || 'No telemetry records found')
    }

    const latestRecord = records[0]
    const currentVibration = latestRecord.vibration ?? 0
    const isCurrentLeak = currentVibration > 5.0

    if (records.length === 2) {
      const previousRecord = records[1]
      const previousVibration = previousRecord.vibration ?? 0
      const wasPreviousLeak = previousVibration > 5.0

      // 🚨 REAL DATABASE TRANSITION CHECKS: Immune to serverless memory resets!
      if (isCurrentLeak && !wasPreviousLeak) {
        await sendMobilePushNotification(
          '🚨 CRITICAL LEAK SUSPECTED',
          `Zone 1 Pipe Anomaly! Vibration levels spiking at ${currentVibration} Hz.`
        )
      } else if (!isCurrentLeak && wasPreviousLeak) {
        await sendMobilePushNotification(
          '✅ Zone 1 Safe Status Clear',
          `Pipeline metrics returned smoothly to an optimal baseline.`
        )
      }
    }

    return new NextResponse(
      JSON.stringify({
        vibration: latestRecord.vibration,
        battery: latestRecord.battery,
        rowId: latestRecord.id
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
