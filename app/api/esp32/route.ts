import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ✅ FIXED: Restored your unique database project instance ID router domain!
const SUPABASE_URL = 'https://jejXifxvgLlognjpynqc.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_U7pUJSL9uLKsCHgqcDi_3Q_ffDSTrOT'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
    const secondsSinceLastUpload = Math.max(0, (now - lastUploadTime) / 1000)

    const isStale = secondsSinceLastUpload > 20

    return new NextResponse(
      JSON.stringify({
        vibration: data.vibration,
        battery: data.battery,
        secondsAgo: secondsSinceLastUpload,
        isStale: isStale
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Surrogate-Control': 'no-store',
        },
      }
    )
  } catch (error: any) {
    return new NextResponse(
      JSON.stringify({ error: error.message, isStale: true, secondsAgo: 999 }),
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
