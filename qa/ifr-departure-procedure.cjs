const assert=require('node:assert/strict'),{run}=require('./harness.cjs');
for(const level of ['beginner','intermediate','advanced']){
 const q=run(),e=q.exec;e('scrollToCompletedStageRadio=()=>{};ifr$("level").value='+JSON.stringify(level)+';ifrReadSetup();IFR_APP.config.departureProcedure="anaheim2";IFR_APP.config.runway="26L"');
 assert.equal(e('ifrSelectedSID().name'),'ANAHEIM TWO');assert.equal(e('ifrSIDReadbackOK("Anaheim one departure, vectors Seal Beach")'),false);assert.equal(e('ifrSIDReadbackOK("Anaheim 2 departure vectors SLI")'),true);
 for(const [rw,heading,freq] of [['8R',76,'125.350'],['12',121,'125.350'],['26L',256,'127.200'],['26R',256,'127.200'],['30',301,'127.200']]){
  e('IFR_APP.config.runway='+JSON.stringify(rw));assert.equal(e('ifrSelectedSID().heading'),heading);assert.equal(e('ifrFreq("KLGB","departure")'),freq);
 }
 e('IFR_APP.config.runway="26L";IFR_APP.stageIndex=1;ifrRenderStage();ifr$("frequency").value=IFR_STAGES[1].freq;IFR_APP.phase="clearanceReadback"');
 const call=t=>e('ifrEvaluateTransmission('+JSON.stringify(t)+')');
 const rb=e('"Cleared to Palomar, as filed, maintain "+ifrClearanceInitialAltitude()+", expect "+ifrAltitudeNumber()+" ten minutes after departure, departure 127.2, squawk "+IFR_APP.squawk+", Cessna 172SP"');
 call(rb);assert.equal(e('IFR_APP.stageComplete'),false);assert.match(e('IFR_APP.lastATC.visual'),/Anaheim Two/);
 call('Anaheim Two departure, radar vectors Seal Beach, '+rb);assert.equal(e('IFR_APP.stageComplete'),true);
 e('IFR_APP.stageIndex=3;ifrRenderStage();ifr$("frequency").value=IFR_STAGES[3].freq');call('Long Beach Tower, Cessna 172SP, holding short runway 26L, ready for IFR departure');assert.match(e('IFR_APP.lastATC.visual'),/heading 256/);
 call('Runway 26L cleared for takeoff heading 250, Cessna 172SP');assert.equal(e('IFR_APP.phase'),'towerReadback');
 call('Runway 26L cleared for takeoff heading 256, Cessna 172SP');assert.equal(e('IFR_APP.phase'),'towerHandoffReadback');call('SoCal Departure 127.2, Cessna 172SP');assert.equal(e('IFR_APP.stageComplete'),true);
 e('IFR_APP.config.departureAirport="KCMA"');assert.equal(e('ifrSelectedSID()'),null);assert.equal(e('ifrSIDClearance()'),'');
}
console.log('SID tests passed at all levels: revision/fix readback, runway headings/frequencies, wrong-heading rejection, separate handoff and unsupported-airport fallback.');
