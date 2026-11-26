const assert=require('node:assert/strict'),{run}=require('./harness.cjs');
for(const level of ['beginner','intermediate','advanced']){
 const q=run(),e=q.exec;
 e('scrollToCompletedStageRadio=()=>{};ifr$("level").value='+JSON.stringify(level)+';ifrReadSetup();IFR_APP.config.arrivalAtis="Whiskey";IFR_APP.config.approachType="ILS";IFR_APP.config.destRunway="24";');
 const reset=()=>e('IFR_APP.stageIndex=IFR_STAGES.findIndex(s=>s.id==="approach");ifrRenderStage();ifr$("frequency").value=IFR_STAGES[IFR_APP.stageIndex].freq');
 const call=t=>e('ifrEvaluateTransmission('+JSON.stringify(t)+')');
 for(const text of [
  'SoCal, Cessna 172SP, 10 NW, inbound with Whiskey Palomar, ILS 24',
  'SoCal, Cessna 172SP, 10NW, inbound with information W, Palomar, ILS 24',
  'SoCal Approach, Cessna 172SP, 4000, with information Whiskey, request ILS runway 24'
 ]){
  reset();call(text);assert.equal(e('IFR_APP.phase'),'approachReadback',e('ifr$("feedback").textContent'));
 }
 reset();call('SoCal, Cessna 127SP, 10 NW, inbound with Whiskey Palomar, ILS 24');
 assert.equal(e('IFR_APP.phase'),'approachInitial');assert.match(e('IFR_APP.lastATC.visual'),/say again your callsign\.$/);
 reset();call('SoCal, Cessna 172SP, 10 NW, inbound with November Palomar, ILS 24');
 assert.equal(e('IFR_APP.phase'),'approachInitial');assert.match(e('IFR_APP.lastATC.visual'),/say again information Whiskey\.$/);
 reset();call('SoCal, Cessna 172SP, inbound with Whiskey Palomar, ILS 24');
 assert.equal(e('IFR_APP.phase'),'approachInitial');assert.match(e('IFR_APP.lastATC.visual'),/say again position or altitude\.$/);
}
console.log('IFR Approach: exact call, compact position, letter ATIS, altitude alternative and specific corrections pass at all levels');
