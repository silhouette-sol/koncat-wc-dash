"""
analysis/fun_facts.py
Computes all descriptive statistics and fun fact analyses.
All reference data (QUIRKY_TEAMS, COLOR_WINS) is inline as Python
dicts. When the full VS Code pipeline is built, these move to
data/quirky_data.json and get loaded from there.

Outputs:
  output/descriptive.json  — chart-ready data for the dashboard
  output/fun_facts.json    — daily story content for social media
"""

import json
import os
import pandas as pd
from collections import defaultdict
from datetime import datetime

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)


# ── REFERENCE DATA (inline — moves to quirky_data.json in production) ─────
QUIRKY_TEAMS = {
    "France":       {"continent":"Europe",        "jersey":"blue",             "wc_wins":2, "population_millions":68.4,  "coach":"Didier Deschamps",    "coach_nat":"French"},
    "Brazil":       {"continent":"South America", "jersey":"yellow",           "wc_wins":5, "population_millions":215.3, "coach":"Dorival Junior",      "coach_nat":"Brazilian"},
    "Argentina":    {"continent":"South America", "jersey":"blue_white",       "wc_wins":3, "population_millions":46.2,  "coach":"Lionel Scaloni",      "coach_nat":"Argentine"},
    "Spain":        {"continent":"Europe",        "jersey":"red",              "wc_wins":1, "population_millions":47.4,  "coach":"Luis de la Fuente",   "coach_nat":"Spanish"},
    "England":      {"continent":"Europe",        "jersey":"white",            "wc_wins":1, "population_millions":56.5,  "coach":"Thomas Tuchel",       "coach_nat":"German"},
    "Germany":      {"continent":"Europe",        "jersey":"white",            "wc_wins":4, "population_millions":84.1,  "coach":"Julian Nagelsmann",   "coach_nat":"German"},
    "Portugal":     {"continent":"Europe",        "jersey":"red",              "wc_wins":0, "population_millions":10.3,  "coach":"Roberto Martinez",    "coach_nat":"Spanish"},
    "Netherlands":  {"continent":"Europe",        "jersey":"orange",           "wc_wins":0, "population_millions":17.9,  "coach":"Ronald Koeman",       "coach_nat":"Dutch"},
    "Belgium":      {"continent":"Europe",        "jersey":"red",              "wc_wins":0, "population_millions":11.6,  "coach":"Domenico Tedesco",    "coach_nat":"Italian"},
    "Colombia":     {"continent":"South America", "jersey":"yellow",           "wc_wins":0, "population_millions":51.9,  "coach":"Néstor Lorenzo",      "coach_nat":"Argentine"},
    "Uruguay":      {"continent":"South America", "jersey":"sky_blue",         "wc_wins":2, "population_millions":3.5,   "coach":"Marcelo Bielsa",      "coach_nat":"Argentine"},
    "Japan":        {"continent":"Asia",          "jersey":"blue",             "wc_wins":0, "population_millions":125.7, "coach":"Hajime Moriyasu",     "coach_nat":"Japanese"},
    "Morocco":      {"continent":"Africa",        "jersey":"red",              "wc_wins":0, "population_millions":37.5,  "coach":"Walid Regragui",      "coach_nat":"Moroccan"},
    "USA":          {"continent":"North America", "jersey":"white",            "wc_wins":0, "population_millions":335.9, "coach":"Mauricio Pochettino", "coach_nat":"Argentine"},
    "Mexico":       {"continent":"North America", "jersey":"green",            "wc_wins":0, "population_millions":130.2, "coach":"Javier Aguirre",      "coach_nat":"Mexican"},
    "Norway":       {"continent":"Europe",        "jersey":"red",              "wc_wins":0, "population_millions":5.5,   "coach":"Ståle Solbakken",     "coach_nat":"Norwegian"},
    "Sweden":       {"continent":"Europe",        "jersey":"yellow",           "wc_wins":0, "population_millions":10.5,  "coach":"Jon Dahl Tomasson",   "coach_nat":"Danish"},
    "Australia":    {"continent":"Oceania",       "jersey":"yellow",           "wc_wins":0, "population_millions":26.5,  "coach":"Tony Popovic",        "coach_nat":"Australian"},
    "South Korea":  {"continent":"Asia",          "jersey":"red",              "wc_wins":0, "population_millions":51.7,  "coach":"Hong Myung-bo",       "coach_nat":"South Korean"},
    "Ecuador":      {"continent":"South America", "jersey":"yellow",           "wc_wins":0, "population_millions":18.0,  "coach":"Sebastián Beccacece", "coach_nat":"Argentine"},
    "Senegal":      {"continent":"Africa",        "jersey":"white",            "wc_wins":0, "population_millions":17.9,  "coach":"Aliou Cissé",         "coach_nat":"Senegalese"},
    "Ghana":        {"continent":"Africa",        "jersey":"white",            "wc_wins":0, "population_millions":33.5,  "coach":"Carlos Queiroz",      "coach_nat":"Portuguese"},
    "Croatia":      {"continent":"Europe",        "jersey":"red_white_checks", "wc_wins":0, "population_millions":3.9,   "coach":"Zlatko Dalić",        "coach_nat":"Croatian"},
    "Canada":       {"continent":"North America", "jersey":"red",              "wc_wins":0, "population_millions":38.9,  "coach":"Jesse Marsch",        "coach_nat":"American"},
    "Switzerland":  {"continent":"Europe",        "jersey":"red",              "wc_wins":0, "population_millions":8.7,   "coach":"Murat Yakin",         "coach_nat":"Swiss"},
    "Austria":      {"continent":"Europe",        "jersey":"red",              "wc_wins":0, "population_millions":9.1,   "coach":"Ralf Rangnick",       "coach_nat":"German"},
    "Algeria":      {"continent":"Africa",        "jersey":"white",            "wc_wins":0, "population_millions":45.6,  "coach":"Vladimir Petkovic",   "coach_nat":"Swiss"},
    "Turkey":       {"continent":"Europe",        "jersey":"red",              "wc_wins":0, "population_millions":85.3,  "coach":"Vincenzo Montella",   "coach_nat":"Italian"},
    "Scotland":     {"continent":"Europe",        "jersey":"blue",             "wc_wins":0, "population_millions":5.5,   "coach":"Steve Clarke",        "coach_nat":"Scottish"},
    "Paraguay":     {"continent":"South America", "jersey":"red_white",        "wc_wins":0, "population_millions":7.4,   "coach":"Gustavo Alfaro",      "coach_nat":"Argentine"},
    "Saudi Arabia": {"continent":"Asia",          "jersey":"green",            "wc_wins":0, "population_millions":36.4,  "coach":"Roberto Mancini",     "coach_nat":"Italian"},
    "Cape Verde":   {"continent":"Africa",        "jersey":"blue",             "wc_wins":0, "population_millions":0.6,   "coach":"Pedro Leitão Brito",  "coach_nat":"Cape Verdean"},
    "Cabo Verde":   {"continent":"Africa",        "jersey":"blue",             "wc_wins":0, "population_millions":0.6,   "coach":"Pedro Leitão Brito",  "coach_nat":"Cape Verdean"},
    "Tunisia":      {"continent":"Africa",        "jersey":"red",              "wc_wins":0, "population_millions":12.0,  "coach":"Jalel Kadri",         "coach_nat":"Tunisian"},
    "Ivory Coast":  {"continent":"Africa",        "jersey":"orange",           "wc_wins":0, "population_millions":27.5,  "coach":"Emerse Faé",          "coach_nat":"Ivorian"},
    "Egypt":        {"continent":"Africa",        "jersey":"red",              "wc_wins":0, "population_millions":105.9, "coach":"Hossam Hassan",       "coach_nat":"Egyptian"},
    "Iran":         {"continent":"Asia",          "jersey":"white",            "wc_wins":0, "population_millions":87.9,  "coach":"Amir Ghalenoei",      "coach_nat":"Iranian"},
    "New Zealand":  {"continent":"Oceania",       "jersey":"white",            "wc_wins":0, "population_millions":5.1,   "coach":"Darren Bazeley",      "coach_nat":"New Zealander"},
    "DR Congo":     {"continent":"Africa",        "jersey":"blue",             "wc_wins":0, "population_millions":102.3, "coach":"Sébastien Desabre",   "coach_nat":"French"},
    "Bosnia and Herzegovina": {"continent":"Europe","jersey":"blue",           "wc_wins":0, "population_millions":3.3,   "coach":"Sergej Barbarez",     "coach_nat":"Bosnian"},
    "Qatar":        {"continent":"Asia",          "jersey":"maroon",           "wc_wins":0, "population_millions":2.9,   "coach":"Marquez Lopez",       "coach_nat":"Spanish"},
    "Iraq":         {"continent":"Asia",          "jersey":"green",            "wc_wins":0, "population_millions":43.5,  "coach":"Jesus Casas",         "coach_nat":"Spanish"},
    "Jordan":       {"continent":"Asia",          "jersey":"white",            "wc_wins":0, "population_millions":10.3,  "coach":"Hussein Ammouta",     "coach_nat":"Moroccan"},
    "Haiti":        {"continent":"North America", "jersey":"blue",             "wc_wins":0, "population_millions":11.7,  "coach":"Marc Collat",         "coach_nat":"French"},
    "Panama":       {"continent":"North America", "jersey":"red",              "wc_wins":0, "population_millions":4.4,   "coach":"Thomas Christiansen", "coach_nat":"Danish"},
    "South Africa": {"continent":"Africa",        "jersey":"yellow",           "wc_wins":0, "population_millions":60.4,  "coach":"Hugo Broos",          "coach_nat":"Belgian"},
    "Czech Republic":{"continent":"Europe",       "jersey":"red",              "wc_wins":0, "population_millions":10.9,  "coach":"Ivan Hasek",          "coach_nat":"Czech"},
    "Curacao":      {"continent":"North America", "jersey":"blue",             "wc_wins":0, "population_millions":0.19,  "coach":"Remko Bicentini",     "coach_nat":"Dutch"},
    "Curaçao":      {"continent":"North America", "jersey":"blue",             "wc_wins":0, "population_millions":0.19,  "coach":"Remko Bicentini",     "coach_nat":"Dutch"},
    "Uzbekistan":   {"continent":"Asia",          "jersey":"white",            "wc_wins":0, "population_millions":36.5,  "coach":"Srecko Katanec",      "coach_nat":"Slovenian"},
}

