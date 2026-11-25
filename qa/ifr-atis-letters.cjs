const assert=require('node:assert/strict');
const {run}=require('./harness.cjs');
const q=run(),e=q.exec;
for(const code of e('ATIS_CODES.slice()')){
 const letter=code[0];
 for(const input of ['information '+letter,'information '+letter.toLowerCase(),'information '+code]){
  assert.equal(e('containsAtisCode(norm(ifrNormalizeAviationTranscript('+JSON.stringify(input)+')),'+JSON.stringify(code)+')'),true);
 }
}
e('ifr$("departureAirport").value="KCMA";ifr$("destinationAirport").value="KCRQ";ifr$("callsign").value="724SP";ifr$("location").value="Main Ramp";ifrReadSetup();IFR_APP.config.atis="Foxtrot";IFR_APP.stageIndex=IFR_STAGES.findIndex(s=>s.id==="clearance");ifrRenderStage();ifr$("frequency").value=IFR_STAGES[IFR_APP.stageIndex].freq');
e('ifrEvaluateTransmission("Camarillo Clearance, Cessna 724SP, at the main ramp, with information F, IFR to Palomar.")');
assert.equal(e('IFR_APP.phase'),'clearanceReadback',e('ifr$("feedback").textContent'));
console.log('All ATIS letters and exact Camarillo IFR clearance call accepted');
