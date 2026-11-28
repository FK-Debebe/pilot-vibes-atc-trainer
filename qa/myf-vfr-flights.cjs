const assert=require('node:assert/strict');
const {run}=require('./harness.cjs');

function session(mode){
  const q=run(), e=q.exec;
  e('scrollToCompletedStageRadio=()=>{};unexpectedEnabled=()=>false;trafficAdvisoryEnabled=()=>false;let lastSpeech;speechSynthesis.speak=u=>lastSpeech=u;');
  e('$("destinationAirport").value="KMYF";updateDestinationChoices(false);$("flightFollowing").value='+JSON.stringify(mode)+';applyVFRSetup()');
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
