import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface BootRow { player: string; team: string; snapshot_date: string; goals: number }

export async function GET() {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('golden_boot_snapshots')
    .select('player, team, snapshot_date, goals')
    .order('snapshot_date', { ascending: true })

  if (!data) return NextResponse.json({ players: [] })

  const byPlayer: Record<string, { player: string; team: string; history: { date: string; goals: number }[] }> = {}
  for (const row of data as BootRow[]) {
    if (!byPlayer[row.player]) byPlayer[row.player] = { player: row.player, team: row.team, history: [] }
    byPlayer[row.player].history.push({ date: row.snapshot_date, goals: row.goals })
  }

  return NextResponse.json({ players: Object.values(byPlayer) })
}
