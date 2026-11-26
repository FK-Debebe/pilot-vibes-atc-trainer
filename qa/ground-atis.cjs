const assert=require('node:assert/strict');const {run}=require('./harness.cjs');
for(const mode of ['vfr','ifr']) for(const prior of [false,true]){
 const q=run(),e=q.exec;
 if(mode==='vfr'){
  e('applyVFRSetup();app.config.atis="Foxtrot";app.stageIndex=STAGES.findIndex(s=>s.id==="clearance");renderStage();$("frequency").value=STAGES[app.stageIndex].freq');
  if(prior){e('evaluateTransmission(STAGES[app.stageIndex].facility+", "+app.config.aircraft+" is a Cessna 172 at "+app.config.location+", information Foxtrot, request flight following to "+destAirport().name+", "+app.config.altitude)');assert.equal(e('app.session.clearanceAtis'),'Foxtrot');}
  e('app.stageIndex=STAGES.findIndex(s=>s.id==="ground");renderStage();$("frequency").value=STAGES[app.stageIndex].freq;evaluateTransmission(STAGES[app.stageIndex].facility+", "+app.config.aircraft+", "+app.config.location+", request taxi runway "+app.config.runway)');
  assert.equal(e('app.phase!=="groundInitial"'),prior);
 }else{
  e('ifrReadSetup();IFR_APP.config.atis="Foxtrot";IFR_APP.stageIndex=IFR_STAGES.findIndex(s=>s.id==="clearance");ifrRenderStage();ifr$("frequency").value=IFR_STAGES[IFR_APP.stageIndex].freq');
  if(prior){e('ifrEvaluateTransmission(IFR_STAGES[IFR_APP.stageIndex].facility+", Cessna 172SP, at "+IFR_APP.config.location+", information F, IFR to Palomar")');assert.equal(e('IFR_APP.session.clearanceAtis'),'Foxtrot');}
  e('IFR_APP.stageIndex=IFR_STAGES.findIndex(s=>s.id==="ground");ifrRenderStage();ifr$("frequency").value=IFR_STAGES[IFR_APP.stageIndex].freq;ifrEvaluateTransmission(IFR_STAGES[IFR_APP.stageIndex].facility+", Cessna 172SP, at "+IFR_APP.config.location+", request taxi")');
  assert.equal(e('IFR_APP.phase!=="groundInitial"'),prior);
 }
 assert.equal(e('groundAtisSatisfied("information G","Foxtrot",{clearanceAtis:"Foxtrot"})'),false);
 assert.equal(e('groundAtisSatisfied("request taxi","Golf",{clearanceAtis:"Foxtrot"})'),false);
}
console.log('VFR/IFR Ground accepts omitted ATIS only after clearance; wrong or changed codes still fail');
