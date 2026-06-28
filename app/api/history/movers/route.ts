import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface SnapshotRow { team: string; snapshot_date: string; model_win_prob: number }

export async function GET() {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('daily_snapshots')
    .select('team, snapshot_date, model_win_prob')
    .order('snapshot_date', { ascending: false })
    .limit(200)

  if (!data || data.length === 0) return NextResponse.json({ movers: [] })

  const byTeam: Record<string, { date: string; prob: number }[]> = {}
  for (const row of data as SnapshotRow[]) {
    if (!byTeam[row.team]) byTeam[row.team] = []
    byTeam[row.team].push({ date: row.snapshot_date, prob: row.model_win_prob })
  }

  const movers = []
  for (const [team, rows] of Object.entries(byTeam)) {
    if (rows.length < 2) continue
    const today = rows[0].prob
    const yesterday = rows[1].prob
    const change = today - yesterday
    movers.push({ team, today, yesterday, change, direction: change >= 0 ? 'up' : 'down' })
  }
  movers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
  return NextResponse.json({ movers: movers.slice(0, 5) })
}
