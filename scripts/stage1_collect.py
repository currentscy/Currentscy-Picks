#!/usr/bin/env python3
"""Stage 1: bounded, source-attributed multi-sport game collection.
No forecasts, injury inference, or edits to website simulation inputs.
"""
import datetime as dt
import json
import os
from pathlib import Path
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "research-ledger" / "stage1"
UTC = dt.timezone.utc
SPORTS = {
    "nfl": ("football", "nfl"),
    "ncaa-football": ("football", "college-football"),
    "nba": ("basketball", "nba"),
    "nhl": ("hockey", "nhl"),
    "soccer-england": ("soccer", "eng.1"),
    "soccer-spain": ("soccer", "esp.1"),
    "soccer-italy": ("soccer", "ita.1"),
    "soccer-germany": ("soccer", "ger.1"),
    "soccer-france": ("soccer", "fra.1"),
    "soccer-mls": ("soccer", "usa.1"),
    "soccer-mexico": ("soccer", "mex.1"),
    "soccer-ucl": ("soccer", "uefa.champions"),
    "soccer-uel": ("soccer", "uefa.europa"),
}
MAX_EVENTS = 6000
TIMEOUT = 12

def request_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "CurrentscyPicksStage1/1.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
        if response.status != 200:
            raise ValueError("Unexpected HTTP status")
        return json.load(response)

def normalize_event(event, sport, observed, source):
    comps = event.get("competitions") or []
    comp = comps[0] if comps else {}
    participants = []
    for c in comp.get("competitors") or []:
        team = c.get("team") or {}
        score = c.get("score")
        participants.append({
            "sourceTeamId": str(team.get("id") or ""),
            "name": team.get("displayName") or team.get("name"),
            "homeAway": c.get("homeAway"),
            "score": str(score) if score is not None else None,
            "winner": c.get("winner") if isinstance(c.get("winner"), bool) else None,
        })
    status = (event.get("status") or {}).get("type") or {}
    return {
        "eventKey": f"{sport}:{event.get('id')}",
        "sourceEventId": str(event.get("id")),
        "sport": sport,
        "scheduledStart": event.get("date"),
        "status": status.get("name"),
        "completed": status.get("completed") is True,
        "teams": participants,
        "source": "ESPN unofficial site scoreboard",
        "sourceUrl": source,
        "observedAt": observed,
        "verifiedInjuries": None,
        "verifiedLineups": None,
        "playerStatistics": None,
        "quality": {"scoreboardObserved": True, "injuriesVerified": False, "lineupsVerified": False, "playerStatisticsVerified": False},
    }

def collect(now=None, fetcher=request_json, days_back=1, days_forward=3):
    now = now or dt.datetime.now(UTC)
    observed = now.isoformat()
    events = {}
    checks = []
    for sport, (category, league) in SPORTS.items():
        for offset in range(-days_back, days_forward + 1):
            date = (now + dt.timedelta(days=offset)).strftime("%Y%m%d")
            url = f"https://site.api.espn.com/apis/site/v2/sports/{category}/{league}/scoreboard?" + urllib.parse.urlencode({"dates": date, "limit": 300})
            try:
                data = fetcher(url)
                count = 0
                for event in data.get("events") or []:
                    if not event.get("id"):
                        continue
                    row = normalize_event(event, sport, observed, url)
                    events[row["eventKey"]] = row
                    count += 1
                    if len(events) > MAX_EVENTS:
                        raise ValueError("Event safety limit reached")
                checks.append({"sport": sport, "date": date, "ok": True, "eventsReturned": count})
            except (urllib.error.URLError, TimeoutError, ValueError, KeyError, TypeError, OSError) as exc:
                checks.append({"sport": sport, "date": date, "ok": False, "error": type(exc).__name__})
    return {
        "schemaVersion": 1,
        "collectedAt": observed,
        "window": {"daysBack": days_back, "daysForward": days_forward},
        "sourcePolicy": "Unofficial ESPN public endpoint; coverage and permission must be independently reviewed before redistribution",
        "events": sorted(events.values(), key=lambda x: (x["scheduledStart"] or "", x["eventKey"])),
        "checks": checks,
        "summary": {
            "eventCount": len(events),
            "successfulRequests": sum(x["ok"] for x in checks),
            "failedRequests": sum(not x["ok"] for x in checks),
            "injuryRecordsVerified": 0,
            "lineupRecordsVerified": 0,
            "playerStatRecordsVerified": 0,
        },
    }

def main():
    DEST.mkdir(parents=True, exist_ok=True)
    data = collect()
    path = DEST / "latest.json"
    temp = DEST / "latest.json.tmp"
    temp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    os.replace(temp, path)
    print(json.dumps(data["summary"]))
    if data["summary"]["successfulRequests"] == 0:
        raise SystemExit("No providers responded; collection snapshot marked unsuccessful")

if __name__ == "__main__":
    main()
