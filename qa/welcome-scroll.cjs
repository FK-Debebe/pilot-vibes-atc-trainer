const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const source=html.slice(html.indexOf('function focusFlightSetupStart(){'),html.indexOf('function showMobileIntroduction(){'));
for(const mobile of [false,true]){
 const frames=[],scrolls=[],focus=[],setupScroll=[];
 const elements={level:{focus:o=>focus.push(o)},vfrFlightSetupDetails:{scrollIntoView:o=>setupScroll.push(o)}};
 const g={$:id=>elements[id],requestAnimationFrame:f=>frames.push(f),window:{matchMedia:()=>({matches:mobile}),scrollTo:o=>scrolls.push(o)}};vm.createContext(g);vm.runInContext(source,g);g.focusFlightSetupStart();assert.equal(focus.length,0,'wait for layout');
 while(frames.length)frames.shift()();assert.equal(focus[0].preventScroll,true);
 if(mobile){assert.equal(setupScroll.length,1);assert.equal(scrolls.length,0);}else{assert.equal(scrolls.length,2);assert(scrolls.every(s=>s.top===0&&s.left===0));assert.equal(setupScroll.length,0,'avoid scrolling a tall sticky setup panel into view');}
}
assert.match(fs.readFileSync(__dirname+'/../usage-client.js','utf8'),/window.focusFlightSetupStart\(\)/);
console.log('Welcome scroll checks passed: desktop top after layout/focus restoration; mobile setup positioning preserved.');
