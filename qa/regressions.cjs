const assert = require('node:assert/strict');
const {run} = require('./harness.cjs');
const {exec} = run();

assert.equal(exec('hasReadbackCallsign("7 to 4SP","724SP")'), true);
assert.equal(exec('hasReadbackCallsign("725 Sierra Papa","724SP")'), false);
assert.match(exec('fkNormalizeRecognition("ride downwind")'), /right downwind/);
assert.equal(exec('containsArrivalPosition("10NW")'), true);
assert.equal(exec('containsAtisCode("with information n","November")'), true);
assert.equal(exec('requestedTowerDeparture("ninety one six oh five departure")'), '91/605');
assert.equal(exec('wrongRunwayMention("runway 30","26L",airportData("KLGB"))'), '30');
assert.equal(exec('handoffFrequencies("125.5").includes(127.3)'), false);

exec('scrollToCompletedStageRadio=()=>{}; practiceSingleStage("VFR","tower")');
assert.equal(exec('tuned()'), true);
exec('reviewVoiceTransmission("", "Long Beach Tower, Cessna 725SP, holding short runway "+app.config.runway+", ready for departure")');
assert.equal(exec('app.phase'), 'towerInitial');
exec('$("pilotText").value=$("pilotText").value.replace("725SP","724SP"); $("sendTyped").click()');
assert.equal(exec('app.phase'), 'towerReadback');
assert.equal(exec('app.session.recognitionCorrections'), 1);
exec('app.stageComplete=true; nextStage()');
assert.equal(exec('loadFlightReportHistory()[0].practiceStage'), 'tower');
assert.equal(exec('loadFlightReportHistory()[0].radioExchange[0].stage'), 'tower');
exec('practiceSingleStage("IFR","clearance")');
assert.equal(exec('ifrTuned()'), true);
assert.equal(exec('IFR_APP.session.practiceStage'), 'clearance');
console.log('V5.49 regression checks passed.');

const river = run().exec;
river('$("flightFollowing").value="off"; $("direction").value="Other"; readSetup(true); practiceSingleStage("VFR","tower");');
assert.equal(river('app.config.flightFollowing'), false);
river('evaluateTransmission("Long Beach Tower, Cessna 724SP, holding short 26L, in sequence, request Left at the River.")');
assert.equal(river('app.phase'), 'towerStandby');
assert.equal(river('app.config.direction'), 'left at the river');
assert.match(river('app.lastATC.visual'), /stand by/i);
