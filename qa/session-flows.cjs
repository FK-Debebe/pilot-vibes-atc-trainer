const assert=require('node:assert/strict');
const {run}=require('./harness.cjs');

function session(mode){
  const q=run(), e=q.exec;
  e('scrollToCompletedStageRadio=()=>{};unexpectedEnabled=()=>false;trafficAdvisoryEnabled=()=>false;let lastSpeech;speechSynthesis.speak=u=>lastSpeech=u;');
  e('$("flightFollowing").value='+JSON.stringify(mode)+';applyVFRSetup()');
  const call=text=>{
    e('$("pilotText").value='+JSON.stringify(text)+';evaluateTransmission($("pilotText").value)');
  };
  const next=()=>e('nextStage();$("frequency").value=STAGES[app.stageIndex].freq');
  const monitor=()=>{
    e('monitorAtis()');
    assert.equal(e('app.stageComplete'),false,'ATIS must wait for audio');
    e('lastSpeech.onend()');
    assert.equal(e('app.stageComplete'),true);
  };
  const assertPhase=phase=>assert.equal(e('app.phase'),phase,e('app.lastATC?.visual'));
  e('$("frequency").value=STAGES[0].freq');
  monitor();next();
  return {q,e,call,next,monitor,assertPhase};
}

for(const mode of ['on','off']){
  const {e,call,next,monitor}=session(mode);
  const initial={
    clearance:()=>e('STAGES[app.stageIndex].facility+", "+app.config.aircraft+" is a Cessna 172 at "+app.config.location+", information "+app.config.atis+", request VFR flight following to "+destAirport().name+", "+app.config.altitude'),
    ground:()=>e('STAGES[app.stageIndex].facility+", "+app.config.aircraft+", "+app.config.location+", information "+app.config.atis+", request taxi runway "+app.config.runway'),
    tower:()=>e('STAGES[app.stageIndex].facility+", "+app.config.aircraft+", holding short runway "+app.config.runway+", ready for VFR departure"'),
    departure:()=>e('"SoCal Departure, "+app.config.aircraft+", "+app.config.altitude'),
    enroute:()=>e('"SoCal, "+app.config.aircraft+", level at "+app.config.altitude'),
    arrival:()=>e('"SoCal Approach, "+app.config.aircraft+", ten northwest, information "+app.config.arrivalAtis+", inbound "+destAirport().name+", request runway "+app.config.destRunway'),
    destTower:()=>e('STAGES[app.stageIndex].facility+", "+app.config.aircraft+", ten miles northwest, information "+app.config.arrivalAtis+", inbound runway "+app.config.destRunway'),
    destGround:()=>e('STAGES[app.stageIndex].facility+", "+app.config.aircraft+", clear of runway, request taxi to parking"')
  };
  let steps=0;
  while(steps++<60){
    if(e('app.stageComplete')){
      const final=e('app.stageIndex===STAGES.length-1');
      next();
      if(final) break;
      continue;
    }
    if(e('STAGES[app.stageIndex].type')==='atis'){monitor();continue;}
    const phase=e('app.phase'), id=e('STAGES[app.stageIndex].id');
    call(phase.endsWith('Initial') ? initial[id]() : e('app.lastATC.visual'));
  }
  assert.ok(steps<60,'Full session stalled');
  assert.equal(e('loadFlightReportHistory().length'),1);
  assert.ok(e('loadFlightReportHistory()[0].radioExchange.length')>12);
  const reopened=run(false,JSON.parse(e('JSON.stringify(Object.fromEntries([FLIGHT_REPORT_HISTORY_KEY].map(key=>[key,localStorage.getItem(key)])))'))).exec;
  assert.ok(reopened('loadFlightReportHistory()[0].radioExchange.length')>12);
  console.log(mode+': full flight and saved exchange passed');
}

