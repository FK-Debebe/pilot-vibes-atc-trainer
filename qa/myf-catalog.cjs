const assert=require('node:assert/strict'),fs=require('node:fs'),{run}=require('./harness.cjs');
const catalogSource=fs.readFileSync(__dirname+'/../departure-procedures.js','utf8');
for(const level of ['beginner','intermediate','advanced']){
 const q=run(),e=q.exec;e(catalogSource);
 e('scrollToCompletedStageRadio=()=>{};ifr$("level").value='+JSON.stringify(level)+';ifr$("destinationAirport").value="KMYF";ifrUpdateDestinationChoices(false);ifrReadSetup();');
 assert.equal(e('ifrContainsTaxiway("via Hotel, Cessna 172SP","Hotel Golf")'),false);
 assert.equal(e('IFR_APP.config.destRunway'),'28R');assert.equal(e('ifrFreq("KMYF","tower")'),'125.700');
 assert.deepEqual(JSON.parse(e('JSON.stringify(ifrApproachOptionsFor("KMYF","28R"))')),['ILS','LOC','RNAV (GPS)','Visual']);
 e('IFR_APP.stageIndex=IFR_STAGES.findIndex(s=>s.id==="destGround");ifrRenderStage();ifr$("frequency").value=IFR_STAGES[IFR_APP.stageIndex].freq');
 const call=t=>e('ifrEvaluateTransmission('+JSON.stringify(t)+')');
 call('Montgomery Ground, Cessna 172SP, clear runway 28R at Foxtrot, request taxi to parking');assert.equal(e('IFR_APP.phase'),'myfHoldShortReadback');
 call('Hold short runway 28R, Cessna 172SP');assert.equal(e('IFR_APP.phase'),'myfHoldShortReadback');
 call('Hold short runway 28L, Cessna 172SP');assert.equal(e('IFR_APP.phase'),'destGroundReadback');
 call('Taxi parking via Hotel Golf, Cessna 172SP');assert.equal(e('IFR_APP.stageComplete'),false);
 call('Cross runway 28L at Foxtrot, taxi parking via Hotel Golf, Cessna 172SP');assert.equal(e('IFR_APP.stageComplete'),true);
 e('app.config.departureAirport="KLGB";app.config.destinationAirport="KMYF";app.config.destRunway="28R"');assert.equal(e('airportFrequency(AIRPORTS.KMYF,"tower")'),'125.700');e('app.config.destRunway="28L"');assert.equal(e('airportFrequency(AIRPORTS.KMYF,"tower")'),'119.200');
 assert.equal(e('ifrContainsAirport("Montgomery Gibbs", "KMYF")'),true);
 const codes=JSON.parse(e('JSON.stringify(Object.keys(AIRPORTS))'));for(const code of codes)assert.equal(e('!!window.FK_DP_CATALOG.airports['+JSON.stringify(code)+']'),true);
 assert.equal(e('window.FK_DP_CATALOG.airports.KMYF.sids.length'),2);
}
console.log('KMYF tests passed: VFR/IFR airport data, runway-specific frequencies, approaches, hold/cross readbacks, aliases and complete setup-airport DP catalog coverage.');
