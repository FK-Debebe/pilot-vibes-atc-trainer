const assert=require('node:assert/strict');
const {run}=require('./harness.cjs');

for(const side of ['left','right']){
  const q=run(),{exec}=q;
  exec('$("flightFollowing").value="pattern";applyVFRSetup();app.stageIndex=2;renderStage();$("frequency").value=STAGES[2].freq;unexpectedEnabled=()=>false;trafficAdvisoryEnabled=()=>false');
  exec('app.config.departureTraffic='+JSON.stringify(side));
  const callsign=exec('app.config.aircraft');
  const call=text=>exec('evaluateTransmission('+JSON.stringify(text+', '+callsign)+')');
  call('Long Beach Tower, holding short runway two six left, request closed traffic');
  call('Runway two six left, clear for takeoff, '+(side==='left'?'right':'left')+' traffic');
  assert.equal(exec('app.phase'),'patternTakeoffReadback');
  call('Runway two six left, clear for takeoff, '+side+' traffic');
  assert.equal(exec('app.phase'),'patternCrosswindReadback');
  assert.match(exec('$("feedback").textContent'),/crosswind/);
  call(side+' crosswind');
  assert.equal(exec('app.phase'),'patternDownwindReadback');
  assert.match(exec('$("feedback").textContent'),/extend downwind/);
  call('Extend downwind runway two six left');
  assert.equal(exec('app.phase'),'patternAwaitBase');
  q.flush();call(side+' base');
  assert.equal(exec('app.phase'),'patternLandingReadback');
  assert.match(exec('$("feedback").textContent'),/cleared to land/);
}
console.log('Runway Left and traffic directions are checked independently');
