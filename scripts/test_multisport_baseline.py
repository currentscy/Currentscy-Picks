import importlib.util
import datetime as dt
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location("multisport_baseline",Path(__file__).with_name("multisport-baseline.py"))
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
def event(key,day,home,away,hs=None,az=None,completed=False,observed=None):
 return {"eventKey":key,"sport":"nfl","scheduledStart":day,"completed":completed,
  "firstObservedAt":observed or day,"sourceUrl":"https://site.api.espn.com/test",
  "teams":[{"sourceTeamId":home,"homeAway":"home","score":str(hs) if hs is not None else None},
           {"sourceTeamId":away,"homeAway":"away","score":str(az) if az is not None else None}]}
class MultiSportBaselineTests(unittest.TestCase):
 def test_no_backfilled_forecasts(self):
  now=dt.datetime.fromisoformat("2026-11-20T12:00:00+00:00")
  e=event("nfl:1","2026-11-20T10:00:00Z","A","B")
  self.assertIsNone(module.forecast(e,[],now))
 def test_no_fabricated_forecast_without_history(self):
  now=dt.datetime.fromisoformat("2026-11-20T12:00:00+00:00")
  e=event("nfl:1","2026-11-21T10:00:00Z","A","B")
  self.assertIsNone(module.forecast(e,[],now))
 def test_eight_prior_results_allow_forecast(self):
  now=dt.datetime.fromisoformat("2026-11-20T12:00:00+00:00")
  past=[event("nfl:h"+str(i),"2026-10-%02dT10:00:00Z"%(i+1),"A","C",20,10,True,"2026-10-%02dT12:00:00Z"%(i+1)) for i in range(8)]
  past +=[event("nfl:a"+str(i),"2026-10-%02dT10:00:00Z"%(i+1),"D","B",20,10,True,"2026-10-%02dT12:00:00Z"%(i+1)) for i in range(8)]
  e=event("nfl:future","2026-11-21T10:00:00Z","A","B")
  f=module.forecast(e,past,now)
  self.assertIsNotNone(f)
  self.assertGreater(f["baselineProbability"],.5)
  self.assertIn("NOT website simulation",f["captureMethod"])
 def test_final_result(self):
  self.assertEqual(module.winner(event("nfl:1","2026-10-01T10:00:00Z","A","B",14,10,True)),1)
  self.assertIsNone(module.winner(event("nfl:2","2026-10-01T10:00:00Z","A","B",10,10,True)))
if __name__=="__main__":unittest.main()
