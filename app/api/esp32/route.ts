import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jejXifxvgLlognjpynqc.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_U7pUJSL9uLKsCHgqcDi_3Q_ffDSTrOT'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ⚡ Force Next.js to never cache this API response route
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('telemetry')
      .select('vibration, battery, created_at') // ✅ Now fetching the upload timestamp
      .order('id', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) throw new Error(error?.message || 'No data found')

    // ⏱️ Check how long ago the ESP32 wrote this row to the database
    const lastUploadTime = new Date(data.created_at).getTime()
    const now = Date.now()
    const secondsSinceLastUpload = (now - lastUploadTime) / 1000

    // 🛑 If no data has been written for more than 5 seconds, throw a hardware disconnect error
    if (secondsSinceLastUpload > 5) {
      throw new Error('ESP32 telemetry data has gone stale (device offline)')
    }

    return NextResponse.json(
      {
        vibration: data.vibration,
        battery: data.battery
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        }
      }
    )
  } catch (error: any) {
    // 💥 Return a true HTTP 500 Failure status code so the frontend catches the timeout error instantly!
    return NextResponse.json(
      { error: error.message }, 
      { 
        status: 500,
        headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' }
      }
    )
  }
}
