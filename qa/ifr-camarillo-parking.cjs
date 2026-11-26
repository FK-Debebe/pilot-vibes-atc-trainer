const assert=require('node:assert/strict'),{run}=require('./harness.cjs');
for(const level of ['beginner','intermediate','advanced']){
 const q=run(),e=q.exec;
 e('scrollToCompletedStageRadio=()=>{};ifr$("level").value='+JSON.stringify(level)+';ifr$("destinationAirport").value="KCMA";ifrUpdateDestinationChoices(false);ifr$("arrivalParking").value="transient";ifrReadSetup();');
 assert.equal(e('IFR_APP.config.arrivalParking'),'transient');
 assert.equal(e('[...ifr$("arrivalParking").options].find(o=>o.value==="transient").disabled'),false);
 e('IFR_APP.stageIndex=IFR_STAGES.findIndex(s=>s.id==="destGround");ifrRenderStage();ifr$("frequency").value=IFR_STAGES[IFR_APP.stageIndex].freq');
 const call=t=>e('ifrEvaluateTransmission('+JSON.stringify(t)+')');
 call('Camarillo Ground, Cessna 172SP, clear runway 26, request taxi to transient parking');
 assert.equal(e('IFR_APP.phase'),'destGroundReadback');
 assert.match(e('IFR_APP.lastATC.visual'),/taxi to transient parking via Foxtrot/);
 call('Taxi to transient parking via Alpha, Cessna 172SP');
 assert.equal(e('IFR_APP.stageComplete'),false);
 call('Taxi to transient parking via Foxtrot, Cessna 172SP');
 assert.equal(e('IFR_APP.stageComplete'),true);
}
console.log('Camarillo transient parking via Foxtrot and correct readback verified at all three levels.');
