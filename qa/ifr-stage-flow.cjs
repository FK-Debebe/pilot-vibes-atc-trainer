const assert=require('node:assert/strict');const {run}=require('./harness.cjs');
function setup(level='beginner',airport='KLGB'){
 const q=run(),e=q.exec;
 e('scrollToCompletedStageRadio=()=>{};let lastUtterance;speechSynthesis.speak=u=>lastUtterance=u;ifr$("departureAirport").value='+JSON.stringify(airport)+';ifr$("level").value='+JSON.stringify(level)+';ifr$("altitude").value="5000";ifrReadSetup();');
 const stage=id=>e('IFR_APP.stageIndex=IFR_STAGES.findIndex(s=>s.id==='+JSON.stringify(id)+');ifrRenderStage();ifr$("frequency").value=IFR_STAGES[IFR_APP.stageIndex].freq');
 const call=t=>e('ifrEvaluateTransmission('+JSON.stringify(t)+')');
 return {q,e,stage,call};
}
{
 const {e,stage,call}=setup();stage('atis');e('ifrMonitorAtis()');
 assert.equal(e('IFR_APP.stageComplete'),false);assert.equal(e('ifr$("feedback").textContent'),'ATIS transmission in progress.');
 e('lastUtterance.onend()');
 assert.equal(e('IFR_APP.stageComplete'),true);
 assert.equal(e('ifr$("feedback").textContent'),'ATIS complete. Click Next to tune in to Clearance Delivery.');
 stage('clearance');
 call(e('IFR_STAGES[IFR_APP.stageIndex].facility+", Cessna 172SP at "+IFR_APP.config.location+", information "+IFR_APP.config.atis+", IFR to Palomar"'));
 assert.equal(e('IFR_APP.phase'),'clearanceReadback');
 call(e('IFR_APP.lastATC.visual'));
 assert.equal(e('IFR_APP.stageComplete'),true,e('ifr$("feedback").textContent'));
 assert.equal(e('ifr$("feedback").textContent'),'IFR Clearance complete. Click Next and tune in to Ground frequency.');
 stage('ground');
 call(e('IFR_STAGES[IFR_APP.stageIndex].facility+", Cessna 172SP at "+IFR_APP.config.location+", request taxi runway "+IFR_APP.config.runway'));
 assert.equal(e('IFR_APP.phase'),'groundReadback');
 call(e('"Runway "+IFR_APP.config.runway+", taxi via "+IFR_APP.taxiway+", Cessna 172SP"'));
 assert.equal(e('ifr$("feedback").textContent'),'Ground session complete. Click Next to tune to Tower frequency.');
 stage('tower');
 call('Long Beach Tower, Cessna 172SP holding short runway 26L, ready for IFR departure');
 assert.equal(e('IFR_APP.phase'),'towerReadback');
 assert.match(e('IFR_APP.lastATC.visual'),/cleared for takeoff. Fly runway heading\.$/);
 assert.doesNotMatch(e('IFR_APP.lastATC.visual'),/Contact Departure/);
 call('Runway 26L cleared for takeoff, fly runway heading, Cessna 172SP');
 assert.equal(e('IFR_APP.phase'),'towerHandoffReadback');
 assert.equal(e('IFR_APP.stageComplete'),false);
 assert.equal(e('ifr$("next").disabled'),true);
 assert.match(e('IFR_APP.lastATC.visual'),/frequency change approved\. Contact SoCal Departure/);
 call('Departure 119.4, Cessna 172SP');assert.equal(e('IFR_APP.stageComplete'),false);
 call(e('"Departure "+ifrFreq(IFR_APP.config.departureAirport,"departure")'));
 assert.equal(e('IFR_APP.stageComplete'),false,'handoff requires callsign');
 call(e('"Departure "+ifrFreq(IFR_APP.config.departureAirport,"departure")+", Cessna 172SP"'));
 assert.equal(e('IFR_APP.stageComplete'),true);
 assert.equal(e('ifr$("feedback").textContent'),e('"Tower session complete. Click Next to tune in to "+IFR_STAGES[IFR_APP.stageIndex+1].facility+" "+IFR_STAGES[IFR_APP.stageIndex+1].freq+"."'));
}
for(const level of ['beginner','intermediate','advanced']){
 const {e,stage,call}=setup(level);stage('departure');
 call('SoCal, Cessna 127SP, IFR to Palomar, passing 1000 climbing 3000');
 assert.equal(e('IFR_APP.phase'),'departureInitial');
 assert.equal(e('ifr$("feedback").textContent'),'Departure check-in incomplete: callsign.');
 assert.match(e('IFR_APP.lastATC.visual'),/say again your callsign/);
 assert.doesNotMatch(e('IFR_APP.lastATC.visual'),/say altitude/);
 call('SoCal, Cessna 172SP, IFR to Palomar, passing 1000 climbing 3000');
 assert.equal(e('IFR_APP.phase'),'departureReadback',e('ifr$("feedback").textContent'));
 stage('departure');call('SoCal, Cessna 172SP, climbing 3000');
 assert.match(e('IFR_APP.lastATC.visual'),/say again passing altitude/);
}
{
 const {e,stage}=setup('beginner','KFUL');stage('atis');e('ifrMonitorAtis();lastUtterance.onend()');
 assert.equal(e('ifr$("feedback").textContent'),'ATIS complete. Click Next to tune in to Ground for clearance.');
}
console.log('IFR ATIS audio completion, clearance/Ground actions, separate Tower handoff/readback, and accurate Departure feedback passed at all levels');
