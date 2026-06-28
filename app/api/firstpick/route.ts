import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('first_pick_counts')
    .select('team, count')
    .order('count', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data || []) as { team: string; count: number }[]
  const total = rows.reduce((s, r) => s + (r.count || 0), 0)
  return NextResponse.json({ counts: rows, total })
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const { team } = await req.json()
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  const { data: existing } = await supabase
    .from('first_picks')
    .select('team')
    .eq('ip', ip)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ message: 'already_picked', team: existing.team, locked: true })
  }

  await supabase.from('first_picks').insert({ ip, team })
  const { data: cnt } = await supabase
    .from('first_pick_counts')
    .select('count')
    .eq('team', team)
    .maybeSingle()
  await supabase
    .from('first_pick_counts')
    .upsert({ team, count: (cnt?.count || 0) + 1 }, { onConflict: 'team' })
  return NextResponse.json({ message: 'picked', team, locked: false })
}
