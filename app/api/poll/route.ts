import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('vote_counts')
    .select('team, count')
    .order('count', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data || []) as { team: string; count: number }[]
  const total = rows.reduce((s, r) => s + (r.count || 0), 0)
  return NextResponse.json({ votes: rows, total })
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const { team } = await req.json()
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  const { data: existing } = await supabase
    .from('votes')
    .select('team')
    .eq('ip', ip)
    .maybeSingle()

  if (existing) {
    if (existing.team === team) {
      return NextResponse.json({ message: 'already_voted', team })
    }
    const { data: oldCount } = await supabase
      .from('vote_counts')
      .select('count')
      .eq('team', existing.team)
      .maybeSingle()
    await supabase
      .from('vote_counts')
      .upsert(
        { team: existing.team, count: Math.max(0, (oldCount?.count || 1) - 1) },
        { onConflict: 'team' }
      )
    await supabase.from('votes').update({ team }).eq('ip', ip)
    const { data: newCount } = await supabase
      .from('vote_counts')
      .select('count')
      .eq('team', team)
      .maybeSingle()
    await supabase
      .from('vote_counts')
      .upsert({ team, count: (newCount?.count || 0) + 1 }, { onConflict: 'team' })
    return NextResponse.json({ message: 'vote_changed', team })
  }

  await supabase.from('votes').insert({ ip, team })
  const { data: cnt } = await supabase
    .from('vote_counts')
    .select('count')
    .eq('team', team)
    .maybeSingle()
  await supabase
    .from('vote_counts')
    .upsert({ team, count: (cnt?.count || 0) + 1 }, { onConflict: 'team' })
  return NextResponse.json({ message: 'voted', team })
}
