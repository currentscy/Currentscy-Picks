/* V90 Public NFL mode: no PFF data or PFF-derived predictions.
 * Preserves existing public website; protects against restricted data in new integrations.
 */
(function(){
'use strict';
const denied=/\b(pff|pro football focus)\b/i;
const allowed=Object.freeze({
 mode:'public',
 pffConnected:false,
 pffDerivedOutputsAllowed:false,
 commercialReady:false,
 allowedProviderNames:['ESPN public scoreboard','ESPN public summary','ESPN public injury report','Official NFL/team injury report','Authorized NFL data','Authorized play-by-play and tracking feed','Authorized blocking/pressure metrics','Authorized coverage/assignment metrics']
});
function checkRecord(record){
 if(!record||typeof record!=='object')return {ok:false,reason:'Missing record'};
 const provider=String(record.provider||'');
 if(denied.test(provider)||denied.test(String(record.derivedFrom||'')))return {ok:false,reason:'PFF or PFF-derived data excluded from public website'};
 if(!allowed.allowedProviderNames.includes(provider))return {ok:false,reason:'Unknown provider; verify public usage rights first'};
 if(record.publicUseAuthorized!==true)return {ok:false,reason:'Public-use authorization not established'};
 if(record.commercialUseAuthorized!==true)return {ok:false,reason:'Commercial-use authorization not established'};
 if(!record.sourceUrl||!record.observedAt)return {ok:false,reason:'Source provenance or timestamp missing'};
 return {ok:true};
}
function filterRecords(records){return (Array.isArray(records)?records:[]).filter(x=>checkRecord(x).ok)}
window.CurrentscyPublicNFL=Object.freeze({...allowed,checkRecord,filterRecords});
})();