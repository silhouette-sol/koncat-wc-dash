"""
model/elo.py
Elo rating system for World Cup 2026.

Two-stage computation:
  Stage 1 — compute_base_elo():
    Uses 4 years of historical international results + Transfermarkt
    squad value priors to derive pre-tournament team strength ratings.

  Stage 2 — update_with_wc_results():
    Takes BASE_ELO and updates it with every completed 2026 WC match,
    blending actual results with xG-implied performance (alpha=0.4).

Key design decisions:
  - Squad values as starting priors (not flat 1500)
  - Tournament importance weights (WC = 3x, friendly = 0.5x)
  - Recency decay (recent matches count more)
  - Penalty shootouts treated as draws
  - xG blend in WC updates
"""

import pandas as pd
from collections import defaultdict

# ── NAME NORMALIZATION ─────────────────────────────────────────────────────
NAME_MAP = {
    "United States":                    "USA",
    "Democratic Republic of the Congo": "DR Congo",
    "Côte d'Ivoire":                    "Ivory Coast",
    "Bosnia-Herzegovina":               "Bosnia and Herzegovina",
    "Curacao":                          "Curacao",
    "Curaçao":                          "Curacao",
    "Cabo Verde":                       "Cape Verde",
    "Cape Verde Islands":               "Cape Verde",
    "Korea Republic":                   "South Korea",
}

def normalize_name(name):
    """Convert any known team name variants to our standard name."""
    if not isinstance(name, str):
        return name
    return NAME_MAP.get(name.strip(), name.strip())


# ── TOURNAMENT WEIGHTS ─────────────────────────────────────────────────────
TOURNAMENT_WEIGHTS = {
    "FIFA World Cup":                        3.0,
    "Confederations Cup":                    2.5,
    "UEFA Euro":                             2.0,
    "Copa América":                          2.0,
    "Africa Cup of Nations":                 2.0,
    "AFC Asian Cup":                         2.0,
    "CONCACAF Gold Cup":                     2.0,
    "FIFA World Cup qualification":          2.0,
    "UEFA Euro qualification":               1.5,
    "Copa América qualification":            1.5,
    "Africa Cup of Nations qualification":   1.5,
    "AFC Asian Cup qualification":           1.5,
    "CONCACAF Gold Cup qualification":       1.5,
    "UEFA Nations League":                   1.5,
    "CONCACAF Nations League":               1.5,
    "AFC Asian Qualifiers":                  1.5,
    "Friendly":                              0.5,
}

def get_weight(tournament):
    """Return importance weight for a given tournament name."""
    if pd.isna(tournament):
        return 1.0
    t = str(tournament)
    if t in TOURNAMENT_WEIGHTS:
        return TOURNAMENT_WEIGHTS[t]
    for key, w in TOURNAMENT_WEIGHTS.items():
        if key.lower() in t.lower():
            return w
    return 1.0


# ── PENALTY SHOOTOUT CORRECTIONS ───────────────────────────────────────────
# These matches were level after 120 minutes — decided by a coin flip.
# Treating them as losses misrepresents the actual performance.
SHOOTOUT_DRAWS = {
    ("Croatia",      "Brazil"):          "2022-12-09",
    ("Argentina",    "France"):          "2022-12-18",
    ("Argentina",    "Netherlands"):     "2022-12-09",
    ("Morocco",      "Spain"):           "2022-12-06",
    ("Morocco",      "Portugal"):        "2022-12-10",
    ("Japan",        "Croatia"):         "2022-12-05",
    ("Australia",    "Argentina"):       "2022-12-03",
    ("France",       "Switzerland"):     "2021-06-28",
    ("Spain",        "Switzerland"):     "2021-06-25",
    ("Colombia",     "Uruguay"):         "2021-07-03",
}

def is_shootout(home, away, date):
    """Return True if this match was decided by a penalty shootout."""
    d = str(date)[:10]
    return (
        d == SHOOTOUT_DRAWS.get((home, away)) or
        d == SHOOTOUT_DRAWS.get((away, home))
    )


# ── ELO MATH ───────────────────────────────────────────────────────────────
HOME_ADVANTAGE = 75

def expected_score(ra, rb):
    """Probability team A beats team B given Elo ratings ra, rb."""
    return 1 / (1 + 10 ** ((rb - ra) / 400))

def gd_multiplier(gd):
    """Scale rating update by goal margin. Bigger wins move more."""
    if gd <= 1:   return 1.0
    elif gd == 2: return 1.5
    else:         return 1.75 + (gd - 3) * 0.1

def update_elo(ra, rb, ga, gb, k=32):
    """Update both ratings after one match. Returns (new_ra, new_rb)."""
    sa   = 1.0 if ga > gb else (0.5 if ga == gb else 0.0)
    ea   = expected_score(ra, rb)
    mult = gd_multiplier(abs(ga - gb))
    return (
        ra + k * mult * (sa - ea),
        rb + k * mult * ((1 - sa) - (1 - ea))
    )


