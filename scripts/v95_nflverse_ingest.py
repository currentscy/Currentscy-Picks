#!/usr/bin/env python3
"""Step 1: ingest nflverse weekly player statistics into a small provenance-rich JSON.
No PFF or FTN data; no model predictions. Python stdlib only.
"""
import csv, datetime as dt, io, json, os, sys, urllib.request
from collections import defaultdict
from pathlib import Path

API="https://api.github.com/repos/nflverse/nflverse-data/releases/tags/player_stats"
HEADERS={"User-Agent":"Currentscy-Picks-nflverse-ingest/1.0","Accept":"application/vnd.github+json"}
SEASON=int(os.environ.get("NFL_SEASON",str(dt.datetime.now(dt.timezone.utc).year)))
OUT=Path("data/v95-nflverse-player-stats.json")
FIELDS=("passing_yards","passing_tds","interceptions","rushing_yards","rushing_tds",
        "receiving_yards","receiving_tds","receptions","targets","carries")
def request(url):
    req=urllib.request.Request(url,headers=HEADERS)
    with urllib.request.urlopen(req,timeout=75) as res:
        return res.read()
def number(value):
    try: return float(value or 0)
    except (ValueError,TypeError): return 0.0
def main():
    release=json.loads(request(API))
    assets=release.get("assets",[])
    wanted=(f"player_stats_{SEASON}.csv",f"player_stats_{SEASON}.csv.gz")
    asset=next((a for name in wanted for a in assets if a.get("name")==name),None)
    if not asset: raise RuntimeError(f"No season {SEASON} player stats CSV asset; available: {[a.get('name') for a in assets][:30]}")
    data=request(asset["browser_download_url"])
    if asset["name"].endswith(".gz"):
        import gzip
        data=gzip.decompress(data)
    reader=csv.DictReader(io.StringIO(data.decode("utf-8-sig")))
    required={"season","week","player_id","player_name","recent_team"}
    missing=required-set(reader.fieldnames or [])
    if missing: raise RuntimeError(f"Unexpected nflverse schema, missing: {sorted(missing)}")
    rows=[]
    for r in reader:
        if str(r.get("season"))!=str(SEASON): continue
        if str(r.get("season_type","REG")) not in ("REG",""): continue
        if not r.get("player_id") or not r.get("week"):continue
        metrics={k:number(r.get(k)) for k in FIELDS if k in r}
        rows.append({"playerId":r["player_id"],"name":r["player_name"],"team":r["recent_team"],
                     "week":int(r["week"]),"position":r.get("position",""),"metrics":metrics})
    if len(rows)<50:raise RuntimeError(f"Suspiciously small dataset ({len(rows)} rows); refusing overwrite")
    rows.sort(key=lambda x:(x["week"],x["playerId"]))
    grouped=defaultdict(list)
    for r in rows:grouped[r["playerId"]].append(r)
    players=[]
    for pid,logs in sorted(grouped.items()):
        last=logs[-1]
        players.append({"playerId":pid,"name":last["name"],"team":last["team"],"position":last["position"],
                        "games":len(logs),"lastFive":logs[-5:]})
    payload={"schemaVersion":1,"season":SEASON,"generatedAt":dt.datetime.now(dt.timezone.utc).isoformat(),
             "source":"nflverse","releaseUrl":release["html_url"],"assetUrl":asset["browser_download_url"],
             "licenseNote":"Check source release license; attribution required for CC BY 4.0",
             "status":"historical-only; no injuries, defender assignments, or calibrated probabilities",
             "rowCount":len(rows),"playerCount":len(players),"players":players}
    OUT.parent.mkdir(parents=True,exist_ok=True)
    temp=OUT.with_suffix(".tmp")
    temp.write_text(json.dumps(payload,separators=(",",":")),encoding="utf-8")
    temp.replace(OUT)
    print(f"Saved {len(rows)} weekly rows for {len(players)} players to {OUT}")
if __name__=="__main__":
    try:main()
    except Exception as e:
        print(f"nflverse ingest failed (existing data left untouched): {e}",file=sys.stderr)
        sys.exit(1)
