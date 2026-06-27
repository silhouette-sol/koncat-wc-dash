"""
run.py
Main pipeline runner for the WC 2026 dashboard.
Orchestrates all data fetching, model computation, and analysis.

Usage:
  python run.py

Run this from the wc-dashboard/ root directory.
Outputs land in the output/ folder.

To refresh after new match results:
  python run.py
  (re-runs everything and overwrites output files)
"""

from data.fetch_data         import fetch_historical, fetch_openfootball
from data.fetch_xg           import fetch_xg_data
from data.fetch_squad_values import fetch_squad_values
from model.elo               import compute_base_elo, update_with_wc_results
from model.monte_carlo       import run_simulation
from model.compare           import run_comparison
from analysis.fun_facts      import run_all


def main():
    print("=" * 60)
    print("  WC 2026 DASHBOARD PIPELINE")
    print("=" * 60)

    # ── STEP 1: FETCH ALL DATA ─────────────────────────────────────────────
    print("\n[1/6] Fetching data sources...")
    historical_df            = fetch_historical()
    wc_matches               = fetch_openfootball()
    xg_data                  = fetch_xg_data()
    squad_values, players_df = fetch_squad_values()

    # ── STEP 2: COMPUTE BASE_ELO ───────────────────────────────────────────
    print("\n[2/6] Computing BASE_ELO (squad priors + match history)...")
    base_elo = compute_base_elo(historical_df, squad_values)

    # ── STEP 3: UPDATE WITH WC RESULTS ────────────────────────────────────
    print("\n[3/6] Updating with 2026 WC results + xG blend...")
    current_elo = update_with_wc_results(wc_matches, base_elo, xg_data)

    # ── STEP 4: MONTE CARLO SIMULATION ────────────────────────────────────
    print("\n[4/6] Running Monte Carlo simulation (10,000 runs)...")
    win_probs = run_simulation(wc_matches, current_elo, n=10000)

    # ── STEP 5: MODEL VS MARKET COMPARISON ────────────────────────────────
    print("\n[5/6] Model vs market comparison...")
    run_comparison(win_probs, current_elo, wc_matches=wc_matches)

    # ── STEP 6: DESCRIPTIVE STATS + FUN FACTS ─────────────────────────────
    print("\n[6/6] Computing descriptive stats and fun facts...")
    run_all(
        wc_matches    = wc_matches,
        historical_df = historical_df,
        current_elo   = current_elo,
        base_elo      = base_elo,
        win_probs     = win_probs,
        xg_data       = xg_data,
        players_df    = players_df,
    )

    print("\n" + "=" * 60)
    print("  Pipeline complete. Check output/ for results.")
    print("=" * 60)


if __name__ == "__main__":
    main()
