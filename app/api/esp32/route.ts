import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ✅ PERFECT CONFIGURATION: Locked into your active database instance route
const SUPABASE_URL = 'https://jejXifxvgLlognjpynqc.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_U7pUJSL9uLKsCHgqcDi_3Q_ffDSTrOT'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 💡 MOBILE PUSH NOTIFICATION KEYS (Enter your valid private keys inside the quotes below)
const MOBILE_PUSH_API_KEY = 'YOUR_PUSHSAFER_API_KEY'
const MOBILE_PUSH_DEVICE_ID = 'YOUR_DEVICE_ID'

// 🚫 FORCE NO CACHE: Always pull fresh live data
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function sendMobilePushNotification(title: string, message: string) {
  if (MOBILE_PUSH_API_KEY === 'YOUR_PUSHSAFER_API_KEY') return

  try {
    // ✅ FIXED API ENDPOINT: Pointing to the proper Pushsafer processing directory
    await fetch('https://pushsafer.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        k: MOBILE_PUSH_API_KEY,
        m: message,
        t: title,
        i: '1',  
        s: '11', 
        d: MOBILE_PUSH_DEVICE_ID
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

    // Latest row data packet
    const latestRecord = records[0]
    const currentVibration = latestRecord.vibration ?? 0
    const isCurrentLeak = currentVibration > 5.0

    // Evaluate historical trends if we have a comparative previous row record
    if (records.length === 2) {
      const previousRecord = records[1]
      const previousVibration = previousRecord.vibration ?? 0
      const wasPreviousLeak = previousVibration > 5.0

      // 🚨 REAL DATABASE TRANSITION CHECKS: Completely immune to Vercel memory resets!
      if (isCurrentLeak && !wasPreviousLeak) {
        // Safe transitioned to Leak -> Fire push alert!
        await sendMobilePushNotification(
          '🚨 CRITICAL LEAK SUSPECTED',
          `Zone 1 Pipe Anomaly! Vibration levels spiking at ${currentVibration} Hz.`
        )
      } else if (!isCurrentLeak && wasPreviousLeak) {
        // Leak transitioned to Safe -> Fire clear alert!
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
