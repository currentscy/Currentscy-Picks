// Isolated Stage 2 readiness and sport-specific contracts. No production model changes.
const SPORT_RULES = Object.freeze({
 nfl:{stats:['passing','rushing','receiving'],checkpoints:['pregame','halftime','final']},
 nba:{stats:['minutes','points','rebounds','assists'],checkpoints:['pregame','halftime','final']},
 'ncaa-football':{stats:['passing','rushing','receiving'],checkpoints:['pregame','halftime','final']},
 soccer:{stats:['minutes','goals','assists'],checkpoints:['pregame','halftime','final']},
 nhl:{stats:['iceTime','shots','goals','assists'],checkpoints:['pregame','intermission','final']},
 mlb:{stats:['plateAppearances','pitching'],checkpoints:['pregame','midgame','final']},
 tennis:{stats:['sets','games'],checkpoints:['pregame','set-end','final']},
 ufc:{stats:['rounds','significantStrikes'],checkpoints:['pregame','round-end','final']}
});
export const sports = Object.keys(SPORT_RULES);
export function readiness({sport,operational=false,observations=[],forecasts=[],outcomes=[]}={}) {
 const issues=[];
 const rule=SPORT_RULES[sport];
 if(!rule) issues.push('unsupported sport');
 const authenticated=observations.filter(o=>o && o.verifiedByIndependentSource===true && typeof o.sourceUrl==='string' && /^https:\/\//.test(o.sourceUrl) && Number.isFinite(Date.parse(o.observedAt)) && typeof o.eventId==='string' && o.eventId.length>0 && typeof o.playerId==='string' && o.playerId.length>0);
 // A self-asserted flag alone is insufficient: this is a structural gate, not authentication.
 const evidenceReady=!!rule && authenticated.length>0 && observations.length===authenticated.length;
 const scored=forecasts.filter(f=>f && f.sport===sport && Number.isFinite(f.probability) && f.probability>=0 && f.probability<=1 && Number.isFinite(Date.parse(f.createdAt)) && outcomes.some(o=>o.eventId===f.eventId && o.verified===true && Number.isFinite(Date.parse(o.completedAt)) && Date.parse(f.createdAt)<Date.parse(o.completedAt)));
 const validated=evidenceReady && scored.length>0;
 if(!operational) issues.push('operational tests not established');
 if(!evidenceReady) issues.push('independently authenticated linked evidence not established');
 if(!validated) issues.push('out-of-sample performance not established');
 return {sport,operational:!!operational,evidenceReady,validated,scoredCount:scored.length,issues,requiredStats:rule?.stats||[],checkpoints:rule?.checkpoints||[]};
}
export function reconcile(record,event,cutoff) {
 const errors=[];
 if(!record || !event || record.eventId!==event.eventId) errors.push('event mismatch');
 if(!record?.playerId || !record?.participantId || !event?.participants?.some(p=>p.id===record.participantId)) errors.push('player/participant identity unresolved');
 if(record?.season!==event?.season) errors.push('season mismatch');
 if(!Number.isFinite(Date.parse(record?.observedAt)) || !Number.isFinite(Date.parse(cutoff)) || Date.parse(record.observedAt)>Date.parse(cutoff)) errors.push('missing or post-cutoff evidence');
 if(!record?.sourceUrl || !/^https:\/\//.test(record.sourceUrl)) errors.push('missing provenance URL');
 if(!['confirmed','probable','unknown'].includes(record?.lineupStatus)) errors.push('lineup status missing');
 return {ok:errors.length===0,errors};
}