for(const extended of [false,true]){
  const {q,e,call,next,assertPhase}=session('pattern');
  const cs=e('app.config.aircraft'), side=e('app.config.departureTraffic'), other=side==='left'?'right':'left';
  const ground=()=>{
    call('Long Beach Ground, '+cs+', '+e('app.config.location')+', information '+e('app.config.atis')+', request taxi runway 26L');
    call('Runway 26L taxi via Foxtrot, '+cs);next();
  };
  ground();
  e('unexpectedEnabled=k=>k==="extendDownwind"&&'+extended);
  function circuit(number){
    call('Long Beach Tower, '+cs+', holding short runway 26L, request closed traffic');
    call('Runway 26L cleared for takeoff, '+other+' traffic, '+cs);
    assertPhase('patternTakeoffReadback');
    assert.match(e('$("feedback").textContent'),new RegExp(side+' traffic'));
    call('Runway 30 cleared for takeoff, '+side+' traffic, '+cs);
    assertPhase('patternTakeoffReadback');
    call('Runway 26L cleared for takeoff, '+side+' traffic');assertPhase('patternTakeoffReadback');
    call('Runway 26L cleared for takeoff, '+side+' traffic, '+cs);assertPhase('patternCrosswindReadback');
    call(side+' crosswind, '+cs);
    call('mid downwind runway 26L, '+cs);
    if(e('app.phase')==='patternExtendReadback'){
      call('Extend downwind, you will call base, '+cs);
      assertPhase('patternAwaitBase');
      call(side+' base, '+cs);assertPhase('patternAwaitBase');
      q.flush();
    }
    assertPhase('patternBaseReadback');
    call(side+' base, '+cs);assertPhase('patternLandingReadback');
    call('Runway 26L cleared to land, '+cs);
    assertPhase('patternClearRunway');
    call('Clear of the runway, '+cs);call('Ground 119.4, '+cs);
    assertPhase('patternGroundHandoffReadback');
    call('Ground 133.0, '+cs);
    assert.equal(e('app.session.circuits'),number);
  }
  circuit(1);
  e('choosePatternContinuation(true);$("frequency").value=STAGES[app.stageIndex].freq');
  call('Long Beach Ground, '+cs+', request taxi to parking');
  assertPhase('groundInitial');
  call('Long Beach Ground, '+cs+', clear of runway, request taxi back');
  call('Runway 26L via Foxtrot, '+cs);next();
  circuit(2);
  e('choosePatternContinuation(false);$("frequency").value=STAGES[app.stageIndex].freq');
  call('Long Beach Ground, '+cs+', request taxi back');assertPhase('patternParkingInitial');
  call('Long Beach Ground, '+cs+', clear of runway, request taxi to parking');
  call('Parking via Foxtrot, '+cs);next();
  assert.equal(e('loadFlightReportHistory()[0].circuits'),2);
  assert.match(e('$("reportSummary").innerHTML'),/6\/6/);
  assert.equal(e('Object.keys(app.session.stages).length'),6);
  console.log('Pattern '+(extended?'extended':'normal')+': two circuits, parking and accurate report passed');
}

// Revisit a completed circuit and keep the selected continuation exactly once.
{
  const {e}=session('pattern');
  e('app.stageIndex=2;app.stageComplete=true;app.session.circuits=1;choosePatternContinuation(true)');
  assert.equal(e('STAGES.length'),5);
  e('previousStage()');
  assert.equal(e('app.stageIndex'),2);
  e('app.stageComplete=true;choosePatternContinuation(true)');
  assert.equal(e('STAGES.length'),5);
  assert.equal(e('app.stageIndex'),3);
  e('previousStage();app.stageComplete=true;choosePatternContinuation(false)');
  assert.equal(e('STAGES.length'),4);
  assert.equal(e('STAGES[3].id'),'parking');
  assert.equal(e('app.session.circuits'),1);
  console.log('Previous/Next and continuation changes do not duplicate circuits');
}
