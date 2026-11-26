const assert=require('node:assert/strict'),{run}=require('./harness.cjs');
for(const level of ['beginner','intermediate','advanced']){
 const q=run(),e=q.exec;
 e('scrollToCompletedStageRadio=()=>{};ifr$("level").value='+JSON.stringify(level)+';ifrReadSetup();IFR_APP.config.destRunway="24";IFR_APP.config.approachType="ILS";');
 const reset=()=>e('IFR_APP.stageIndex=IFR_STAGES.findIndex(s=>s.id==="destTower");ifrRenderStage();ifr$("frequency").value=IFR_STAGES[IFR_APP.stageIndex].freq');
 const call=t=>e('ifrEvaluateTransmission('+JSON.stringify(t)+')');
 for(const pos of ['5E','5 E','five miles east','10NW','established ILS','final']){
  reset();call('Palomar Tower, Cessna 172SP, '+pos+', runway 24');
  assert.equal(e('IFR_APP.phase'),'destTowerReadback',pos+': '+e('ifr$("feedback").textContent'));
  assert.equal(e('IFR_APP.stageComplete'),false);
  call('Runway 24, cleared to land, Cessna 172SP');assert.equal(e('IFR_APP.stageComplete'),true);
 }
 reset();call('Palomar Tower, Cessna 172SP, runway 24');
 assert.equal(e('IFR_APP.phase'),'destTowerInitial');assert.match(e('IFR_APP.lastATC.visual'),/say again position or approach status\.$/);
 reset();call('Palomar Tower, Cessna 172SP, 5E, runway 6');
 assert.equal(e('IFR_APP.phase'),'destTowerInitial');assert.match(e('IFR_APP.lastATC.visual'),/say again runway 24\.$/);
 reset();call('Palomar Tower, Cessna 127SP, 5E, runway 24');
 assert.equal(e('IFR_APP.phase'),'destTowerInitial');assert.match(e('IFR_APP.lastATC.visual'),/say again your callsign\.$/);
}
console.log('IFR Destination Tower accepts 5E, compact/spoken positions and approach status at all levels; landing readback and specific corrections verified');
