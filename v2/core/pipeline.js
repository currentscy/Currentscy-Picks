import {validateEvidence} from "./evidence.js";
// Collector functions are injected by the deployment environment; no secret or endpoint is hardcoded.
export function createPipeline({collect,save,clock=()=>new Date().toISOString()}={}) {
 if(typeof collect!=="function"||typeof save!=="function")throw new TypeError("collect and save adapters required");
 return {async run(event){
  if(!event?.eventId||!event?.sport)throw new Error("eventId and sport required");
  const raw=await collect(event);
  const result=validateEvidence(raw);
  const record={schemaVersion:"2.0.0",eventId:event.eventId,sport:event.sport,checkedAt:clock(),status:result.ready?"evidence_ready":"evidence_incomplete",errors:result.errors,counts:result.counts,evidence:result.evidence};
  await save(record);
  return record;
 }};
}
export function predictionEligibility(record){
 return {eligible:record?.status==="evidence_ready"&&record?.errors?.length===0,
 reason:record?.status==="evidence_ready"?"Evidence present; sport-model validation still required":"Missing or invalid opponent evidence"};
}
