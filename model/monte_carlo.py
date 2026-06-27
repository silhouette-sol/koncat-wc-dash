"""
model/monte_carlo.py
Simulates the remaining 2026 World Cup tournament N times using
current Elo ratings. Counts how often each team wins across all
simulations to produce win probabilities.

The 2026 format:
  - 12 groups of 4 teams
  - Top 2 per group qualify automatically (24 teams)
  - 8 best 3rd-place teams also qualify (by points then GD)
  - 32 teams enter the knockout round
  - Knockout rounds until 1 team remains
"""

import random
from collections import defaultdict
from model.elo import expected_score, gd_multiplier, normalize_name


def simulate_group_match(t1, t2, elo):
    """
    Simulate one group stage match. Returns (goals_t1, goals_t2).
    Three possible outcomes: t1 win, draw, t2 win.
    Draw probability shrinks as rating gap grows.
    """
    ra, rb = elo.get(t1, 1500), elo.get(t2, 1500)
    p_win  = expected_score(ra, rb)
    gap    = abs(ra - rb)
    p_draw = max(0.05, 0.22 - (gap / 400) * 0.10)

    r = random.random()
    if r < p_win * (1 - p_draw):
        return (random.randint(1, 3), 0)
    elif r < p_win * (1 - p_draw) + p_draw:
        g = random.randint(0, 2)
        return (g, g)
    else:
        return (0, random.randint(1, 3))


def simulate_ko_match(t1, t2, elo):
    """Knockout match — no draws. Returns the winner."""
    return t1 if random.random() < expected_score(
        elo.get(t1, 1500), elo.get(t2, 1500)
    ) else t2


def get_standings_and_remaining(wc_matches):
    """
    Build current group standings from completed matches.
    Return list of remaining group matches still to be simulated.
    """
    standings   = defaultdict(lambda: {"pts": 0, "gf": 0, "ga": 0, "gd": 0})
    group_teams = defaultdict(set)

    for m in wc_matches:
        grp = m.get("group", "")
        if not grp:
            continue
        t1 = normalize_name(m["team1"])
        t2 = normalize_name(m["team2"])
        group_teams[grp].update([t1, t2])

        if not m.get("score"):
            continue

        g1, g2 = m["score"]["ft"]

        standings[t1]["gf"] += g1
        standings[t1]["ga"] += g2
        standings[t2]["gf"] += g2
        standings[t2]["ga"] += g1
        standings[t1]["gd"] = standings[t1]["gf"] - standings[t1]["ga"]
        standings[t2]["gd"] = standings[t2]["gf"] - standings[t2]["ga"]

        if g1 > g2:
            standings[t1]["pts"] += 3
        elif g1 == g2:
            standings[t1]["pts"] += 1
            standings[t2]["pts"] += 1
        else:
            standings[t2]["pts"] += 3

    remaining = [
        m for m in wc_matches
        if m.get("group") and not m.get("score")
    ]
    return (
        dict(standings),
        {g: list(ts) for g, ts in group_teams.items()},
        remaining
    )


def simulate_tournament(elo, base_standings, group_teams, remaining):
    """
    Simulate one full run of the remaining tournament.
    Returns the winning team name.
    """
    standings = {t: dict(s) for t, s in base_standings.items()}

    # Simulate remaining group matches
    for m in remaining:
        t1 = normalize_name(m["team1"])
        t2 = normalize_name(m["team2"])
        g1, g2 = simulate_group_match(t1, t2, elo)

        for t, gf, ga in [(t1, g1, g2), (t2, g2, g1)]:
            if t not in standings:
                standings[t] = {"pts": 0, "gf": 0, "ga": 0, "gd": 0}
            standings[t]["gf"] += gf
            standings[t]["ga"] += ga
            standings[t]["gd"]  = standings[t]["gf"] - standings[t]["ga"]

        if g1 > g2:
            standings[t1]["pts"] += 3
        elif g1 == g2:
            standings[t1]["pts"] += 1
            standings[t2]["pts"] += 1
        else:
            standings[t2]["pts"] += 3

    # Determine qualifiers: top 2 per group + 8 best 3rd place
    qualifiers  = []
    third_place = []

    for grp, members in sorted(group_teams.items()):
        ranked = sorted(members, key=lambda t: (
            -standings.get(t, {}).get("pts", 0),
            -standings.get(t, {}).get("gd",  0),
            -standings.get(t, {}).get("gf",  0)
        ))
        qualifiers += ranked[:2]
        if len(ranked) >= 3:
            third_place.append(ranked[2])

    third_place.sort(key=lambda t: (
        -standings.get(t, {}).get("pts", 0),
        -standings.get(t, {}).get("gd",  0)
    ))
    qualifiers += third_place[:8]

    # Simulate knockout rounds
    random.shuffle(qualifiers)
    alive = qualifiers[:]

    while len(alive) > 1:
        next_round = []
        for i in range(0, len(alive) - 1, 2):
            next_round.append(simulate_ko_match(alive[i], alive[i+1], elo))
        if len(alive) % 2 == 1:
            next_round.append(alive[-1])
        alive = next_round

    return alive[0] if alive else None


def run_simulation(wc_matches, elo, n=10000):
    """
    Run n full tournament simulations.
    Returns {team_name: win_probability} for every team.
    """
    print(f"Running {n:,} Monte Carlo simulations...")
    standings, group_teams, remaining = get_standings_and_remaining(wc_matches)
    print(f"  Group matches still to play: {len(remaining)}")

    win_counts = defaultdict(int)
    for _ in range(n):
        winner = simulate_tournament(elo, standings, group_teams, remaining)
        if winner:
            win_counts[winner] += 1

    win_probs = {t: c / n for t, c in win_counts.items()}
    print(f"  ✓ Done. Probabilities sum to {sum(win_probs.values()):.3f}")
    return win_probs


if __name__ == "__main__":
    print("model/monte_carlo.py — call run_simulation(wc_matches, current_elo)")
