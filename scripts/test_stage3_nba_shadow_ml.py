import unittest
from stage3_nba_shadow_ml import features, rows, evaluate, train, sigmoid

class Stage3MLTests(unittest.TestCase):
    def test_features_use_only_pregame_records(self):
        p={"homeRecord":{"w":8,"l":2},"awayRecord":{"w":2,"l":8}}
        self.assertAlmostEqual(features(p)[1],.6)
        self.assertIsNone(features({}))
    def test_missing_training_data_cannot_release(self):
        result=evaluate([])
        self.assertEqual(result["status"],"insufficient_verified_training_data")
        self.assertFalse(result["productionModelChanged"])
    def test_future_prediction_rejected(self):
        games=[{"gameKey":"nba:1","start":"2026-11-21T00:00Z"}]
        p={"predictionId":"p","gameKey":"nba:1","predictedAt":"2026-11-21T00:01Z",
           "baselineProbability":.5,"homeRecord":{"w":5,"l":5},"awayRecord":{"w":5,"l":5}}
        o={"predictionId":"p","verified":True,"result":1,"verifiedAt":"2026-11-21T03:00Z"}
        self.assertEqual(rows(games,[p],[o]),[])
    def test_training_direction(self):
        data=[]
        from datetime import datetime,timezone
        for i in range(100):
            x=(1.,1. if i%2 else -1.,0.)
            data.append((datetime(2026,1,1,tzinfo=timezone.utc),str(i),x,1 if i%2 else 0,.5))
        w=train(data)
        self.assertGreater(sigmoid(sum(a*b for a,b in zip(w,(1.,1.,0.)))),.5)
    def test_holdout_cannot_trigger_deployment(self):
        from datetime import datetime,timezone
        data=[(datetime(2026,1,1,tzinfo=timezone.utc),str(i),
               (1.,1. if i%2 else -1.,0.),i%2,.5) for i in range(100)]
        result=evaluate(data)
        self.assertEqual(result["holdoutRows"],30)
        self.assertFalse(result["productionModelChanged"])
        self.assertFalse(result["releaseApproved"])
if __name__=="__main__":unittest.main()
