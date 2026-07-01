'use client'

import { DescriptiveData, GoldenBootEntry, WCMatch } from '@/lib/types'

interface BuildingTabProps {
  descriptive: DescriptiveData
  worldcupMatches: WCMatch[]
}

interface PlayerStory {
  name: string
  flag: string
  country: string
  club: string
  wcTeam: string | null
  injury: string
  recovery: string
  comebackText: string
  playerSearchTerms: string[]
}

const KO_ROUNDS = new Set([
  'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final',
  'Final', 'Match for third place',
])

const PLAYERS: PlayerStory[] = [
  {
    name: 'Neymar Jr.',
    flag: '🇧🇷',
    country: 'Brazil',
    club: 'Al-Hilal',
    wcTeam: 'Brazil',
    injury: 'ACL and meniscus rupture, left knee, October 2023',
    recovery: '11 months out · 34 years old at this tournament',
    comebackText:
      'Neymar ruptured his ACL and meniscus in October 2023, his second major knee injury in two years. At 34, many questioned whether he would ever return to top level football. His presence at the 2026 World Cup closes the chapter on one of the sport\'s most dramatic recovery stories.',
    playerSearchTerms: ['neymar'],
  },
  {
    name: 'Son Heung-min',
    flag: '🇰🇷',
    country: 'South Korea',
    club: 'Tottenham Hotspur',
    wcTeam: 'South Korea',
    injury: 'Multiple orbital bone fractures, November 2022',
    recovery: 'Played 2022 World Cup in a carbon-fiber protective mask',
    comebackText:
      'Son fractured multiple bones around his left eye socket just before the 2022 World Cup. Rather than miss the tournament, he wore a custom carbon-fiber mask to protect his face and played every match, a decision that defined his reputation for resilience. He arrives at 2026 as South Korea\'s captain and most important player.',
    playerSearchTerms: ['son heung', 'son h'],
  },
  {
    name: 'Alphonso Davies',
    flag: '🇨🇦',
    country: 'Canada',
    club: 'Bayern Munich',
    wcTeam: 'Canada',
    injury: 'Myocarditis, heart muscle inflammation, January 2022',
    recovery: '4 months of complete rest on medical orders',
    comebackText:
      'Davies was diagnosed with myocarditis, inflammation of the heart muscle, after a COVID-19 infection in early 2022. Doctors ordered four months of zero physical activity to prevent cardiac arrest. The fact that he is now competing at a World Cup hosted partly in his home country makes this one of the more remarkable returns in recent memory.',
    playerSearchTerms: ['davies', 'alphonso'],
  },
  {
    name: 'Federico Chiesa',
    flag: '🇮🇹',
    country: 'Italy',
    club: 'Liverpool',
    wcTeam: null,
    injury: 'ACL tear, left knee, January 2022',
    recovery: '10 months out · missed 2022 World Cup entirely',
    comebackText:
      'Chiesa tore his ACL in January 2022 and missed the entire remainder of that season plus Italy\'s failed World Cup qualification. Italy did not qualify for the 2026 World Cup either, meaning his full comeback at a World Cup remains unfinished business.',
    playerSearchTerms: ['chiesa'],
  },
  {
    name: 'Gavi',
    flag: '🇪🇸',
    country: 'Spain',
    club: 'FC Barcelona',
    wcTeam: 'Spain',
    injury: 'ACL and lateral meniscus tear, right knee, November 2023',
    recovery: '11 months out · returned to play October 2024',
    comebackText:
      'Gavi tore his ACL at just 19 years old, an injury that threatened to derail one of Europe\'s most exciting young midfielders before his career had fully begun. His return for Spain at this World Cup at age 22 is the story of a player reclaiming time the injury stole from him.',
    playerSearchTerms: ['gavi'],
  },
  {
    name: 'Virgil van Dijk',
    flag: '🇳🇱',
    country: 'Netherlands',
    club: 'Liverpool',
    wcTeam: 'Netherlands',
    injury: 'ACL tear, right knee, October 2020',
    recovery: '9 months out · returned July 2021',
    comebackText:
      'Van Dijk\'s ACL tear was caused by a reckless challenge from an opposing goalkeeper, a moment that ended Liverpool\'s title defense and raised serious questions about whether the world\'s best defender would return to the same level. He did, and at 35 years old he is still anchoring the Netherlands defense in 2026.',
    playerSearchTerms: ['van dijk', 'virgil'],
  },
  {
    name: 'Christian Eriksen',
    flag: '🇩🇰',
    country: 'Denmark',
    club: 'Manchester United',
    wcTeam: null,
    injury: 'Sudden cardiac arrest on the pitch, June 2021',
    recovery: 'Clinically dead for several minutes · fitted with heart device · returned February 2022',
    comebackText:
      'Eriksen suffered a cardiac arrest during a Euro 2020 match and was resuscitated on the pitch. He was fitted with an Implantable Cardioverter Defibrillator and returned to professional football eight months later, a medical achievement that surprised the entire sports world. Denmark did not qualify for 2026, but Eriksen\'s story remains the most remarkable comeback in the sport\'s history.',
    playerSearchTerms: ['eriksen', 'christian e'],
  },
]

