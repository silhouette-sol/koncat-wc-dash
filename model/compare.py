"""
model/compare.py
Compares model win probabilities against prediction market odds.
Identifies divergences — where the model and market disagree — and
explains the signal: which way each divergence points.

Market probabilities are a hardcoded snapshot from June 24, 2026.
When the Polymarket API integration is added, this dict gets replaced
by a live fetch that runs on every pipeline execution.
"""

import json
import os
import re
from datetime import datetime
from model.elo import normalize_name

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Implied win probabilities from Kalshi/FanDuel — June 24, 2026
# Converted from American odds: +360 → 100/(360+100) = 21.7%
# Replace with live Polymarket API call when pipeline moves to production.
MARKET_PROBS = {
    "France":      0.217,
    "Spain":       0.154,
    "England":     0.143,
    "Argentina":   0.133,
    "Portugal":    0.091,
    "Brazil":      0.071,
    "Germany":     0.071,
    "Netherlands": 0.056,
    "USA":         0.032,
    "Norway":      0.032,
    "Morocco":     0.028,
    "Japan":       0.022,
    "Mexico":      0.022,
    "Colombia":    0.022,
}


def compute_bracket_paths(wc_matches, current_elo):
    """
    Computes path difficulty for each team confirmed in a Round of 32 slot.

    Returns a dict: team_name → {path_difficulty, avg_potential_opp_elo, path_note}

    Potential opponents = the 15 teams a team could face across R32→Final:
      1 (R32 opponent) + 2 (R16 partner match) + 4 (QF opposite R16) + 8 (SF opposite QF)
    Average Elo of those 15 positions is the raw difficulty score.
    TBD slots use the tournament average Elo as a proxy.
    """
    KO_ROUNDS = {'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final'}
    by_num = {
        m['num']: m
        for m in wc_matches
        if m.get('num') and m.get('round') in KO_ROUNDS
    }

    if not by_num:
        return {}

    tour_avg = sum(current_elo.values()) / len(current_elo) if current_elo else 1650

    def is_tbd(name):
        return bool(re.match(r'^[0-9WL]', name)) or '/' in name or name == 'TBD'

    def parse_w(name):
        m = re.match(r'W(\d+)$', name)
        return int(m.group(1)) if m else None

    def r32_subtree(match_num, _seen=None):
        """Recursively return the set of R32 match nums feeding into match_num."""
        if _seen is None:
            _seen = set()
        if match_num in _seen:
            return set()
        _seen.add(match_num)
        m = by_num.get(match_num)
        if not m:
            return set()
        if m['round'] == 'Round of 32':
            return {match_num}
        result = set()
        for t in [m['team1'], m['team2']]:
            src = parse_w(t)
            if src:
                result |= r32_subtree(src, _seen)
        return result

    # Build forward mappings via the "W<num>" references in bracket slots
    r16_matches = [m for m in by_num.values() if m['round'] == 'Round of 16']
    qf_matches  = [m for m in by_num.values() if m['round'] == 'Quarter-final']
    sf_matches  = [m for m in by_num.values() if m['round'] == 'Semi-final']
    r32_matches = [m for m in by_num.values() if m['round'] == 'Round of 32']

    r32_to_r16, r16_to_qf, qf_to_sf = {}, {}, {}
    for r16 in r16_matches:
        for t in [r16['team1'], r16['team2']]:
            s = parse_w(t)
            if s:
                r32_to_r16[s] = r16['num']
    for qf in qf_matches:
        for t in [qf['team1'], qf['team2']]:
            s = parse_w(t)
            if s:
                r16_to_qf[s] = qf['num']
    for sf in sf_matches:
        for t in [sf['team1'], sf['team2']]:
            s = parse_w(t)
            if s:
                qf_to_sf[s] = sf['num']

    # Map named team → R32 match num
    team_to_r32 = {}
    for m in r32_matches:
        for t in [m['team1'], m['team2']]:
            if not is_tbd(t):
                team_to_r32[t] = m['num']

    def team_elo(name):
        return current_elo.get(name, tour_avg) if not is_tbd(name) else tour_avg

    def teams_in_r32_match(match_num, exclude=None):
        m = by_num.get(match_num, {})
        return [
            (t, team_elo(t))
            for t in [m.get('team1', ''), m.get('team2', '')]
            if t and t != exclude
        ]

    def other_source(match_num, exclude_src):
        """Given a match, return the W-source match num that is NOT exclude_src."""
        m = by_num.get(match_num, {})
        for t in [m['team1'], m['team2']]:
            s = parse_w(t)
            if s and s != exclude_src:
                return s
        return None

    def top_named(r32_nums, n=2, exclude=None):
        candidates = []
        for rn in r32_nums:
            m = by_num.get(rn, {})
            for t in [m.get('team1', ''), m.get('team2', '')]:
                if t and not is_tbd(t) and t != exclude:
                    candidates.append((t, current_elo.get(t, 0)))
        candidates.sort(key=lambda x: -x[1])
        return [t for t, _ in candidates[:n]]

    results = {}

    for team in current_elo:
        r32_num = team_to_r32.get(team)
        if not r32_num:
            results[team] = {'path_difficulty': None, 'avg_potential_opp_elo': None, 'path_note': None}
            continue

        r16_num = r32_to_r16.get(r32_num)
        qf_num  = r16_to_qf.get(r16_num) if r16_num else None
        sf_num  = qf_to_sf.get(qf_num)   if qf_num  else None

        if not (r16_num and qf_num and sf_num):
            results[team] = {'path_difficulty': None, 'avg_potential_opp_elo': None, 'path_note': None}
            continue

        # The four opponent pools
        partner_r32  = other_source(r16_num, r32_num)       # shares R16
        other_r16    = other_source(qf_num,  r16_num)       # other R16 in same QF
        other_qf     = other_source(sf_num,  qf_num)        # other QF in same SF

        opp_elos = []

        # 1. Direct R32 opponent (1 team)
        r32_m = by_num.get(r32_num, {})
        for t in [r32_m.get('team1', ''), r32_m.get('team2', '')]:
            if t and t != team:
                opp_elos.append(team_elo(t))

        # 2. Partner R32 match → R16 potential (2 teams)
        if partner_r32:
            for _, elo in teams_in_r32_match(partner_r32, exclude=team):
                opp_elos.append(elo)

        # 3. Other R16's R32 subtree → QF potential (4 teams)
        if other_r16:
            for rn in r32_subtree(other_r16):
                for _, elo in teams_in_r32_match(rn, exclude=team):
                    opp_elos.append(elo)

        # 4. Other QF's R32 subtree → SF potential (8 teams)
        if other_qf:
            for rn in r32_subtree(other_qf):
                for _, elo in teams_in_r32_match(rn, exclude=team):
                    opp_elos.append(elo)

        if not opp_elos:
            results[team] = {'path_difficulty': None, 'avg_potential_opp_elo': None, 'path_note': None}
            continue

        avg_elo = sum(opp_elos) / len(opp_elos)
        score   = avg_elo / 1700

        if score < 0.92:
            difficulty = 'easy'
        elif score <= 1.05:
            difficulty = 'medium'
        else:
            difficulty = 'hard'

        # Generate the path note
        # Teams in own path (QF + SF opponents, i.e., same half minus own match pairs)
        path_r32s = set()
        if other_r16:
            path_r32s |= r32_subtree(other_r16)
        if other_qf:
            path_r32s |= r32_subtree(other_qf)
        top_in_path = top_named(path_r32s, n=2, exclude=team)

        # Teams in other half (avoided until Final)
        other_sf_r32s = set()
        for sf in sf_matches:
            if sf['num'] != sf_num:
                other_sf_r32s |= r32_subtree(sf['num'])
        top_avoided = top_named(other_sf_r32s, n=2, exclude=team)

        if difficulty == 'easy':
            if top_avoided:
                note = (f"Avoids {' and '.join(top_avoided)} until the Final "
                        f"— favorable bracket draw")
            else:
                note = "Favorable draw — potential opponents trend below tournament average Elo"
        elif difficulty == 'hard':
            if top_in_path:
                note = (f"Path runs through {' and '.join(top_in_path)} "
                        f"— must navigate elite opposition to reach the Final")
            else:
                note = "Tough bracket draw — potential opponents trend above tournament average Elo"
        else:
            if top_in_path:
                note = f"Could face {' and '.join(top_in_path)} before the Final"
            else:
                note = "Balanced bracket — mix of strong and beatable opponents"

        results[team] = {
            'path_difficulty':       difficulty,
            'avg_potential_opp_elo': round(avg_elo),
            'path_note':             note,
        }

    return results