COLOR_WINS = {
    "yellow":           {"wins": 5, "winners": ["Brazil x5"]},
    "white":            {"wins": 5, "winners": ["Germany x4", "England x1"]},
    "blue":             {"wins": 4, "winners": ["France x2", "Uruguay x2"]},
    "blue_white":       {"wins": 3, "winners": ["Argentina x3"]},
    "red":              {"wins": 1, "winners": ["Spain x1"]},
    "orange":           {"wins": 0, "winners": []},
    "green":            {"wins": 0, "winners": []},
    "sky_blue":         {"wins": 0, "winners": []},
    "red_white_checks": {"wins": 0, "winners": []},
    "maroon":           {"wins": 0, "winners": []},
}


# ── ANALYSIS FUNCTIONS ─────────────────────────────────────────────────────

def compute_golden_boot(wc_matches):
    scorers = defaultdict(lambda: {"goals":0,"team":"","minutes":[],"matches":set()})
    for m in wc_matches:
        if not m.get("score"): continue
        for side, team in [("goals1", m["team1"]), ("goals2", m["team2"])]:
            for goal in m.get(side, []):
                if goal.get("owngoal"): continue
                name = goal.get("name", "Unknown")
                scorers[name]["goals"]   += 1
                scorers[name]["team"]     = team
                scorers[name]["minutes"].append(goal.get("minute", "?"))
                scorers[name]["matches"].add(m.get("date", ""))
    return sorted([
        {"player": p, "team": d["team"], "goals": d["goals"],
         "matches_scored_in": len(d["matches"]), "minutes": d["minutes"]}
        for p, d in scorers.items()
    ], key=lambda x: -x["goals"])