# ── SQUAD VALUE PRIOR ──────────────────────────────────────────────────────
def squad_value_to_elo(value, squad_values_dict,
                        min_elo=1350, max_elo=1750):
    """
    Scale squad value (EUR) to an Elo rating range.
    Uses actual min/max from the data — no hardcoded assumptions.
    """
    all_vals   = [v for v in squad_values_dict.values() if v > 0]
    if not all_vals:
        return 1500.0
    min_val    = min(all_vals)
    max_val    = max(all_vals)
    if max_val == min_val:
        return 1500.0
    normalized = (value - min_val) / (max_val - min_val)
    return min_elo + normalized * (max_elo - min_elo)


# ── STAGE 1: COMPUTE BASE_ELO ──────────────────────────────────────────────
def compute_base_elo(historical_df, squad_values,
                     start='2024-01-01', end='2026-06-10'):
    """
    Derive pre-tournament team strength ratings from real data.

    Inputs:
      historical_df  — martj42 dataset (pandas DataFrame)
      squad_values   — Transfermarkt squad values dict {team: eur_value}
      start          — only process matches after this date
      end            — only process matches before this date (WC start)

    Returns:
      BASE_ELO dict: {team_name: elo_rating}
    """
    filtered = historical_df[
        (historical_df['date'] >= pd.Timestamp(start)) &
        (historical_df['date'] <= pd.Timestamp(end))
    ].copy().sort_values('date')

    print(f"  Computing BASE_ELO from {len(filtered):,} matches ({start} → {end})")

    # Start from squad value priors instead of flat 1500
    elo = defaultdict(lambda: 1400.0)
    for team, value in squad_values.items():
        if value > 0:
            elo[team] = squad_value_to_elo(value, squad_values)

    for _, row in filtered.iterrows():
        home = normalize_name(row['home_team'])
        away = normalize_name(row['away_team'])

        if pd.isna(row['home_score']) or pd.isna(row['away_score']):
            continue

        hg, ag = int(row['home_score']), int(row['away_score'])
        ra, rb = elo[home], elo[away]

        is_neutral   = row.get('neutral', False)
        ra_effective = ra if is_neutral else ra + HOME_ADVANTAGE
        ea           = expected_score(ra_effective, rb)

        if is_shootout(home, away, row['date']):
            sa = 0.5
        else:
            sa = 1.0 if hg > ag else (0.5 if hg == ag else 0.0)

        weight   = get_weight(row.get('tournament', ''))
        mult     = gd_multiplier(abs(hg - ag))
        days_ago = (pd.Timestamp('2026-06-10') - row['date']).days
        decay    = 0.997 ** days_ago
        k        = 32 * weight * mult * decay

        elo[home] = ra + k * (sa - ea)
        elo[away] = rb + k * ((1 - sa) - (1 - ea))

    result = dict(elo)
    print(f"  ✓ BASE_ELO computed for {len(result)} teams")
    return result


# ── STAGE 2: UPDATE WITH WC RESULTS ───────────────────────────────────────
def update_with_wc_results(wc_matches, base_elo, xg_data, alpha=0.4):
    """
    Update BASE_ELO with completed 2026 World Cup results.
    Blends actual result with xG-implied performance.

    alpha = 0.4:
      60% actual scoreline + 40% xG signal

    Inputs:
      wc_matches  — list of match dicts from openfootball
      base_elo    — output of compute_base_elo()
      xg_data     — dict from fetch_xg_data(), can be empty
      alpha       — xG blend weight (0=pure score, 1=pure xG)

    Returns:
      current_elo dict: {team_name: elo_rating}
    """
    elo      = dict(base_elo)
    done     = sorted(
        [m for m in wc_matches if m.get('score')],
        key=lambda m: m['date']
    )
    xg_used  = 0
    xg_miss  = 0

    for m in done:
        t1 = normalize_name(m['team1'])
        t2 = normalize_name(m['team2'])
        g1, g2 = m['score']['ft']
        r1 = elo.get(t1, 1500)
        r2 = elo.get(t2, 1500)

        # Actual result (shootouts = draw)
        if is_shootout(t1, t2, m['date']):
            actual_sa = 0.5
        else:
            actual_sa = 1.0 if g1 > g2 else (0.5 if g1 == g2 else 0.0)

        # xG signal
        xg_pair    = xg_data.get((t1, t2))
        is_flipped = False
        if not xg_pair:
            xg_pair    = xg_data.get((t2, t1))
            is_flipped = True

        if xg_pair:
            hxg, axg = xg_pair
            if is_flipped:
                hxg, axg = axg, hxg
            if hxg > axg + 0.3:   xg_sa = 1.0
            elif axg > hxg + 0.3: xg_sa = 0.0
            else:                  xg_sa = 0.5
            blended_sa = (1 - alpha) * actual_sa + alpha * xg_sa
            xg_used   += 1
        else:
            blended_sa = actual_sa
            xg_miss   += 1

        ea   = expected_score(r1, r2)
        mult = gd_multiplier(abs(g1 - g2))
        k    = 32 * mult

        elo[t1] = r1 + k * (blended_sa - ea)
        elo[t2] = r2 + k * ((1 - blended_sa) - (1 - ea))

    print(f"  ✓ Updated with {len(done)} WC matches "
          f"(xG: {xg_used} matches | score only: {xg_miss})")
    return elo


if __name__ == "__main__":
    print("model/elo.py — import and call compute_base_elo() and update_with_wc_results()")
    print("Example: expected_score(1900, 1700) =", round(expected_score(1900, 1700), 3))
