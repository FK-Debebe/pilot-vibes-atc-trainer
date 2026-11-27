const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const fn=html.slice(html.indexOf('function showMobileIntroduction(){'),html.indexOf('document.addEventListener("DOMContentLoaded",()=>{',html.indexOf('function showMobileIntroduction(){')));
for(const mobile of [false,true]){
 const el={},events=[];for(const id of ['mobileIntroduction','page-ifr-trainer','page-trainer','ifrFlightSetupDetails','vfrFlightSetupDetails','confirmMobileIntroduction'])el[id]={open:false,classList:{add(){}},addEventListener(){},showModal(){this.open=true},close(){this.open=false},focus(){}};
 const g={$:id=>el[id],window:{matchMedia:()=>({matches:mobile}),FKUsage:{},dispatchEvent:e=>events.push(e.type)},Event:class{constructor(type){this.type=type}},showAppPage(){}};vm.createContext(g);vm.runInContext(fn,g);g.showMobileIntroduction();assert(el.mobileIntroduction.open);el.confirmMobileIntroduction.onclick();assert(!el.mobileIntroduction.open);assert.deepEqual(events,['fk-welcome-complete']);
}
const popup=html.split('<dialog id="mobileIntroduction"')[1].split('</dialog>')[0];assert.match(popup,/Sign in with Google/);assert.match(popup,/Note your callsign and starting location/);assert(!popup.includes('remembered'));assert.match(popup,/Got it — start practicing/);assert.match(html,/#mobileIntroduction ol\{[\s\S]*?overflow-y:auto/);
console.log('Welcome popup verified on desktop and mobile; approved copy, scroll container and sign-in handoff preserved.');
