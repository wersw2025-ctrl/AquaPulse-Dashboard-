import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ✅ PERFECT CONFIGURATION: Locked into your active database instance route
const SUPABASE_URL = 'https://jejXifxvgLlognjpynqc.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_U7pUJSL9uLKsCHgqcDi_3Q_ffDSTrOT'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 🚫 FORCE NO CACHE: Always pull fresh live data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('telemetry')
      .select('vibration, battery, id') // Targets the valid id column you have
      .order('id', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) throw new Error(error?.message || 'No data found')

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
