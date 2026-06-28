import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const team = searchParams.get('team')
  if (!team) return NextResponse.json({ history: [] })

  const supabase = getSupabase()
  const { data } = await supabase
    .from('daily_snapshots')
    .select('snapshot_date, model_win_prob, market_win_prob, elo_rating, delta')
    .eq('team', team)
    .order('snapshot_date', { ascending: true })

  return NextResponse.json({ history: data || [] })
}
