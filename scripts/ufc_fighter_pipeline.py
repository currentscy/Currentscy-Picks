#!/usr/bin/env python3
"""UFC Stage 1/2: collect public UFCStats fighter records with explicit provenance.
No fabricated missing values. Network failures are reported, not silently zeroed.
Run from repository root: python scripts/ufc_fighter_pipeline.py
"""
import datetime as dt
import html
import json
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "research-ledger" / "ufc"
BASE = "http://ufcstats.com"
FIELDS = {"SLpM": "strikesLandedPerMinute", "SApM": "strikesAbsorbedPerMinute",
          "Str. Acc.": "strikingAccuracy", "Str. Def": "strikingDefense",
          "TD Avg.": "takedownsPer15", "TD Acc.": "takedownAccuracy",
          "TD Def.": "takedownDefense", "Sub. Avg.": "submissionsPer15"}
class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]; self.href=None; self.text=[]
    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.href=dict(attrs).get("href"); self.text=[]
    def handle_data(self, data):
        if self.href is not None: self.text.append(data)
    def handle_endtag(self, tag):
        if tag == "a" and self.href is not None:
            self.links.append((self.href, " ".join("".join(self.text).split())))
            self.href=None

def fetch(url):
    if not url.startswith(BASE + "/"): raise ValueError("Unapproved URL")
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; CurrentscyResearch/1.0)"})
    with urllib.request.urlopen(req,timeout=15) as response:
        if response.status != 200: raise ValueError("HTTP status not 200")
        return response.read().decode("utf-8",errors="replace")

def plain(s):
    return " ".join(html.unescape(re.sub(r"<[^>]*>"," ",s)).split())

def fighter_links(page):
    p=Links();p.feed(page)
    result={}
    for url,name in p.links:
        if re.fullmatch(r"https?://ufcstats.com/fighter-details/[a-f0-9]+",url):
            result.setdefault(url.split("/")[-1],{"id":url.split("/")[-1],"name":name,"url":url})
    return result

def parse_profile(page,identity,observed):
    # The labels are in the fighter-page statistics panel, not in the fight log.
    metrics={}
    for label,key in FIELDS.items():
        match=re.search(r"(?is)<i[^>]*>\\s*"+re.escape(label)+r"\\s*</i>\\s*([^<]+)",page)
        if not match: continue
        raw=plain(match.group(1)).strip().rstrip("%")
        try: val=float(raw)
        except ValueError: continue
        if key in ("strikingAccuracy","strikingDefense","takedownAccuracy","takedownDefense"):
            if not 0<=val<=100: continue
            val/=100
        elif not 0<=val<1000: continue
        metrics[key]=val
    return {"fighterId":"ufcstats:"+identity["id"],"name":identity["name"],
            "source":"ufcstats","sourceUrl":identity["url"],"observedAt":observed,
            "metrics":metrics,"verification":"single-source-unconfirmed"}

def collect(names,fetcher=fetch):
    now=dt.datetime.now(dt.timezone.utc).isoformat()
    names={" ".join(n.casefold().split()):n for n in names if isinstance(n,str) and n.strip()}
    rows=[];failures=[];matched=set()
    # UFCStats roster pages are alphabetic; no guessing IDs from display names.
    for letter in sorted({n[0].upper() for n in names}):
        url=BASE+"/statistics/fighters?ftype=all&char="+letter+"&page=all"
        try: candidates=fighter_links(fetcher(url))
        except Exception as e:
            failures.append({"url":url,"error":str(e)});continue
        for ident in candidates.values():
            key=" ".join(ident["name"].casefold().split())
            if key not in names: continue
            matched.add(key)
            try: rows.append(parse_profile(fetcher(ident["url"]),ident,now))
            except Exception as e: failures.append({"fighter":ident["name"],"url":ident["url"],"error":str(e)})
    missing=[original for key,original in names.items() if key not in matched]
    return {"collectedAt":now,"source":"ufcstats","fighters":rows,"unmatchedNames":missing,
            "failures":failures,"quality":{"fighterCount":len(rows),"verifiedCrossProvider":0}}

def main():
    # Only explicitly supplied names are queried; never pretend the whole roster was checked.
    import sys
    names=sys.argv[1:]
    if not names:
        raise SystemExit("Usage: python scripts/ufc_fighter_pipeline.py 'Fighter One' 'Fighter Two'")
    result=collect(names)
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/"latest.json").write_text(json.dumps(result,indent=2)+"\\n")
    print(json.dumps(result["quality"]))
    if result["failures"] or result["unmatchedNames"]: raise SystemExit(2)
if __name__=="__main__":main()
