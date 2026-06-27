# WC 2026 Dashboard — Data Pipeline

World Cup 2026 win probability model comparing Elo-based predictions
against Polymarket/Kalshi prediction markets.

## Setup

```bash
pip install -r requirements.txt
```

## Run

```bash
python run.py
```

Re-run after every matchday to refresh all outputs.

## Project Structure

```
wc-dashboard/
  data/
    fetch_data.py         # openfootball + martj42 historical data
    fetch_xg.py           # xG from FBRef
    fetch_squad_values.py # Transfermarkt player market values
  model/
    elo.py                # Elo ratings (BASE_ELO + WC updates)
    monte_carlo.py        # 10,000-run tournament simulation
    compare.py            # model vs market comparison table
  analysis/
    fun_facts.py          # golden boot, xG efficiency, upsets, etc.
  output/
    comparison.json       # win probs + model vs market deltas
    descriptive.json      # golden boot, clean sheets, goal timing, etc.
    fun_facts.json        # historical patterns, quirky angles
  run.py                  # main pipeline orchestrator
  requirements.txt
```

## Data Sources

| Source | What it provides | Cost |
|--------|-----------------|------|
| openfootball (GitHub) | Live WC 2026 match results | Free |
| martj42 (GitHub) | 49,000+ historical international results | Free |
| FBRef | xG for every WC match | Free (scraped) |
| Transfermarkt CDN | Player market values | Free |
| Kalshi/FanDuel | Market win probabilities (hardcoded snapshot) | Free |

## Refresh Schedule

After each matchday: `python run.py`

Cells 2A/2B (squad values + BASE_ELO) only need re-running if
significant squad changes have occurred (injuries, suspensions).
