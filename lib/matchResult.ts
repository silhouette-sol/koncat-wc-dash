import { WCMatch } from './types'

export type DecidedBy = 'regular' | 'extra_time' | 'penalties' | 'draw' | 'pending'

export interface MatchResult {
  winner: string | null
  decidedBy: DecidedBy
  displayScore: string
}

const KNOCKOUT_ROUNDS = ['Round of 32', 'Round of 16', 'Quarter', 'Semi', 'Final']

function isKnockout(round: string): boolean {
  return KNOCKOUT_ROUNDS.some(r => round.includes(r))
}

export function getMatchResult(match: WCMatch): MatchResult {
  const { score } = match
  if (!score) return { winner: null, decidedBy: 'pending', displayScore: '' }

  const { ft, et, p } = score

  // Penalty shootout — use ft (or et if available) as the displayed regulation score
  if (p) {
    const winner = p[0] > p[1] ? match.team1 : match.team2
    const baseScore = et ? `${et[0]}–${et[1]}` : `${ft[0]}–${ft[1]}`
    return {
      winner,
      decidedBy: 'penalties',
      displayScore: `${baseScore} (${p[0]}–${p[1]} pens)`,
    }
  }

  // Extra time with a decisive score
  if (et) {
    if (et[0] !== et[1]) {
      const winner = et[0] > et[1] ? match.team1 : match.team2
      return { winner, decidedBy: 'extra_time', displayScore: `${et[0]}–${et[1]} AET` }
    }
    // Level after ET, penalty data not yet synced
    return { winner: null, decidedBy: 'pending', displayScore: `${ft[0]}–${ft[1]}` }
  }

  // Regular time decisive
  if (ft[0] !== ft[1]) {
    const winner = ft[0] > ft[1] ? match.team1 : match.team2
    return { winner, decidedBy: 'regular', displayScore: `${ft[0]}–${ft[1]}` }
  }

  // Level with no ET/penalties: knockout = still pending (data not yet synced),
  // group stage = valid draw
  return {
    winner: null,
    decidedBy: isKnockout(match.round) ? 'pending' : 'draw',
    displayScore: `${ft[0]}–${ft[1]}`,
  }
}