def compute_excitement(wc_matches, xg_data=None):
    matches = []
    for m in wc_matches:
        if not m.get("score"): continue
        g1, g2 = m["score"]["ft"]
        t1, t2 = m["team1"], m["team2"]
        xg_total = None
        if xg_data:
            pair = xg_data.get((t1,t2)) or xg_data.get((t2,t1))
            if pair: xg_total = round(pair[0]+pair[1], 2)
        matches.append({
            "match": f"{t1} vs {t2}", "score": f"{g1}-{g2}",
            "date": m.get("date"), "group": m.get("group", "Knockout"),
            "total_goals": g1+g2, "xg_total": xg_total,
            "excitement": round((g1+g2) + (xg_total*0.3 if xg_total else 0), 2)
        })
    return sorted(matches, key=lambda x: -x["excitement"])


def compute_xg_efficiency(wc_matches, xg_data):
    team_goals = defaultdict(int)
    team_xg    = defaultdict(float)
    for m in wc_matches:
        if not m.get("score"): continue
        t1,t2 = m["team1"],m["team2"]; g1,g2 = m["score"]["ft"]
        team_goals[t1]+=g1; team_goals[t2]+=g2
        pair = xg_data.get((t1,t2)) or xg_data.get((t2,t1))
        if pair:
            hxg,axg = pair if xg_data.get((t1,t2)) else (pair[1],pair[0])
            team_xg[t1]+=hxg; team_xg[t2]+=axg
    result = []
    for team in set(list(team_goals)+list(team_xg)):
        goals = team_goals.get(team,0); xgf = team_xg.get(team,0)
        eff   = round(goals/xgf,2) if xgf>0 else None
        result.append({
            "team": team, "goals": goals, "xg_for": round(xgf,2),
            "efficiency": eff,
            "label": ("clinical" if eff and eff>1.15 else
                      "wasteful" if eff and eff<0.85 else "on track")
        })
    return sorted(result, key=lambda x: -(x["efficiency"] or 0))


