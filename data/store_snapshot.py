from datetime import date
import os

def store_daily_snapshot(comparison_data, descriptive_data, elo_ratings):
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY")

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("  ⚠ Supabase credentials not found — skipping snapshot")
        return

    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    today = date.today().isoformat()

    print("  Storing daily probability snapshot...")
    prob_rows = []
    for team in comparison_data.get("teams", []):
        prob_rows.append({
            "snapshot_date":   today,
            "team":            team["name"],
            "elo_rating":      team.get("elo_rating"),
            "model_win_prob":  team.get("elo_win_prob"),
            "market_win_prob": team.get("market_win_prob"),
            "delta":           team.get("delta"),
            "signal":          team.get("signal"),
        })
    if prob_rows:
        supabase.table("daily_snapshots").upsert(
            prob_rows, on_conflict="snapshot_date,team"
        ).execute()
        print(f"  ✓ {len(prob_rows)} team snapshots stored")

    print("  Storing golden boot snapshot...")
    boot_rows = []
    for player in descriptive_data.get("golden_boot", []):
        boot_rows.append({
            "snapshot_date": today,
            "player":        player["player"],
            "team":          player["team"],
            "goals":         player["goals"],
        })
    if boot_rows:
        supabase.table("golden_boot_snapshots").upsert(
            boot_rows, on_conflict="snapshot_date,player"
        ).execute()
        print(f"  ✓ {len(boot_rows)} golden boot entries stored")

    print("  Storing Elo rating snapshot...")
    elo_rows = [
        {"snapshot_date": today, "team": team, "elo_rating": round(rating, 2)}
        for team, rating in elo_ratings.items()
        if rating > 0
    ]
    if elo_rows:
        supabase.table("elo_snapshots").upsert(
            elo_rows, on_conflict="snapshot_date,team"
        ).execute()
        print(f"  ✓ {len(elo_rows)} Elo snapshots stored")
