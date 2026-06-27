import { EloMover } from './types'

const REAL_TEAM_PATTERN = /^[A-Za-zÀ-ÿ\s&'()\-.]+$/

export function filterRealTeams(movers: EloMover[]): EloMover[] {
  return movers.filter(
    (m) =>
      m.direction !== 'flat' &&
      REAL_TEAM_PATTERN.test(m.team) &&
      !m.team.match(/^\d/) &&
      m.team.length < 30
  )
}
