const assert=require('node:assert/strict');
const {run}=require('./harness.cjs');
function pattern(type){
  const q=run(),e=q.exec;
  e('scrollToCompletedStageRadio=()=>{};unexpectedEnabled=()=>false;trafficAdvisoryEnabled=()=>false;$("flightFollowing").value="pattern";$("patternLandingType").value='+JSON.stringify(type)+';applyVFRSetup();app.stageIndex=2;renderStage();$("frequency").value=STAGES[2].freq');
  const call=text=>e('evaluateTransmission('+JSON.stringify(text+', Cessna 172SP')+')');
  const phase=p=>assert.equal(e('app.phase'),p,e('app.lastATC?.visual'));
  const takeoff=()=>{call('Long Beach Tower, holding short runway 26L, request closed traffic');call('Runway 26L cleared for takeoff left traffic');call('Left crosswind');};
  const land=()=>{call('Downwind runway 26L');phase('patternLandingReadback');};
  return {q,e,call,phase,takeoff,land};
}

for(const seen of [true,false]){
  const {q,e,call,phase,takeoff}=pattern('fullstop');
  e('trafficAdvisoryEnabled=()=>true');
  takeoff();phase('patternTrafficResponse');
  call(seen?'Traffic in sight':'Negative contact');
  if(seen){
    phase('patternSequenceReadback');
    call('Number two, following the Cessna');
    call('Downwind runway 26L');
  }else{
    phase('patternExtendReadback');
    call('Extend downwind, you will call base');
    q.flush();
    call('Left base');
  }
  phase('patternLandingReadback');
  assert.equal(e('app.session.trafficAdvisories'),1);
  assert.match(e('app.lastATC.visual'),/wind .* Runway 26L, cleared to land/);
}

for(const type of ['touchgo','option']){
  const {e,call,phase,takeoff,land}=pattern(type);
  takeoff();land();
  call('Runway 26L cleared to land');
  phase('patternLandingReadback');
  call(type==='option'?'Runway 26L cleared for the option':'Runway 26L cleared for touch and go');
  if(type==='option'){
    phase('patternOptionDecision');
    e('$("patternOptionTouchGo").click()');
  }
  phase('patternTouchGoReport');
  call('Airborne');
  assert.equal(e('app.session.circuits'),1);
  e('choosePatternContinuation(true)');
  phase('patternCrosswindReadback');
  call('Left crosswind');land();
  call(type==='option'?'Runway 26L cleared for the option':'Runway 26L cleared for touch and go');
  if(type==='option') e('$("patternOptionTouchGo").click()');
  call('Airborne');
  assert.equal(e('app.session.circuits'),2);
  e('choosePatternContinuation(false)');
  assert.equal(e('STAGES[app.stageIndex].fullStop'),true);
  call('Left crosswind');land();
  e('STAGES[app.stageIndex].exitStyle=0');
  call('Runway 26L cleared to land');call('Clear of the runway');call('Ground 133.0');
  assert.equal(e('app.session.circuits'),3);
  e('choosePatternContinuation(false);$("frequency").value=STAGES[app.stageIndex].freq');
  call('Long Beach Ground, clear of runway, request taxi to parking');
  call('Parking via Foxtrot');e('nextStage()');
  assert.equal(e('loadFlightReportHistory()[0].circuits'),3);
  assert.equal(e('loadFlightReportHistory()[0].landingPractice'),type);
}

for(const exit of [0,1]){
  const {e,call,phase,takeoff,land}=pattern('option');
  takeoff();land();call('Runway 26L cleared for the option');
  e('$("patternOptionFullStop").click()');phase('patternClearRunway');
  call('Clear of runway');call('Ground 133.0');
  assert.equal(e('app.stageComplete'),true);
  const p=pattern('fullstop');
  p.takeoff();p.land();p.e('STAGES[app.stageIndex].exitStyle='+exit);
  p.call('Runway 26L cleared to land');
  if(exit===1){p.phase('patternExitHandoffReadback');p.call('Ground 133.0');}
  if(exit===1)p.e('$("patternRunwayClear").click()');
  else{p.call('Clear of runway');p.call('Ground 133.0');}
  assert.equal(p.e('app.stageComplete'),true);
}
console.log('Traffic sequencing, negative contact, landing clearances, continuous circuits, final full stop, exits and reports passed');
