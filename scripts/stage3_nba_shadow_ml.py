#!/usr/bin/env python3
"""Leakage-controlled NBA research candidate. Offline shadow model, never deployed.

Trains only on immutable pregame record features. Chronological holdout is
never used to fit weights. This is a small transparent ML baseline, not a
substitute for verified player/matchup inputs.
"""
import json
import math
from pathlib import Path
from stage3_ml_readiness import load, timestamp

ROOT=Path(__file__).resolve().parents[1]
MIN_TRAIN=60
MIN_HOLDOUT=30

def sigmoid(z):
    return 1/(1+math.exp(-max(-30,min(30,z))))

def features(p):
    h=p.get("homeRecord"); a=p.get("awayRecord")
    if not isinstance(h,dict) or not isinstance(a,dict): return None
    try:
        hw,hl,aw,al=(float(h[k]) for h,k in ((h,"w"),(h,"l"),(a,"w"),(a,"l")))
        if min(hw,hl,aw,al)<0 or hw+hl<=0 or aw+al<=0:return None
        return (1.,hw/(hw+hl)-aw/(aw+al),math.log1p(hw+hl)-math.log1p(aw+al))
    except (KeyError,ValueError,TypeError,OverflowError):return None

def rows(games,predictions,outcomes):
    index={g.get("gameKey"):g for g in games if isinstance(g,dict)}
    finals={o.get("predictionId"):o for o in outcomes if isinstance(o,dict)}
    seen=set();output=[]
    for p in predictions:
        if not isinstance(p,dict) or p.get("predictionId") in seen:continue
        seen.add(p.get("predictionId"))
        if not str(p.get("gameKey","")).startswith("nba:"):continue
        game=index.get(p.get("gameKey")); outcome=finals.get(p.get("predictionId"))
        if not game or not outcome:continue
        start=timestamp(game.get("start") or game.get("scheduledStart"))
        before=timestamp(p.get("predictedAt"))
        verified=timestamp(outcome.get("verifiedAt"))
        if not start or not before or not verified or before>=start or verified<start:continue
        if outcome.get("verified") is not True or type(outcome.get("result")) is not int or outcome["result"] not in (0,1):continue
        x=features(p)
        prob=p.get("baselineProbability")
        if x is None or type(prob) not in (int,float) or not math.isfinite(prob) or not 0<prob<1:continue
        output.append((start,p["predictionId"],x,outcome["result"],prob))
    return sorted(output,key=lambda x:(x[0],x[1]))

def train(train_rows,epochs=500,lr=.12,regularization=.04):
    weights=[0.,0.,0.]
    for _ in range(epochs):
        gradients=[0.,0.,0.]
        for _,_,x,y,_ in train_rows:
            error=sigmoid(sum(w*v for w,v in zip(weights,x)))-y
            for j in range(3):gradients[j]+=error*x[j]
        for j in range(3):
            gradients[j]=gradients[j]/len(train_rows)+(regularization*weights[j] if j else 0)
            weights[j]-=lr*gradients[j]
    return weights

def metrics(rows,probability):
    if not rows:return None
    pairs=[(min(.999999,max(.000001,probability(r))),r[3]) for r in rows]
    return {"count":len(pairs),
            "brier":round(sum((p-y)**2 for p,y in pairs)/len(pairs),6),
            "logLoss":round(-sum(y*math.log(p)+(1-y)*math.log1p(-p) for p,y in pairs)/len(pairs),6)}

def evaluate(data):
    if len(data)<MIN_TRAIN+MIN_HOLDOUT:
        return {"status":"insufficient_verified_training_data","eligibleRows":len(data),
                "minimumRows":MIN_TRAIN+MIN_HOLDOUT,"productionModelChanged":False}
    training=data[:-MIN_HOLDOUT]; holdout=data[-MIN_HOLDOUT:]
    weights=train(training)
    baseline=metrics(holdout,lambda r:r[4])
    candidate=metrics(holdout,lambda r:sigmoid(sum(w*x for w,x in zip(weights,r[2]))))
    improves=(candidate["brier"]<baseline["brier"] and candidate["logLoss"]<baseline["logLoss"])
    return {"status":"shadow_evaluated","trainingRows":len(training),"holdoutRows":len(holdout),
            "holdoutBaseline":baseline,"holdoutCandidate":candidate,
            "improvesBoth":improves,"candidateWeights":weights,
            "productionModelChanged":False,"releaseApproved":False,
            "note":"No deployment; no player-specific inputs; review data provenance before release."}

def main():
    games=load("stage3/game-index.json",{}).get("games",[])
    observed=load("unified-events.json",{}).get("events",[])
    known={g.get("gameKey") for g in games}
    for e in observed:
        if e.get("eventKey") not in known:
            games.append({"gameKey":e.get("eventKey"),"start":e.get("scheduledStart")})
    result=evaluate(rows(games,load("stage3/pregame-predictions.json",[]),
                         load("stage3/verified-outcomes.json",[])))
    print(json.dumps(result,indent=2))
if __name__=="__main__":main()
