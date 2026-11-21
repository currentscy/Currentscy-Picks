#!/usr/bin/env python3
"""Optional free-tier multi-provider research cross-check.

Gemini and Groq need private API keys. Cloudflare Workers AI needs an
authenticated gateway endpoint configured separately (AI binding in Worker).
Missing providers are marked unavailable, never simulated. All AI advice is
shadow-only and cannot change archived forecasts or probabilities.
"""
import json,os,urllib.request,urllib.error
from pathlib import Path
from datetime import datetime,timezone
BASE=Path(__file__).resolve().parents[1]/"research-ledger"
OUT=BASE/"ai"/"cross-check.json"
PROMPT=("Review only the provided sports forecast evidence. Identify factual "
 "inconsistencies, missing lineup/injury data, and calibration issues. "
 "Do not invent facts, probabilities, final scores, or suggest bets. "
 "Give a concise audit, not a new prediction. Evidence: ")
def read(p,default):
 try:return json.loads((BASE/p).read_text())
 except (OSError,ValueError):return default
def post(url,body,headers):
 req=urllib.request.Request(url,data=json.dumps(body).encode(),headers={"Content-Type":"application/json",**headers},method="POST")
 with urllib.request.urlopen(req,timeout=25) as r:return json.load(r)
def gemini(prompt):
 key=os.environ["GEMINI_API_KEY"]
 model=os.getenv("GEMINI_MODEL","gemini-2.5-flash-lite")
 import urllib.parse
 data=post("https://generativelanguage.googleapis.com/v1beta/models/"+urllib.parse.quote(model,safe="-._")+":generateContent",
  {"contents":[{"parts":[{"text":prompt}]}],"generationConfig":{"maxOutputTokens":400}},
  {"x-goog-api-key":key})
 return " ".join(p.get("text","") for c in data.get("candidates",[]) for p in c.get("content",{}).get("parts",[]))[:3500]
def groq(prompt):
 key=os.environ["GROQ_API_KEY"]
 model=os.getenv("GROQ_MODEL","llama-3.1-8b-instant")
 data=post("https://api.groq.com/openai/v1/chat/completions",
  {"model":model,"messages":[{"role":"system","content":"You are a cautious evidence auditor. Do not invent missing data."},{"role":"user","content":prompt}],"max_tokens":400},
  {"Authorization":"Bearer "+key})
 return str(data["choices"][0]["message"]["content"])[:3500]
def cloudflare(prompt):
 # Private gateway is a user-deployed Worker with an AI binding. No direct
 # public unauthenticated inference endpoint or browser-exposed credentials.
 url=os.environ["CLOUDFLARE_AI_GATEWAY_URL"]
 if not url.startswith("https://"):raise ValueError("Cloudflare gateway must use HTTPS")
 token=os.environ["CLOUDFLARE_AI_GATEWAY_TOKEN"]
 data=post(url,{"prompt":prompt},{"Authorization":"Bearer "+token})
 return str(data.get("response") or data.get("text") or "")[:3500]
def run():
 predictions=read("stage3/pregame-predictions.json",[])
 outcomes=read("stage3/verified-outcomes.json",[])
 evaluation=read("stage3/evaluation.json",{})
 learning=read("learning/report.json",{})
 evidence={"savedForecasts":len(predictions),"savedFinalOutcomes":len(outcomes),
  "evaluationSummary":evaluation.get("summary",{}),"learningBySport":{k:{"n":v.get("n"),"promotionEligible":v.get("promotionEligible")} for k,v in learning.get("bySport",{}).items()},
  "recentForecasts":[{"gameKey":x.get("gameKey"),"predictedAt":x.get("predictedAt"),"baselineProbability":x.get("baselineProbability")} for x in predictions[-5:]]}
 prompt=PROMPT+json.dumps(evidence,separators=(",",":"))[:7000]
 configs={"cloudflare":("CLOUDFLARE_AI_GATEWAY_URL","CLOUDFLARE_AI_GATEWAY_TOKEN",cloudflare),
  "gemini":("GEMINI_API_KEY",None,gemini),"groq":("GROQ_API_KEY",None,groq)}
 providers={}
 for name,(required,other,fn) in configs.items():
  if not os.getenv(required) or other and not os.getenv(other):
   providers[name]={"status":"not-configured"};continue
  try:
   answer=fn(prompt)
   if not answer.strip():raise ValueError("Empty model response")
   providers[name]={"status":"ok","analysis":answer}
  except urllib.error.HTTPError as exc:
   providers[name]={"status":"error","httpStatus":exc.code,"diagnostic":("Authorization denied: check Worker secret matches GitHub secret and Cloudflare Access/WAF rules" if exc.code==403 else "Unauthorized: check Worker token" if exc.code==401 else "AI quota, binding or model unavailable" if exc.code in (429,503) else "Provider request failed")}
  except (ValueError,KeyError,IndexError,urllib.error.URLError,TimeoutError,OSError) as exc:
   providers[name]={"status":"error","errorType":type(exc).__name__}
 ok=[name for name,r in providers.items() if r["status"]=="ok"]
 report={"schemaVersion":1,"generatedAt":datetime.now(timezone.utc).isoformat(),
  "providers":providers,"availableProviders":ok,"crossCheckComplete":len(ok)==3,
  "evidence":evidence,"conclusion":"AI reviews are advisory and cannot prove model accuracy or override immutable forecasts.",
  "productionModelChanged":False,"reviewOnly":True}
 OUT.parent.mkdir(parents=True,exist_ok=True)
 tmp=OUT.with_suffix(".tmp");tmp.write_text(json.dumps(report,indent=2)+"\n");tmp.replace(OUT)
 print(json.dumps({"providers":{k:v["status"] for k,v in providers.items()},"crossCheckComplete":len(ok)==3}))
 return report
if __name__=="__main__":run()
