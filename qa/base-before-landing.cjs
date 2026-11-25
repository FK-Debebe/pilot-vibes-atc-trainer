const assert=require('node:assert/strict');
const {run}=require('./harness.cjs');
for(const side of ['left','right']){
 const q=run(),e=q.exec;
 e('scrollToCompletedStageRadio=()=>{};unexpectedEnabled=()=>false;trafficAdvisoryEnabled=()=>false;$("flightFollowing").value="pattern";applyVFRSetup();app.config.departureTraffic='+JSON.stringify(side)+';app.stageIndex=2;renderStage();$("frequency").value=STAGES[2].freq');
 const call=t=>e('evaluateTransmission('+JSON.stringify(t+', Cessna 172SP')+')');
 call('Long Beach Tower, holding short runway 26L, request closed traffic');
 call('26L cleared for takeoff '+side+' traffic');call(side+' crosswind');
 call('Extend downwind runway 26L');
 assert.equal(e('app.phase'),'patternAwaitBase');
 call('26L cleared to land');assert.equal(e('app.phase'),'patternAwaitBase');
 q.flush();assert.equal(e('app.phase'),'patternBaseReadback');
 assert.match(e('app.lastATC.visual'),new RegExp('turn '+side+' base'));
 call('26L cleared to land');assert.equal(e('app.phase'),'patternBaseReadback');
 call('Turning '+side+' base');assert.equal(e('app.phase'),'patternLandingReadback');
 const logs=e('vfrRadioExchange.filter(x=>x.direction==="RX").map(x=>x.text)');
 assert.ok(logs.findIndex(x=>x.includes('turn '+side+' base')) < logs.findIndex(x=>x.includes('cleared to land')));
}
console.log('Left/right base instructions precede landing clearance and require readback');
