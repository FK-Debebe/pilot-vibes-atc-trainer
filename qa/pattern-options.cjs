const assert=require('node:assert/strict');
const {run}=require('./harness.cjs');
function pattern(type){
  const q=run(),e=q.exec;
  e('scrollToCompletedStageRadio=()=>{};unexpectedEnabled=()=>false;trafficAdvisoryEnabled=()=>false;$("flightFollowing").value="pattern";$("patternLandingType").value='+JSON.stringify(type)+';applyVFRSetup();app.stageIndex=2;renderStage();$("frequency").value=STAGES[2].freq');
  const call=text=>e('evaluateTransmission('+JSON.stringify(text+', Cessna 172SP')+')');
  const phase=p=>assert.equal(e('app.phase'),p,e('app.lastATC?.visual'));
  const takeoff=()=>{call('Long Beach Tower, holding short runway 26L, request closed traffic');call('Runway 26L cleared for takeoff left traffic');call('Left crosswind');};
  const land=()=>{call('Extend downwind runway 26L');q.flush();call('Left base');phase('patternLandingReadback');};
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
    call('Extend downwind runway 26L');q.flush();call('Left base');
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
  e('evaluateTransmission('+JSON.stringify(type==='option'?'Runway 26L cleared for the option':'Runway 26L cleared for touch and go')+')');
  phase('patternLandingReadback');
  call(type==='option'?'Runway 26L cleared for the option':'Runway 26L cleared for touch and go');
  if(type==='option'){
    phase('patternOptionDecision');
    e('$("patternOptionTouchGo").click()');
  }
  assert.equal(e('app.stageComplete'),true);
  assert.doesNotMatch(e('app.lastATC.visual'),/report airborne/i);
  assert.equal(e('app.session.circuits'),1);
  e('choosePatternContinuation(true)');
  phase('patternCrosswindReadback');
  call('Left crosswind');land();
  call(type==='option'?'Runway 26L cleared for the option':'Runway 26L cleared for touch and go');
  if(type==='option') e('$("patternOptionTouchGo").click()');
  assert.equal(e('app.stageComplete'),true);
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
  if(exit===1){
    assert.equal(p.e('STAGES[app.stageIndex].id'),'ground');
    assert.equal(p.e('app.session.circuits'),1);
    assert.equal(p.e('tuned()'),false);
    p.e('$("frequency").value=STAGES[app.stageIndex].freq');
    p.call('Long Beach Ground, clear 26L at F3, request taxi 26L');
    p.phase('patternTaxiReadback');
    p.call('Runway 26L via Foxtrot');
    p.phase('patternTowerHandoffReadback');
    p.call('Tower 119.4');
  }
  else{p.call('Clear of runway');p.call('Ground 133.0');}
  assert.equal(p.e('app.stageComplete'),true);
}
console.log('Traffic sequencing, negative contact, landing clearances, continuous circuits, final full stop, exits and reports passed');
{
  const p=pattern('fullstop');p.takeoff();p.land();
  p.e('STAGES[app.stageIndex].exitStyle=1');p.call('Runway 26L cleared to land');
  p.call('Ground 133.0');
  assert.equal(p.e('STAGES[app.stageIndex].id'),'ground');
  p.e('$("frequency").value=STAGES[app.stageIndex].freq');
  p.call('Long Beach Ground, clear 26L at F3, request taxi to parking');
  p.phase('patternParkingReadback');p.call('Parking via Foxtrot');
  assert.equal(p.e('app.stageComplete'),true);
  assert.equal(p.e('STAGES.length'),4);
}
