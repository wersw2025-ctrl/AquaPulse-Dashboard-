import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ✅ PERFECT CONFIGURATION: Locked into your active database instance route
const SUPABASE_URL = 'https://jejXifxvgLlognjpynqc.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_U7pUJSL9uLKsCHgqcDi_3Q_ffDSTrOT'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 💡 MOBILE PUSH NOTIFICATION KEYS (Fill these in from Pushsafer or Pushover later)
const MOBILE_PUSH_API_KEY = 'G2O7brPWuISaSMxxTjqy'
const MOBILE_PUSH_DEVICE_ID = '110575'

// 🚫 FORCE NO CACHE: Always pull fresh live data
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Safety trackers in server memory to prevent flooding your phone with 60 notifications per minute
let lastNotificationTime = 0
let lastKnownState: 'safe' | 'leak' = 'safe'

async function sendMobilePushNotification(title: string, message: string) {
  const now = Date.now()
  // Anti-flood throttle: Don't send more than one notification every 30 seconds
  if (now - lastNotificationTime < 30000) return
  if (MOBILE_PUSH_API_KEY === 'G2O7brPWuISaSMxxTjqy') return

  try {
    await fetch('https://pushsafer.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        k: MOBILE_PUSH_API_KEY,
        m: message,
        t: title,
        i: '1',  // Warning Icon profile
        s: '11', // High-pitch siren ringtone option
        d: MOBILE_PUSH_DEVICE_ID
      })
    })
    lastNotificationTime = now
  } catch (err) {
    console.error('Failed to dispatch background mobile push alert:', err)
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('telemetry')
      .select('vibration, battery, id') // Targets the valid id column you have
      .order('id', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) throw new Error(error?.message || 'No data found')

    const vibrationValue = data.vibration ?? 0
    const currentState = vibrationValue > 5.0 ? 'leak' : 'safe'

    // 📱 DETECT TRANSITIONS: Instantly alerts your phone layout when status shifts
    if (currentState === 'leak' && lastKnownState !== 'leak') {
      lastKnownState = 'leak'
      await sendMobilePushNotification(
        '🚨 CRITICAL LEAK SUSPECTED',
        `Zone 1 Pipe Anomaly! Vibration levels spiking at ${vibrationValue} Hz.`
      )
    } else if (currentState === 'safe' && lastKnownState === 'leak') {
      lastKnownState = 'safe'
      await sendMobilePushNotification(
        '✅ Zone 1 Safe Status Clear',
        `Pipeline metrics returned smoothly to an optimal baseline.`
      )
    }

    return new NextResponse(
      JSON.stringify({
        vibration: data.vibration,
        battery: data.battery,
        rowId: data.id
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
