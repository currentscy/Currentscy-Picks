#!/usr/bin/env python3
"""V88 Step 2: NBA.com matchup research via nba_api.
No API key. Writes only validated, provenance-tagged records. Not a live prediction.
"""
import json, os, sys
from datetime import datetime, timezone
from pathlib import Path

OUT=Path("data/v88-nba-matchups.json")
def main():
    report={"schemaVersion":"88.2","provider":"NBA.com via nba_api","generatedAt":datetime.now(timezone.utc).isoformat(),"season":os.getenv("NBA_SEASON","2026-27"),"status":"unavailable","games":[],"error":None}
    try:
        from nba_api.stats.endpoints import leaguegamefinder, boxscorematchupsv3
        season=report["season"]
        finder=leaguegamefinder.LeagueGameFinder(season_nullable=season,league_id_nullable="00",timeout=18)
        games=finder.get_data_frames()[0]
        if games.empty: raise ValueError("No NBA games returned for season")
        # Limit requests: collect at most two recent completed NBA games for validation.
        unique=games.drop_duplicates(subset=["GAME_ID"]).head(2)
        for _,game in unique.iterrows():
            gid=str(game["GAME_ID"])
            try:
                result=boxscorematchupsv3.BoxScoreMatchupsV3(game_id=gid,timeout=18).get_dict()
                sets=result.get("resultSets",[])
                parsed=[]
                for group in sets:
                    headers=group.get("headers") or []
                    rows=group.get("rowSet") or []
                    if not headers or not rows: continue
                    if not any("DEF" in str(h).upper() for h in headers): continue
                    for row in rows:
                        entry=dict(zip(headers,row))
                        # Keep only rows with actual defender identifiers; preserve raw field names.
                        if any(entry.get(k) for k in ("DEF_PLAYER_ID","DEF_PLAYER_NAME","DEFENDER_PLAYER_ID","DEFENDER_PLAYER_NAME")):
                            parsed.append(entry)
                if parsed:report["games"].append({"gameId":gid,"matchups":parsed})
            except Exception as exc:
                report.setdefault("gameErrors",[]).append({"gameId":gid,"error":type(exc).__name__+": "+str(exc)[:180]})
        if report["games"]:report["status"]="verified-sample"
        else:report["error"]="No validated defender-matchup rows returned; no simulation adjustments."
    except Exception as exc:
        report["error"]=type(exc).__name__+": "+str(exc)[:220]
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2,default=str)+"\n")
    print("V88 NBA.com status:",report["status"],"games:",len(report["games"]))
    if report["error"]:print(report["error"])
if __name__=="__main__":main()
