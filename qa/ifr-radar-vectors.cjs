const assert=require('node:assert/strict');const {run}=require('./harness.cjs');
for(const level of ['beginner','intermediate','advanced']){
 const q=run(),e=q.exec;
 e('scrollToCompletedStageRadio=()=>{};ifr$("direction").value="Radar Vectors";ifr$("level").value='+JSON.stringify(level)+';ifr$("altitude").value="5000";ifrReadSetup();');
 const stage=id=>e('IFR_APP.stageIndex=IFR_STAGES.findIndex(s=>s.id==='+JSON.stringify(id)+');ifrRenderStage();ifr$("frequency").value=IFR_STAGES[IFR_APP.stageIndex].freq');
 const call=t=>e('ifrEvaluateTransmission('+JSON.stringify(t)+')');
 assert.equal(e('IFR_APP.config.route'),'Radar Vectors');
 assert.equal(e('ifrRouteReadbackOK("radar vectors")'),true,'clearance routing descriptor remains valid');
 stage('departure');call('SoCal, Cessna 172SP, passing 1000 climbing 3000');
 assert.equal(e('IFR_APP.phase'),'departureReadback');
 assert.match(e('IFR_APP.lastATC.visual'),/Fly heading 260\./);
 assert.doesNotMatch(e('IFR_APP.lastATC.visual'),/proceed radar vectors/i);
 for(const text of ['5000 radar vectors Cessna 172SP','heading 250 climb 5000 Cessna 172SP','heading 260 climb 5000','heading 260 climb 6000 Cessna 172SP']){
  call(text);assert.equal(e('IFR_APP.stageComplete'),false,text);
 }
 assert.equal(e('ifrRadarHeadingReadbackOK("heading two six zero, Cessna 172SP")'),true);
 assert.equal(e('ifrRadarHeadingReadbackOK("heading two six oh, Cessna 172SP")'),true);
 call('heading two six zero, climb and maintain 5000, Cessna 172SP');
 assert.equal(e('IFR_APP.stageComplete'),true,e('ifr$("feedback").textContent'));
 stage('enroute');call('SoCal, Cessna 172SP level 5000');
 assert.equal(e('IFR_APP.phase'),'enrouteReadback');
 assert.match(e('IFR_APP.lastATC.visual'),/continue heading 260/);
 call('radar vectors descend 4000 expect ILS Cessna 172SP');assert.equal(e('IFR_APP.stageComplete'),false);
 call('heading 260 descend 4000 expect ILS Cessna 172SP');assert.equal(e('IFR_APP.stageComplete'),true,e('ifr$("feedback").textContent'));
 e('IFR_APP.config.runway="09"');assert.equal(e('ifrRadarHeading()'),'090');
 assert.equal(e('ifrRadarHeadingReadbackOK("heading zero niner zero")'),true);
 assert.equal(e('ifrRadarHeadingReadbackOK("heading 090")'),true);
 assert.equal(e('ifrRadarHeadingReadbackOK("heading 0900")'),false);
}
console.log('Radar-vector heading instructions and numeric/spoken readbacks passed at all training levels.');