def compute_clean_sheets(wc_matches):
    cs = defaultdict(int); games = defaultdict(int)
    for m in wc_matches:
        if not m.get("score"): continue
        t1,t2=m["team1"],m["team2"]; g1,g2=m["score"]["ft"]
        games[t1]+=1; games[t2]+=1
        if g2==0: cs[t1]+=1
        if g1==0: cs[t2]+=1
    result = [{"team":t,"clean_sheets":cs.get(t,0),"games":games[t],
                "cs_rate":round(cs.get(t,0)/games[t],2)} for t in games]
    return sorted(result, key=lambda x: (-x["clean_sheets"],-x["cs_rate"]))


def compute_goal_timing(wc_matches):
    bins = {"0-15":0,"16-30":0,"31-45":0,"46-60":0,"61-75":0,"76-90":0,"90+":0}
    for m in wc_matches:
        if not m.get("score"): continue
        for side in ["goals1","goals2"]:
            for goal in m.get(side,[]):
                if goal.get("owngoal"): continue
                try:
                    ms = str(goal.get("minute","0"))
                    minute = 90 if "+" in ms else int(ms.replace("'","").strip())
                    if minute<=15:   bins["0-15"]+=1
                    elif minute<=30: bins["16-30"]+=1
                    elif minute<=45: bins["31-45"]+=1
                    elif minute<=60: bins["46-60"]+=1
                    elif minute<=75: bins["61-75"]+=1
                    elif minute<=90: bins["76-90"]+=1
                    else:            bins["90+"]+=1
                except: pass
    return {"bins":bins,"total_goals":sum(bins.values()),
            "most_productive_period":max(bins,key=bins.get)}


