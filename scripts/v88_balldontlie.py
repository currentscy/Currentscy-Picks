#!/usr/bin/env python3
"""V88 Step 4 — BALLDONTLIE free-tier metadata cross-check.
Requires a user-owned API key in GitHub Actions secret BALLDONTLIE_API_KEY.
No paid endpoints, no browser-exposed keys, no simulated defender conclusions.
"""
import json, os, urllib.request, urllib.error
from datetime import datetime, timezone
from pathlib import Path

OUT=Path("data/v88-balldontlie.json")
BASE="https://api.balldontlie.io/v1"
KEY=os.getenv("BALLDONTLIE_API_KEY","").strip()

def fetch(endpoint):
    req=urllib.request.Request(BASE+endpoint,headers={"Authorization":KEY,"Accept":"application/json","User-Agent":"CurrentscyPicks-V88/1.0"})
    with urllib.request.urlopen(req,timeout=15) as response:
        return json.load(response)

def main():
    report={"schemaVersion":"88.4","provider":"BALLDONTLIE","fetchedAt":datetime.now(timezone.utc).isoformat(),
            "status":"unavailable","access":"free-tier metadata only","teams":[],"players":[],"games":[],"errors":[],
            "limits":"No defender assignments, advanced stats or paid endpoints. No simulation adjustments."}
    if not KEY:
        report["status"]="not-configured"
        report["errors"].append("BALLDONTLIE_API_KEY GitHub Actions secret not configured")
    else:
        for name,endpoint in (("teams","/teams"),("players","/players?per_page=25"),("games","/games?per_page=25")):
            try:
                data=fetch(endpoint).get("data")
                if not isinstance(data,list):raise ValueError("Unexpected response schema")
                if name=="teams":
                    report[name]=[{"id":x.get("id"),"name":x.get("full_name"),"abbreviation":x.get("abbreviation")} for x in data if x.get("id") and x.get("full_name")]
                elif name=="players":
                    report[name]=[{"id":x.get("id"),"name":(str(x.get("first_name") or "")+" "+str(x.get("last_name") or "")).strip(),"teamId":(x.get("team") or {}).get("id")} for x in data if x.get("id")]
                else:
                    report[name]=[{"id":x.get("id"),"date":x.get("date"),"homeTeamId":x.get("home_team_id"),"visitorTeamId":x.get("visitor_team_id"),"homeScore":x.get("home_team_score"),"visitorScore":x.get("visitor_team_score")} for x in data if x.get("id")]
            except urllib.error.HTTPError as e:
                report["errors"].append(f"{name}: HTTP {e.code}; check key permissions and free-tier availability")
            except Exception as e:
                report["errors"].append(f"{name}: {type(e).__name__}: {str(e)[:160]}")
        if report["teams"]:report["status"]="partial" if report["errors"] else "metadata-available"
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print("BALLDONTLIE:",report["status"],"teams:",len(report["teams"]),"errors:",len(report["errors"]))
    for e in report["errors"]:print("WARNING:",e)
if __name__=="__main__":main()
