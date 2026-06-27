"""
fetch_squad_values.py
Fetches player market values from the transfermarkt-datasets CDN.
Groups players by national team, takes top 26 by market value
(matching World Cup squad size), sums their values.

Returns:
  squad_values  — dict: {team_name: total_squad_value_eur}
  players_df    — full DataFrame (used for squad age analysis in fun_facts)

Falls back to kagglehub if the CDN is unreachable.
"""

import requests
import pandas as pd
import json
import gzip
import io
import os

DATA_DIR = os.path.dirname(os.path.abspath(__file__))

PLAYERS_URL = (
    "https://pub-e682421888d945d684bcae8890b0ec20"
    ".r2.dev/data/players.csv.gz"
)

# Transfermarkt country names → our standard names
TM_NAME_MAP = {
    "United States":                    "USA",
    "Côte d'Ivoire":                    "Ivory Coast",
    "Bosnia-Herzegovina":               "Bosnia and Herzegovina",
    "DR Congo":                         "DR Congo",
    "Democratic Republic of Congo":     "DR Congo",
    "Korea, South":                     "South Korea",
    "Cape Verde Islands":               "Cape Verde",
    "Curacao":                          "Curacao",
    "Curaçao":                          "Curacao",
}


def normalize_tm_name(name):
    if not isinstance(name, str):
        return name
    return TM_NAME_MAP.get(name.strip(), name.strip())


def fetch_squad_values(squad_size=26):
    """
    Fetch player data and compute squad values per national team.
    Returns (squad_values_dict, players_df).
    """
    print("Fetching player market values from Transfermarkt...")

    try:
        resp = requests.get(PLAYERS_URL, timeout=30)
        if resp.status_code != 200:
            raise Exception(f"HTTP {resp.status_code}")

        compressed   = io.BytesIO(resp.content)
        decompressed = gzip.GzipFile(fileobj=compressed)
        players_df   = pd.read_csv(decompressed, low_memory=False)
        print(f"  ✓ {len(players_df):,} players loaded from CDN")

    except Exception as e:
        print(f"  ⚠ CDN fetch failed: {e}")
        print("  → Trying kagglehub fallback...")
        try:
            import kagglehub
            path       = kagglehub.dataset_download(
                "davidcariboo/player-scores", path="players.csv"
            )
            players_df = pd.read_csv(path, low_memory=False)
            print(f"  ✓ {len(players_df):,} players loaded from kagglehub")
        except Exception as e2:
            print(f"  ✗ kagglehub also failed: {e2}")
            print("  → Returning empty squad values — BASE_ELO will use flat 1500 starts")
            return {}, pd.DataFrame()

    squad_values = _compute_squad_values(players_df, squad_size)

    # Cache to data/
    cache_path = os.path.join(DATA_DIR, "squad_values.json")
    with open(cache_path, "w") as f:
        json.dump(squad_values, f, indent=2)

    # Also save to output/ for frontend consumption
    out_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..", "output", "squad_values.json"
    )
    with open(out_path, "w") as f:
        json.dump(squad_values, f, indent=2)
    print(f"  ✓ squad_values.json saved")

    print(f"  ✓ Squad values computed for {len(squad_values)} countries")
    return squad_values, players_df


def _compute_squad_values(players_df, squad_size=26):
    """
    Internal: group players by country, take top N by market value, sum.
    """
    df = players_df[
        players_df['market_value_in_eur'].notna() &
        (players_df['market_value_in_eur'] > 0) &
        players_df['country_of_citizenship'].notna()
    ].copy()

    df['team'] = df['country_of_citizenship'].apply(normalize_tm_name)

    return (
        df.sort_values('market_value_in_eur', ascending=False)
          .groupby('team')
          .head(squad_size)
          .groupby('team')['market_value_in_eur']
          .sum()
          .to_dict()
    )


if __name__ == "__main__":
    squad_values, players_df = fetch_squad_values()
    print(f"\nTop 10 squad values:")
    for team, val in sorted(squad_values.items(), key=lambda x: -x[1])[:10]:
        print(f"  {team:<25} €{val/1e6:.0f}M")