def signal(delta):
    """
    Classify the size of model vs market disagreement.
    delta = model_prob - market_prob.
    Positive = model more bullish. Negative = market more bullish.
    Only flag gaps > 4% — smaller gaps are simulation noise.
    """
    if delta >  0.04: return "🟢 MODEL FAVORS"
    if delta < -0.04: return "🔴 MARKET FAVORS"
    return "⚪ neutral"


def run_comparison(win_probs, current_elo, wc_matches=None):
    """
    Build and print the model vs market comparison table.
    Saves results to output/comparison.json.

    Inputs:
      win_probs    — from monte_carlo.run_simulation()
      current_elo  — from elo.update_with_wc_results()
      wc_matches   — full match list from fetch_openfootball() (optional)
    """
    # Compute bracket path difficulty if match data is available
    paths = compute_bracket_paths(wc_matches or [], current_elo)

    rows = []
    for team, model_p in win_probs.items():
        if model_p < 0.002:
            continue
        market_p = MARKET_PROBS.get(team)
        delta    = (model_p - market_p) if market_p is not None else None
        path     = paths.get(team, {})
        rows.append({
            "name":                  team,
            "elo_rating":            round(current_elo.get(team, 0)),
            "elo_win_prob":          round(model_p, 4),
            "market_win_prob":       round(market_p, 4) if market_p else None,
            "delta":                 round(delta, 4) if delta is not None else None,
            "signal":                signal(delta) if delta is not None else "no market data",
            "path_difficulty":       path.get('path_difficulty'),
            "avg_potential_opp_elo": path.get('avg_potential_opp_elo'),
            "path_note":             path.get('path_note'),
        })

    rows.sort(key=lambda r: -r["elo_win_prob"])

    # Print table
    print()
    print(f"{'Team':<22} {'Elo':>6} {'Model':>7} {'Market':>7} {'Delta':>7}  Signal")
    print("─" * 68)
    for r in rows:
        m_str = f"{r['market_win_prob']:.1%}" if r['market_win_prob'] else "  N/A"
        d_str = f"{r['delta']:+.1%}"           if r['delta']          else "  N/A"
        sig   = r['signal']
        print(f"{r['name']:<22} {r['elo_rating']:>6} "
              f"{r['elo_win_prob']:>7.1%} {m_str:>7} {d_str:>7}  {sig}")

    # Biggest divergences
    divergences = [r for r in rows if r["delta"] and abs(r["delta"]) >= 0.03]
    if divergences:
        print()
        print("── BIGGEST DIVERGENCES ──")
        for r in sorted(divergences, key=lambda x: -abs(x["delta"])):
            direction = "model sees more upside" if r["delta"] > 0 else "market more bullish"
            print(f"  {r['name']:<20}  "
                  f"model {r['elo_win_prob']:.1%}  "
                  f"market {r['market_win_prob']:.1%}  → {direction}")

    # Save JSON
    output = {
        "generated_at":     datetime.utcnow().isoformat(),
        "market_source":    "prediction_market_odds",
        "simulation_runs":  10000,
        "teams":            rows
    }
    out_path = os.path.join(OUTPUT_DIR, "comparison.json")
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\n  ✓ Saved → output/comparison.json")

    return rows


if __name__ == "__main__":
    print("model/compare.py — call run_comparison(win_probs, current_elo)")