function getTeamStats(teamName: string, matches: WCMatch[]) {
  const teamMatches = matches.filter(
    m => m.team1 === teamName || m.team2 === teamName
  )
  const completed = teamMatches.filter(m => m.score)
  const inKnockout = completed.some(m => KO_ROUNDS.has(m.round))
  return {
    matchesPlayed: completed.length,
    inKnockout,
    status: inKnockout ? 'through to knockouts' : 'group stage',
  }
}

function getPlayerGoals(searchTerms: string[], goldenBoot: GoldenBootEntry[]): number {
  for (const term of searchTerms) {
    const entry = goldenBoot.find(p =>
      p.player.toLowerCase().includes(term.toLowerCase())
    )
    if (entry) return entry.goals
  }
  return 0
}

function PlayerCard({
  player,
  goldenBoot,
  worldcupMatches,
}: {
  player: PlayerStory
  goldenBoot: GoldenBootEntry[]
  worldcupMatches: WCMatch[]
}) {
  const goals = getPlayerGoals(player.playerSearchTerms, goldenBoot)
  const teamStats = player.wcTeam ? getTeamStats(player.wcTeam, worldcupMatches) : null

  return (
    <div
      className="rounded-sm p-5"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(227,194,126,0.3)' }}
    >
      {/* Two-column layout */}
      <div className="flex flex-col sm:flex-row gap-5">

        {/* LEFT: identity + injury */}
        <div className="sm:w-2/5 space-y-3">
          {/* Identity */}
          <div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 22 }}>{player.flag}</span>
              <span
                className="font-display tracking-wide leading-none"
                style={{ fontSize: 22, color: '#e3c27e' }}
              >
                {player.name}
              </span>
            </div>
            <p className="font-mono-data text-xs text-text-muted mt-1">
              {player.country} · {player.club}
            </p>
          </div>

          {/* Injury */}
          <div className="space-y-1">
            <p className="font-mono-data text-[10px] uppercase tracking-widest" style={{ color: '#e3c27e' }}>
              The Injury
            </p>
            <p className="font-body text-sm font-semibold text-text-primary leading-snug">
              {player.injury}
            </p>
            <p className="font-mono-data text-xs text-text-muted leading-snug">
              {player.recovery}
            </p>
          </div>
        </div>

        {/* RIGHT: comeback + stats */}
        <div className="sm:w-3/5 space-y-3">
          {/* Comeback */}
          <div className="space-y-1">
            <p className="font-mono-data text-[10px] uppercase tracking-widest" style={{ color: '#e3c27e' }}>
              The Comeback
            </p>
            <p className="font-body text-sm text-text-primary leading-relaxed">
              {player.comebackText}
            </p>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(227,194,126,0.3)' }} />

          {/* WC Stats */}
          <div className="space-y-1">
            <p className="font-mono-data text-[10px] uppercase tracking-widest" style={{ color: '#e3c27e' }}>
              2026 World Cup
            </p>
            {teamStats ? (
              <div className="space-y-0.5">
                <p className="font-body text-sm text-text-primary">
                  {goals > 0
                    ? <><span style={{ color: '#e3c27e', fontWeight: 700 }}>{goals} goal{goals !== 1 ? 's' : ''}</span>{' '}in {teamStats.matchesPlayed} match{teamStats.matchesPlayed !== 1 ? 'es' : ''}</>
                    : <>{teamStats.matchesPlayed} match{teamStats.matchesPlayed !== 1 ? 'es' : ''} played</>
                  }
                </p>
                <p className="font-mono-data text-xs" style={{ color: teamStats.inKnockout ? '#1D9E75' : 'rgba(243,237,224,0.52)' }}>
                  {player.country} · {teamStats.status}
                  {teamStats.inKnockout && ' ✓'}
                </p>
              </div>
            ) : (
              <p className="font-mono-data text-xs text-text-muted">
                {player.country} did not qualify for 2026
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BuildingTab({ descriptive, worldcupMatches }: BuildingTabProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="font-display text-4xl tracking-widest" style={{ color: '#e3c27e' }}>
          BUILDING BACK
        </h2>
        <p className="font-body text-base text-text-primary">
          Players who came back from career-threatening injuries to compete at the 2026 World Cup
        </p>
      </div>

      {/* Player cards */}
      <div className="space-y-4">
        {PLAYERS.map(player => (
          <PlayerCard
            key={player.name}
            player={player}
            goldenBoot={descriptive.golden_boot}
            worldcupMatches={worldcupMatches}
          />
        ))}
      </div>

      {/* Footer note */}
      <div
        className="rounded-sm px-5 py-4"
        style={{ background: 'rgba(11,29,58,0.5)', border: '1px solid rgba(227,194,126,0.2)' }}
      >
        <p className="font-mono-data text-[10px] uppercase tracking-widest mb-2" style={{ color: '#e3c27e' }}>
          Why This Matters
        </p>
        <p className="font-body text-sm text-text-muted leading-relaxed">
          ACL tears typically take 9 to 12 months to recover from and carry a high re-injury risk.
          The players on this list represent some of the most difficult physical and mental journeys
          in professional football.
        </p>
        <a
          href="https://en.wikipedia.org/wiki/Anterior_cruciate_ligament_injury"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono-data text-xs underline hover:text-text-primary transition-colors mt-2 inline-block"
          style={{ color: '#e3c27e' }}
        >
          Learn more about ACL injuries in sport
        </a>
      </div>

      <div className="pb-2" />
    </div>
  )
}
