import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jejXifxvgLlognjpynqc.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_U7pUJSL9uLKsCHgqcDi_3Q_ffDSTrOT'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('telemetry')
      .select('vibration, battery')
      .order('id', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) throw new Error(error?.message || 'No data found')

    return NextResponse.json({
      vibration: data.vibration,
      battery: data.battery
    })
  } catch (error: any) {
    return NextResponse.json({ vibration: 0, battery: 3.8, error: error.message }, { status: 500 })
  }
}
