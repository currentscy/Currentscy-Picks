import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from forecast_vs_results import build
class ForecastVsResultsTests(unittest.TestCase):
 def test_fresh_completed_source_resolves_stale_ledger(self):
  base={"eventKey":"nba:1","sport":"nba","scheduledStart":"2026-11-21T00:00:00Z",
   "teams":[{"homeAway":"home","name":"Home","sourceTeamId":"1","score":"111"},
            {"homeAway":"away","name":"Away","sourceTeamId":"2","score":"97"}]}
  stale=dict(base,completed=False,observedAt="2026-11-21T00:05:00Z")
  final=dict(base,completed=True,observedAt="2026-11-21T02:00:00Z")
  p={"predictionId":"p","gameKey":"nba:1","predictedAt":"2026-11-20T23:35:00Z","baselineProbability":.67,"homeTeamId":"1","awayTeamId":"2"}
  o={"predictionId":"p","verified":True,"verifiedAt":"2026-11-21T02:00:00Z","result":1,"homeScore":111,"awayScore":97}
  self.assertEqual(build([stale],[p],[o])[0]["status"],"awaiting-verified-final")
  self.assertEqual(build([stale],[p],[o],[final])[0]["status"],"scored")
  self.assertEqual(build([stale],[p],[dict(o,homeScore=112)],[final])[0]["status"],"awaiting-verified-final")
  self.assertEqual(build([stale],[dict(p,predictedAt="2026-11-21T00:01:00Z")],[o],[final]),[])
if __name__=="__main__":unittest.main()
