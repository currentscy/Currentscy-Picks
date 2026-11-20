#!/usr/bin/env python3
"""V88 Step 5 — TheSportsDB free API schedule/results cross-check.
Free v1 public key 123; never treats mismatched event names as verified matches.
"""
import json, urllib.request, urllib.parse
from datetime import datetime, timezone, timedelta
from pathlib import Path

BASE="https://www.thesportsdb.com/api/v1/json/123"
OUT=Path("data/v88-thesportsdb.json")
def fetch(path):
    req=urllib.request.Request(BASE+path,headers={"User-Agent":"CurrentscyPicks-V88/1.0","Accept":"application/json"})
    with urllib.request.urlopen(req,timeout=15) as response:return json.load(response)

def main():
    today=datetime.now(timezone.utc).date()
    report={"schemaVersion":"88.5","provider":"TheSportsDB","fetchedAt":datetime.now(timezone.utc).isoformat(),
            "status":"unavailable","league":"NBA","leagueId":"4387","teams":[],"events":[],"errors":[],
            "limits":"Free API results may be partial or delayed. No player-defender matchups, lineup verification, or probability adjustments."}
    try:
        data=fetch("/lookup_all_teams.php?id=4387")
        rows=data.get("teams") or []
        report["teams"]=[{"id":t.get("idTeam"),"name":t.get("strTeam"),"shortName":t.get("strTeamShort")} for t in rows if t.get("idTeam") and t.get("strTeam")]
        if not report["teams"]:report["errors"].append("No NBA teams returned; league identifier or free endpoint may have changed")
    except Exception as e:report["errors"].append("teams: "+type(e).__name__+": "+str(e)[:160])
    # A short date window avoids broad expensive calls and respects free endpoint limitations.
    for delta in (-1,0,1):
        day=(today+timedelta(days=delta)).isoformat()
        try:
            data=fetch("/eventsday.php?d="+urllib.parse.quote(day)+"&s=Basketball")
            rows=data.get("events") or []
            for e in rows:
                if str(e.get("idLeague") or "")!="4387":continue
                report["events"].append({"id":e.get("idEvent"),"date":e.get("dateEvent"),
                    "time":e.get("strTime"),"home":e.get("strHomeTeam"),"away":e.get("strAwayTeam"),
                    "homeScore":e.get("intHomeScore"),"awayScore":e.get("intAwayScore"),"status":e.get("strStatus")})
        except Exception as e:report["errors"].append(day+": "+type(e).__name__+": "+str(e)[:160])
    if report["teams"] or report["events"]:
        report["status"]="partial" if report["errors"] else "metadata-available"
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("TheSportsDB:",report["status"],"teams:",len(report["teams"]),"events:",len(report["events"]))
    for err in report["errors"]:print("WARNING:",err)
if __name__=="__main__":main()
