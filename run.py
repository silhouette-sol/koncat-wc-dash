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

    # ── STEP 7: Predictions tracking ──────────────────────────────────────
    import json as _json, os as _os
    from datetime import date as _date

    print("\n[7/7] Updating predictions tracking...")
    predictions_path = "output/predictions.json"
    predictions = []
    if _os.path.exists(predictions_path):
        with open(predictions_path) as f:
            predictions = _json.load(f)
    existing_keys = {(p["match"], p["date"]) for p in predictions}

    prior_comp_teams = {}
    if _os.path.exists("output/comparison.json"):
        with open("output/comparison.json") as f:
            prior = _json.load(f)
        prior_comp_teams = {t["name"]: t.get("elo_win_prob", 0) for t in prior.get("teams", [])}

    wc_data_raw = _json.load(open("data/worldcup.json"))
    wc_raw_matches = wc_data_raw.get("matches", [])
    for m in wc_raw_matches:
        if not m.get("score"):
            continue
        match_key = f"{m['team1']} vs {m['team2']}"
        match_date = m.get("date", "")
        if (match_key, match_date) in existing_keys:
            continue
        p1 = prior_comp_teams.get(m["team1"], 0)
        p2 = prior_comp_teams.get(m["team2"], 0)
        if p1 == 0 and p2 == 0:
            continue
        predicted = m["team1"] if p1 >= p2 else m["team2"]
        ft = m["score"]["ft"]
        if ft[0] > ft[1]:
            actual = m["team1"]
        elif ft[1] > ft[0]:
            actual = m["team2"]
        else:
            actual = "draw"
        predictions.append({
            "match": match_key,
            "date": match_date,
            "predicted_winner": predicted,
            "actual_winner": actual,
            "predicted_prob": round(max(p1, p2), 4),
            "correct": predicted == actual,
        })
    with open(predictions_path, "w") as f:
        _json.dump(predictions, f, indent=2)
    print(f"  ✓ Predictions tracking: {len(predictions)} total entries")

    # ── STEP 8: Supabase snapshot ──────────────────────────────────────────
    print("\n[8/7] Storing daily snapshot to Supabase...")
    from data.store_snapshot import store_daily_snapshot
    with open("output/comparison.json") as f:
        comparison_data = _json.load(f)
    with open("output/descriptive.json") as f:
        descriptive_data = _json.load(f)
    store_daily_snapshot(comparison_data, descriptive_data, current_elo)

    print("\n" + "=" * 60)
    print("  Pipeline complete. Check output/ for results.")
    print("=" * 60)


if __name__ == "__main__":
    main()