def compute_upsets(wc_matches, base_elo):
    from model.elo import expected_score, normalize_name
    upsets = []
    for m in wc_matches:
        if not m.get("score"): continue
        t1,t2=normalize_name(m["team1"]),normalize_name(m["team2"])
        g1,g2=m["score"]["ft"]
        r1=base_elo.get(t1,1500); r2=base_elo.get(t2,1500)
        p1=expected_score(r1,r2)
        if g1>g2:   result=f"{t1} win"; surprise=1-p1
        elif g2>g1: result=f"{t2} win"; surprise=p1
        else:       result="draw";      surprise=abs(p1-0.5)*0.7
        upsets.append({
            "match":f"{t1} vs {t2}","score":f"{g1}-{g2}",
            "date":m.get("date"),"result":result,
            "t1_elo":round(r1),"t2_elo":round(r2),
            "t1_win_prob":round(p1,3),"surprise_score":round(surprise,3)
        })
    return sorted(upsets, key=lambda x: -x["surprise_score"])


def compute_elo_movers(base_elo, current_elo, wc_teams):
    movers = []
    for team in wc_teams:
        pre  = base_elo.get(team, 1500)
        curr = current_elo.get(team, 1500)
        movers.append({
            "team":team,"pre_wc":round(pre),"current":round(curr),
            "change":round(curr-pre),
            "direction":"up" if curr>pre else "down" if curr<pre else "flat"
        })
    return sorted(movers, key=lambda x: -x["change"])


def compute_opponent_strength(wc_matches, current_elo):
    from model.elo import normalize_name
    opp = defaultdict(list)
    for m in wc_matches:
        if not m.get("score"): continue
        t1,t2=normalize_name(m["team1"]),normalize_name(m["team2"])
        opp[t1].append(current_elo.get(t2,1500))
        opp[t2].append(current_elo.get(t1,1500))
    result = [{"team":t,"avg_opp_elo":round(sum(v)/len(v)),"games":len(v)}
              for t,v in opp.items()]
    return sorted(result, key=lambda x: -x["avg_opp_elo"])


def compute_comebacks(wc_matches):
    comebacks = []
    for m in wc_matches:
        if not m.get("score"): continue
        t1,t2=m["team1"],m["team2"]; g1,g2=m["score"]["ft"]
        events = []
        for goal in m.get("goals1",[]):
            if not goal.get("owngoal"):
                try:
                    ms=str(goal.get("minute","0"))
                    minute=90 if "+" in ms else int(ms.replace("'",""))
                    events.append({"team":t1,"minute":minute})
                except: pass
        for goal in m.get("goals2",[]):
            if not goal.get("owngoal"):
                try:
                    ms=str(goal.get("minute","0"))
                    minute=90 if "+" in ms else int(ms.replace("'",""))
                    events.append({"team":t2,"minute":minute})
                except: pass
        events.sort(key=lambda x: x["minute"])
        score={t1:0,t2:0}; was_losing={t1:False,t2:False}
        for event in events:
            scorer=event["team"]; other=t2 if scorer==t1 else t1
            score[scorer]+=1
            if score[other]>score[scorer]-1: was_losing[scorer]=True
        for team in [t1,t2]:
            other=t2 if team==t1 else t1
            if was_losing[team] and score[team]>=score[other]:
                result="comeback win" if score[team]>score[other] else "comeback draw"
                comebacks.append({"team":team,"match":f"{t1} vs {t2}",
                    "score":f"{g1}-{g2}","date":m.get("date"),"result":result})
    return comebacks


