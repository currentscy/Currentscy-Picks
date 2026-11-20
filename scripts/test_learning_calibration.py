import unittest
from learning_calibration import eligible,analyze,transform,fit,MIN_TRAIN,MIN_HOLDOUT
from forecast_vs_results import build
class LearningTests(unittest.TestCase):
 def test_no_outcomes_no_learning(self):
  self.assertEqual(analyze([]),{})
 def test_no_future_data_leakage(self):
  games=[{"gameKey":"nba:1","sport":"nba","start":"2026-11-20T20:00:00Z"}]
  p=[{"predictionId":"p1","gameKey":"nba:1","predictedAt":"2026-11-20T21:00:00Z","baselineProbability":.7}]
  o=[{"predictionId":"p1","result":1,"verified":True,"verifiedAt":"2026-11-20T23:00:00Z","sourceUrl":"https://example.org"}]
  self.assertEqual(eligible(games,p,o),[])
 def test_no_promotion_small_sample(self):
  rows=[{"sport":"nba","kickoff":f"2026-11-{i%20+1:02d}T20:00:00Z","id":str(i),"gameKey":str(i),
         "probability":.65,"result":i%2} for i in range(MIN_TRAIN+MIN_HOLDOUT)]
  self.assertFalse(analyze(rows)["nba"]["promotionEligible"])
 def test_fitted_probs_bounded(self):
  params=fit([(.2,0),(.8,1)]*50)
  self.assertGreater(transform(.01,**params),0)
  self.assertLess(transform(.99,**params),1)
 def test_matchup_display_no_reconstructed_pick(self):
  event={"eventKey":"nba:1","sport":"nba","scheduledStart":"2026-11-20T20:00:00Z","completed":True,
   "teams":[{"name":"Home","homeAway":"home","score":"110"},{"name":"Away","homeAway":"away","score":"100"}]}
  pred={"predictionId":"p1","gameKey":"nba:1","predictedAt":"2026-11-20T21:00:00Z",
        "baselineProbability":.65}
  self.assertEqual(build([event],[pred],[]),[])
if __name__=="__main__":unittest.main()
