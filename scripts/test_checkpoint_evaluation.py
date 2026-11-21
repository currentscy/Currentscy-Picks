import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from checkpoint_evaluation import evaluate
class TestCheckpoints(unittest.TestCase):
 def test_separates_and_pairs(self):
  base={"sport":"nba","gameKey":"nba:1","scheduledStart":"2026-11-20T20:00:00Z"}
  forecasts=[dict(base,predictionId="a",checkpoint="early",predictedAt="2026-11-20T10:00:00Z",probability=.6),
             dict(base,predictionId="b",checkpoint="pregame",predictedAt="2026-11-20T19:50:00Z",probability=.8),
             dict(base,predictionId="c",checkpoint="interval",predictedAt="2026-11-20T21:00:00Z",eventObservedAt="2026-11-20T20:59:00Z",probability=.9)]
  outcomes=[{"predictionId":i,"verified":True,"verifiedAt":"2026-11-20T23:00:00Z","result":1} for i in ("a","b","c")]
  result=evaluate(forecasts,outcomes)
  self.assertEqual(result["pairedEarlyPregame"]["nba"]["matchedGames"],1)
  self.assertGreater(result["pairedEarlyPregame"]["nba"]["pregameBrierImprovement"],0)
  self.assertEqual(result["bySportCheckpoint"]["nba"]["interval"]["metrics"]["count"],1)
  self.assertFalse(result["liveModelPromoted"])
 def test_rejects_postgame_pregame(self):
  p={"sport":"tennis","gameKey":"tennis:1","predictionId":"x","checkpoint":"pregame","scheduledStart":"2026-11-20T20:00:00Z","predictedAt":"2026-11-20T20:01:00Z","probability":.7}
  o={"predictionId":"x","verified":True,"verifiedAt":"2026-11-20T22:00:00Z","result":1}
  r=evaluate([p],[o]);self.assertEqual(r["rejected"]["checkpointTiming"],1)
if __name__=="__main__":unittest.main()