def compute_xg_totals(wc_matches, xg_data):
    totals = defaultdict(lambda:{"xg_for":0.0,"xg_against":0.0,"games":0})
    for m in wc_matches:
        if not m.get("score"): continue
        t1,t2=m["team1"],m["team2"]
        pair=xg_data.get((t1,t2)) or xg_data.get((t2,t1))
        if pair:
            hxg,axg=pair if xg_data.get((t1,t2)) else (pair[1],pair[0])
            totals[t1]["xg_for"]+=hxg; totals[t1]["xg_against"]+=axg
            totals[t2]["xg_for"]+=axg; totals[t2]["xg_against"]+=hxg
        totals[t1]["games"]+=1; totals[t2]["games"]+=1
    result=[]
    for team,data in totals.items():
        xgf=round(data["xg_for"],2); xga=round(data["xg_against"],2)
        result.append({
            "team":team,"games":data["games"],"xg_for":xgf,"xg_against":xga,
            "xg_diff":round(xgf-xga,2),
            "xg_for_pg":round(xgf/data["games"],2) if data["games"]>0 else 0,
            "xg_against_pg":round(xga/data["games"],2) if data["games"]>0 else 0
        })
    return sorted(result, key=lambda x: -x["xg_diff"])


def compute_squad_ages(players_df, wc_teams, reference_date="2026-06-11"):
    if players_df is None or len(players_df) == 0:
        return []
    name_map={"United States":"USA","Côte d'Ivoire":"Ivory Coast",
               "Bosnia-Herzegovina":"Bosnia and Herzegovina","Cape Verde Islands":"Cape Verde"}
    ref=pd.Timestamp(reference_date)
    df=players_df[players_df['market_value_in_eur'].notna()&
                  players_df['date_of_birth'].notna()&
                  (players_df['market_value_in_eur']>0)].copy()
    df['dob']=pd.to_datetime(df['date_of_birth'],errors='coerce')
    df['age']=(ref-df['dob']).dt.days/365.25
    df['team']=df['country_of_citizenship'].apply(lambda x: name_map.get(x,x))
    result=[]
    for team in wc_teams:
        top26=df[df['team']==team].sort_values('market_value_in_eur',ascending=False).head(26)
        if len(top26)>0:
            avg=round(top26['age'].mean(),1)
            result.append({"team":team,"avg_age":avg,"players":len(top26),
                "peak_window":"prime" if 24<=avg<=29 else "young" if avg<24 else "veteran"})
    return sorted(result, key=lambda x: x["avg_age"])


def compute_historical_patterns(historical_df):
    wc_hist=historical_df[
        historical_df['tournament'].str.contains("FIFA World Cup",na=False)&
        ~historical_df['tournament'].str.contains("qualif",case=False,na=False)
    ].copy()
    if len(wc_hist)==0:
        return []
    total=len(wc_hist)
    scored=wc_hist.dropna(subset=['home_score','away_score'])
    home_wins=len(scored[scored['home_score']>scored['away_score']])
    avg_goals=round((scored['home_score'].astype(float)+
                     scored['away_score'].astype(float)).mean(),2)
    best_color=max(COLOR_WINS.items(),key=lambda x:x[1]["wins"])
    return [
        {"id":"home_advantage","value":round(home_wins/total*100,1),
         "display":f"Home teams win {round(home_wins/total*100,1)}% of WC matches"},
        {"id":"avg_goals","value":avg_goals,
         "display":f"{avg_goals} goals per game across all World Cups"},
        {"id":"color_wins","value":best_color[0],
         "display":f"Teams in {best_color[0]} jerseys have won {best_color[1]['wins']} World Cups",
         "detail":best_color[1]["winners"]},
        {"id":"continent_rotation","value":True,
         "display":"Every WC since 1978 won by South America or Europe — 0 exceptions"},
        {"id":"smallest_winner","value":"Uruguay",
         "display":"Uruguay won 1930 and 1950 with a population of just 1.7 million"},
    ]


