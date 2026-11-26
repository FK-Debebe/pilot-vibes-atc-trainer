const assert=require('node:assert/strict'),{run}=require('./harness.cjs');
const q=run(),e=q.exec;
e('scrollToCompletedStageRadio=()=>{};let latestSpeech;speechSynthesis.speak=u=>latestSpeech=u;ifrReadSetup()');
const call=t=>e('ifrEvaluateTransmission('+JSON.stringify(t)+')');
const initial={
 clearance:()=>e('IFR_STAGES[IFR_APP.stageIndex].facility+", Cessna 172SP, at "+IFR_APP.config.location+", information "+IFR_APP.config.atis+", IFR to Palomar"'),
 ground:()=>e('IFR_STAGES[IFR_APP.stageIndex].facility+", Cessna 172SP, at "+IFR_APP.config.location+", request taxi runway "+IFR_APP.config.runway'),
 tower:()=>e('IFR_STAGES[IFR_APP.stageIndex].facility+", Cessna 172SP, holding short runway "+IFR_APP.config.runway+", ready for IFR departure"'),
 departure:()=>e('"SoCal, Cessna 172SP, IFR to Palomar, passing 1000 climbing "+ifrClearanceInitialAltitude()'),
 enroute:()=>e('"SoCal, Cessna 172SP, "+ifrAltitudeNumber()'),
 approach:()=>e('"SoCal Approach, Cessna 172SP, "+IFR_APP.arrivalAltitude+", information "+IFR_APP.config.arrivalAtis+", request "+ifrApproachName()'),
 destTower:()=>e('IFR_STAGES[IFR_APP.stageIndex].facility+", Cessna 172SP, established "+ifrApproachName()'),
 destGround:()=>e('IFR_STAGES[IFR_APP.stageIndex].facility+", Cessna 172SP, clear runway, request taxi parking"')
};
for(let steps=0;steps<45;steps++){
 e('ifr$("frequency").value=IFR_STAGES[IFR_APP.stageIndex].freq');
 if(e('IFR_APP.stageComplete')){
  const final=e('IFR_APP.stageIndex===IFR_STAGES.length-1');e('ifrNextStage()');if(final)break;continue;
 }
 if(e('IFR_STAGES[IFR_APP.stageIndex].type')==='atis'){e('ifrMonitorAtis();latestSpeech.onend()');continue;}
 const phase=e('IFR_APP.phase');
 if(phase.endsWith('Initial'))call(initial[e('IFR_STAGES[IFR_APP.stageIndex].id')]());
 else call(e('IFR_APP.lastATC.visual'));
 assert.ok(e('IFR_APP.phase')!==phase||e('IFR_APP.stageComplete'),e('ifr$("feedback").textContent'));
}
assert.equal(e('IFR_APP.stageComplete'),true);
assert.ok(e('loadFlightReportHistory().some(r=>r.radioExchange.some(x=>x.text.includes("frequency change approved")))'));
console.log('IFR complete flight through separate Tower handoff, approach, landing, parking and saved radio exchange passed');
