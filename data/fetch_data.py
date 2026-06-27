"""
fetch_data.py
Fetches and caches both primary data sources:
  - martj42 historical international results (49,000+ matches)
  - openfootball 2026 World Cup match data (live, updates as games are played)
"""

import requests
import pandas as pd
import json
import os

DATA_DIR = os.path.dirname(os.path.abspath(__file__))

RESULTS_URL = (
    "https://raw.githubusercontent.com/martj42/"
    "international_results/master/results.csv"
)
WC_URL = (
    "https://raw.githubusercontent.com/openfootball/"
    "worldcup.json/master/2026/worldcup.json"
)


def fetch_historical():
    """
    Fetch 49,000+ international match results from martj42's dataset.
    Returns a pandas DataFrame with columns:
      date, home_team, away_team, home_score, away_score, tournament, neutral
    """
    print("Fetching historical international match data...")
    df = pd.read_csv(RESULTS_URL)
    df['date'] = pd.to_datetime(df['date'])
    print(f"  ✓ {len(df):,} matches loaded ({df['date'].min().year}–{df['date'].max().year})")
    return df


def fetch_openfootball():
    """
    Fetch live 2026 World Cup match data from openfootball.
    Returns a list of match dicts. Re-run to get latest results.
    Each match has: team1, team2, score (if played), goals1, goals2,
    round, group, date, ground.
    """
    print("Fetching 2026 World Cup match data...")
    data = requests.get(WC_URL, timeout=10).json()
    matches   = data.get('matches', [])
    completed = [m for m in matches if m.get('score')]

    # Cache locally so we can inspect the raw data
    cache_path = os.path.join(DATA_DIR, "worldcup.json")
    with open(cache_path, "w") as f:
        json.dump(data, f, indent=2)

    print(f"  ✓ {len(matches)} total matches | {len(completed)} completed")
    return matches


if __name__ == "__main__":
    historical_df = fetch_historical()
    wc_matches    = fetch_openfootball()
    print(f"\nExample match:")
    completed = [m for m in wc_matches if m.get('score')]
    print(json.dumps(completed[0], indent=2))
