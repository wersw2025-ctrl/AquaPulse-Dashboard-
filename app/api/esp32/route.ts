import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jejXifxvgLlognjpynqc.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_U7pUJSL9uLKsCHgqcDi_3Q_ffDSTrOT'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const PUSHOVER_USER_KEY = 'u9x7yhbpjv64cxo4d6douac9kvuebk'
const PUSHOVER_API_TOKEN = 'azua6kre9hb6u8rw4x6a7ktyggid34'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function sendMobilePushNotification(title: string, message: string) {
 if (PUSHOVER_USER_KEY === 'YOUR_PUSHOVER_USER_KEY') return

 try {
 const res = await fetch('https://api.pushover.net/1/messages.json', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 token: PUSHOVER_API_TOKEN,
 user: PUSHOVER_USER_KEY,
 title: title,
 message: message,
 sound: 'siren', 
 priority: 1 
 })
 })
 console.log('Pushover API Response Status:', res.status)
 } catch (err) {
 console.error('Failed to dispatch background mobile push alert:', err)
 }
}

export async function GET() {
 try {
 // 🔍 Fetch the 2 most recent rows to track state transitions perfectly
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

 let shouldNotify = false

 if (records.length === 2) {
 const previousRecord = records[1]
 const previousVibration = previousRecord.vibration ?? 0
 const wasPreviousLeak = previousVibration > 5.0

 // 🚨 BOUNDARY EDGE TRIGGER: Only fire if it jumped from safe to leaking!
 if (isCurrentLeak && !wasPreviousLeak) {
 shouldNotify = true
 }
 } else {
 // Fallback if there is only one record in the entire database table
 if (isCurrentLeak) shouldNotify = true
 }

 // Dispatch the notification exactly once per incident
 if (shouldNotify) {
 await sendMobilePushNotification(
 '🚨 CRITICAL LEAK SUSPECTED',
 `Zone 1 Pipe Anomaly! Vibration levels spiking at ${currentVibration} Hz.`
 )
 }

 return new NextResponse(
 JSON.stringify({
 vibration: latestRecord.vibration,
 battery: latestRecord.battery,
 rowId: latestRecord.id,
 alertFired: isCurrentLeak
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