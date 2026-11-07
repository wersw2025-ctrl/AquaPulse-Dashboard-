import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_U7pUJSL9uLKsCHgqcDi_3Q_ffDSTrOT'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('telemetry')
      .select('vibration, battery, created_at')
      .order('id', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) throw new Error(error?.message || 'No data found')

    const lastUploadTime = new Date(data.created_at).getTime()
    const now = Date.now()
    const secondsSinceLastUpload = (now - lastUploadTime) / 1000

    // ✅ Extended to 12 seconds to give the hardware breathing room to boot up and connect
    if (secondsSinceLastUpload > 12) {
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
    return NextResponse.json(
      { error: error.message }, 
      { 
        status: 500,
        headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' }
      }
    )
  }
}
