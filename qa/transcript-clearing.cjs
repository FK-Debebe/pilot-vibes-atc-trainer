const assert=require('node:assert/strict');
const {run}=require('./harness.cjs');
for(const more of [true,false]){
  const q=run(),e=q.exec;
  e('scrollToCompletedStageRadio=()=>{};$("flightFollowing").value="pattern";applyVFRSetup();app.stageIndex=2;renderStage();app.stageComplete=true;append("pilot","PILOT","Retained circuit call");$("transcript").innerHTML="Old circuit"');
  const count=e('vfrRadioExchange.length');
  e('choosePatternContinuation('+more+')');
  assert.ok(!e('$("transcript").innerHTML').includes('Old circuit'));
  assert.ok(e('vfrRadioExchange.length')>=count);
  assert.ok(e('vfrRadioExchange.some(x=>x.text==="Retained circuit call")'));
}
const q=run(),e=q.exec;
e('scrollToCompletedStageRadio=()=>{};applyVFRSetup();app.stageIndex=STAGES.length-1;renderStage();append("pilot","PILOT","Retained final call");$("transcript").innerHTML="Old session";completeStage()');
assert.equal(e('$("transcript").innerHTML'),'');
e('renderFinalReport()');
assert.ok(e('loadFlightReportHistory()[0].radioExchange.some(x=>x.text==="Retained final call")'));
console.log('Circuit and session displays clear; saved transcripts remain complete');
