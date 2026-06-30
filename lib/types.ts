export interface TeamComparison {
  name: string
  elo_rating: number
  elo_win_prob: number
  market_win_prob: number | null
  delta: number | null
  signal: string
  path_difficulty: 'easy' | 'medium' | 'hard' | null
  avg_potential_opp_elo: number | null
  path_note: string | null
}

export interface ComparisonData {
  generated_at: string
  market_source: string
  simulation_runs: number
  teams: TeamComparison[]
}

export interface GoldenBootEntry {
  player: string
  team: string
  goals: number
  matches_scored_in: number
  minutes: string[]
}

export interface EloMover {
  team: string
  pre_wc: number
  current: number
  change: number
  direction: 'up' | 'down' | 'flat'
}

export interface CleanSheet {
  team: string
  clean_sheets: number
  games: number
  cs_rate: number
}

export interface GoalTimingBins {
  '0-15': number
  '16-30': number
  '31-45': number
  '46-60': number
  '61-75': number
  '76-90': number
  '90+': number
}

export interface Upset {
  match: string
  score: string
  date: string
  result: string
  t1_elo: number
  t2_elo: number
  t1_win_prob: number
  surprise_score: number
}

export interface OppStrength {
  team: string
  avg_opp_elo: number
  games: number
}

export interface DescriptiveData {
  generated_at: string
  golden_boot: GoldenBootEntry[]
  elo_movers: EloMover[]
  clean_sheets: CleanSheet[]
  goal_timing: {
    bins: GoalTimingBins
    total_goals: number
    most_productive_period: string
  }
  upsets: Upset[]
  opp_strength: OppStrength[]
}

export interface HistoricalPattern {
  id: string
  value: string | number | boolean
  display: string
  detail?: string[]
}

export interface ColorWinData {
  wins: number
  winners: string[]
}

export interface SmallestNation {
  team: string
  population_millions: number
  win_prob: number
}

export interface FunFactsData {
  generated_at: string
  historical_patterns: HistoricalPattern[]
  color_wins: Record<string, ColorWinData>
  quirky_angles: {
    foreign_coaches: unknown[]
    smallest_nations: SmallestNation[]
  }
}

export interface WCMatch {
  round: string
  date: string
  time?: string
  team1: string
  team2: string
  score?: {
    ft: [number, number]
    ht?: [number, number]
    et?: [number, number]  // after extra time (120 min)
    p?: [number, number]   // penalty shootout goals
  }
  goals1?: { name: string; minute: string }[]
  goals2?: { name: string; minute: string }[]
  group?: string
  ground?: string
  num?: number
}
