#!/usr/bin/env python3
"""Read-only pregame vs coaching backtest; fails closed without verified player outcomes."""
import datetime as dt, json, math, pathlib, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
DATA=ROOT/'research-ledger'/'verified-player-predictions.json'
def parse(s):
 try:
  x=dt.datetime.fromisoformat(s.replace('Z','+00:00'))
  return x if x.tzinfo else None
 except (TypeError,ValueError,AttributeError):return None
def evaluate(rows):
 accepted=[];rejected=[];seen=set()
 for i,r in enumerate(rows):
  if not isinstance(r,dict):rejected.append([i,'not a record']);continue
  key=(r.get('league'),r.get('gameId'),r.get('playerId'),r.get('market'))
  start,saved,settled=map(parse,(r.get('kickoff'),r.get('predictionTimestamp'),r.get('outcomeTimestamp')))
  values=[r.get(k) for k in ('baselinePrediction','coachingPrediction','actualValue')]
  if r.get('league') not in ('nfl','ncaa') or not all(key[1:]) or key in seen:
   rejected.append([i,'identity/duplicate']);continue
  if not start or not saved or not settled or not saved<start<settled:
   rejected.append([i,'timestamp/leakage']);continue
  if not all(type(x) in (float,int) and math.isfinite(x) and x>=0 for x in values):
   rejected.append([i,'missing numeric prediction or actual']);continue
  if not all(isinstance(r.get(k),str) and r[k].startswith('https://') for k in ('predictionSourceUrl','outcomeSourceUrl')):
   rejected.append([i,'missing HTTPS provenance']);continue
  seen.add(key);accepted.append(r)
 groups={}
 for league in ('nfl','ncaa'):
  a=[r for r in accepted if r['league']==league]
  groups[league]={'count':len(a),'baselineMAE':sum(abs(r['baselinePrediction']-r['actualValue']) for r in a)/len(a) if a else None,'coachingMAE':sum(abs(r['coachingPrediction']-r['actualValue']) for r in a)/len(a) if a else None,'readyForPromotion':False}
 return {'recordsAccepted':len(accepted),'recordsRejected':len(rejected),'rejections':rejected[:25],'leagues':groups,'coachingModelActivated':False,'note':'No automatic promotion. Independent chronological holdout, model snapshot provenance and calibration audit still required.'}
if __name__=='__main__':
 rows=json.loads(DATA.read_text()) if DATA.exists() else []
 if not isinstance(rows,list):sys.exit('Expected a JSON array')
 report=evaluate(rows)
 print(json.dumps(report,indent=2))
 if not rows:print('BLOCKED: no independently verified player prediction and outcome records',file=sys.stderr)
