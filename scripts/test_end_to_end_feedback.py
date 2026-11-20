import datetime as dt
import importlib.util
import unittest
from pathlib import Path
from stage3_evaluate import evaluate as stage3
from stage4_audit import evaluate as stage4
from validation_dashboard import audit
spec=importlib.util.spec_from_file_location("multisport_baseline",Path(__file__).with_name("multisport-baseline.py"))
baseline=importlib.util.module_from_spec(spec);spec.loader.exec_module(baseline)
class FullPipelineTests(unittest.TestCase):
 def test_forecast_to_final_scoring(self):
  kickoff="2026-12-01T20:00:00Z"
  e={"eventKey":"nhl:example","sport":"nhl","scheduledStart":kickoff,
    "completed":False,"sourceUrl":"https://site.api.espn.com/example",
    "teams":[{"sourceTeamId":"1","homeAway":"home","score":None},
             {"sourceTeamId":"2","homeAway":"away","score":None}]}
  history=[]
  for i in range(8):
   for home,away,hs,az in (("1","3",3,1),("4","2",2,1)):
    history.append({"eventKey":f"nhl:history-{i}-{home}","sport":"nhl",
     "scheduledStart":f"2026-11-{i+1:02d}T20:00:00Z",
     "firstObservedAt":f"2026-11-20T00:00:00Z",
     "completed":True,"teams":[{"sourceTeamId":home,"homeAway":"home","score":str(hs)},
       {"sourceTeamId":away,"homeAway":"away","score":str(az)}]})
  forecast=baseline.forecast(e,history,dt.datetime.fromisoformat("2026-11-30T20:00:00+00:00"))
  self.assertIsNotNone(forecast)
  final={**e,"completed":True,"lastObservedAt":"2026-12-01T23:00:00Z",
   "teams":[{"sourceTeamId":"1","homeAway":"home","score":"4"},
            {"sourceTeamId":"2","homeAway":"away","score":"2"}]}
  outcome={"predictionId":forecast["predictionId"],"verified":True,"result":baseline.winner(final),
    "verifiedAt":"2026-12-01T23:00:00Z","sourceUrl":"https://site.api.espn.com/example"}
  game={"gameKey":e["eventKey"],"sport":"nhl","start":kickoff}
  a=stage3({"games":[game]},[forecast],[outcome])
  b=stage4({"games":[game]},[forecast],[outcome])
  c=audit([final],[forecast],[outcome],{"sports":{"nhl":{}}})
  self.assertEqual(a["summary"]["scoredBaselinePredictions"],1)
  self.assertEqual(b["total"]["scored"],1)
  self.assertEqual(c["matchedFinalOutcomes"],1)
  self.assertLess(a["baseline"]["brier"],1)
 def test_no_forecast_after_kickoff(self):
  e={"eventKey":"nhl:1","sport":"nhl","scheduledStart":"2026-11-20T20:00:00Z",
     "teams":[{"sourceTeamId":"1","homeAway":"home"},{"sourceTeamId":"2","homeAway":"away"}]}
  self.assertIsNone(baseline.forecast(e,[],dt.datetime.fromisoformat("2026-11-20T21:00:00+00:00")))
if __name__=="__main__":unittest.main()