# ── MAIN RUNNER ────────────────────────────────────────────────────────────
def run_all(wc_matches, historical_df, current_elo, base_elo,
            win_probs, xg_data, players_df=None):
    """
    Run all analyses and save output JSON files.
    Call this from run.py after the model pipeline completes.
    """
    print("Running descriptive stats and fun fact analyses...")

    wc_teams = list(set(
        [m["team1"] for m in wc_matches] +
        [m["team2"] for m in wc_matches]
    ))

    golden_boot  = compute_golden_boot(wc_matches)
    excitement   = compute_excitement(wc_matches, xg_data)
    xg_eff       = compute_xg_efficiency(wc_matches, xg_data) if xg_data else []
    clean_sheets = compute_clean_sheets(wc_matches)
    goal_timing  = compute_goal_timing(wc_matches)
    upsets       = compute_upsets(wc_matches, base_elo)
    elo_movers   = compute_elo_movers(base_elo, current_elo, wc_teams)
    opp_strength = compute_opponent_strength(wc_matches, current_elo)
    comebacks    = compute_comebacks(wc_matches)
    xg_totals    = compute_xg_totals(wc_matches, xg_data) if xg_data else []
    squad_ages   = compute_squad_ages(players_df, wc_teams) if players_df is not None else []
    hist_facts   = compute_historical_patterns(historical_df)

    descriptive = {
        "generated_at":  datetime.utcnow().isoformat(),
        "golden_boot":   golden_boot[:10],
        "excitement":    excitement[:10],
        "xg_efficiency": xg_eff,
        "clean_sheets":  clean_sheets,
        "goal_timing":   goal_timing,
        "upsets":        upsets[:10],
        "elo_movers":    elo_movers,
        "opp_strength":  opp_strength,
        "comebacks":     comebacks,
        "xg_totals":     xg_totals,
        "squad_ages":    squad_ages,
    }

    fun_facts = {
        "generated_at":       datetime.utcnow().isoformat(),
        "historical_patterns": hist_facts,
        "color_wins":          COLOR_WINS,
        "quirky_angles": {
            "foreign_coaches": [
                {"team":t,"coach":QUIRKY_TEAMS.get(t,{}).get("coach",""),
                 "nationality":QUIRKY_TEAMS.get(t,{}).get("coach_nat","")}
                for t in wc_teams
                if QUIRKY_TEAMS.get(t,{}).get("coach_nat","").lower()
                not in t.lower()
            ],
            "smallest_nations": sorted([
                {"team":t,
                 "population_millions":QUIRKY_TEAMS.get(t,{}).get("population_millions"),
                 "win_prob":win_probs.get(t,0)}
                for t in wc_teams
                if QUIRKY_TEAMS.get(t,{}).get("population_millions",999) < 15
                and win_probs.get(t,0) > 0.005
            ], key=lambda x: x["population_millions"])
        }
    }

    with open(os.path.join(OUTPUT_DIR, "descriptive.json"), "w") as f:
        json.dump(descriptive, f, indent=2)
    with open(os.path.join(OUTPUT_DIR, "fun_facts.json"), "w") as f:
        json.dump(fun_facts, f, indent=2)

    print(f"  ✓ descriptive.json saved")
    print(f"  ✓ fun_facts.json saved")

    print(f"\n  ── GOLDEN BOOT TOP 5 ──")
    for p in golden_boot[:5]:
        print(f"  {p['player']:<25} {p['team']:<15} {p['goals']} goals")

    print(f"\n  ── BIGGEST UPSETS ──")
    for u in upsets[:3]:
        print(f"  {u['match']:<40} {u['score']:<6} surprise: {u['surprise_score']:.3f}")

    return descriptive, fun_facts


if __name__ == "__main__":
    print("analysis/fun_facts.py — call run_all() with pipeline outputs")
