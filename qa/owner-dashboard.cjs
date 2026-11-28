const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
class E{constructor(){this.value='';this.children=[];this.events={};this.disabled=false;this.checked=false;}addEventListener(k,f){this.events[k]=f}appendChild(e){this.children.push(e)}append(...es){this.children.push(...es)}replaceChildren(...es){this.children=es}remove(){}click(){this.events.click?.()}reset(){for(const [id,e]of Object.entries(els)){e.value=defaults[id]||'';e.checked=false;}}}
const source=fs.readFileSync(__dirname+'/../usage-dashboard.js','utf8');
const formatSource=source.slice(source.indexOf(' function duration('),source.indexOf(' let offset='));
const formatContext={};vm.createContext(formatContext);vm.runInContext(formatSource,formatContext);
for(const [seconds,expected] of [[0,'00:00:00'],[59,'00:00:59'],[60,'00:01:00'],[3661,'01:01:01'],[90061,'25:01:01'],[360000,'100:00:00']])assert.equal(formatContext.duration(seconds),expected);
const defaults={range:'all',sort:'recent'},els={};for(const id of ['range','start','end','search','mode','kind','country','region','city','sort','excludeSelf','filterFields','filters','refresh','export','previous','more','status','people','summary','empty','pageInfo','rangeNote','coverage','lastRefresh','reset']){els[id]=new E;els[id].value=defaults[id]||'';}
const rows=Array.from({length:101},(_,i)=>({display_name:i===0?'=HYPERLINK("bad")':'Pilot '+i,kind:'member',country:'US',region:'California',city:'Long Beach',vfr_seconds:3600,ifr_seconds:1800,unknown_seconds:0,active_seconds:5400,last_seen:100000}));
let mode='ok',requests=[],blob;
class TestURL extends URL{static createObjectURL(b){blob=b;return 'blob:test'}static revokeObjectURL(){}}
const g={window:null,document:{getElementById:id=>els[id],createElement:()=>new E,body:new E},FK_USAGE_CONFIG:{apiBase:'https://api.example'},localStorage:{getItem:()=> 'a'.repeat(64)},sessionStorage:{getItem:()=>null},URLSearchParams,URL:TestURL,Blob,Date,setTimeout:()=>{},console,
fetch:async url=>{requests.push(url);if(mode==='403')return {ok:false,status:403,json:async()=>({error:'Owner access only'})};const p=new URL(url).searchParams,start=Number(p.get('offset')||0),data={people:rows.slice(start,start+100),summary:{people:101,active_seconds:545400,vfr_seconds:363600,ifr_seconds:181800,unknown_seconds:0},nextOffset:start===0?100:null,dailySince:'2026-11-28T00:00:00Z'};return {ok:true,json:async()=>mode==='old'?{people:[],summary:{people:0}}:data}}};g.window=g;vm.createContext(g);vm.runInContext(fs.readFileSync(__dirname+'/../usage-dashboard.js','utf8'),g);
const settle=async()=>{for(let i=0;i<60;i++)await Promise.resolve()};
(async()=>{
 await settle();assert.equal(els.people.children.length,100);assert.equal(els.summary.children.length,4);assert.equal(els.summary.children[1].children[1].textContent,'151:30:00');assert.equal(els.people.children[0].children[6].textContent,'01:30:00');assert.equal(els.export.disabled,false);assert.match(els.coverage.textContent,/Earlier time/);
 els.more.click();await settle();assert.equal(els.people.children.length,1);assert.match(els.pageInfo.textContent,/101–101/);assert.equal(els.more.disabled,true);
 els.previous.click();await settle();assert.equal(els.people.children.length,100);
 els.range.value='custom';els.range.events.change();els.start.value='2026-11-01';els.end.value='2026-11-27';els.mode.value='ifr';els.excludeSelf.checked=true;els.search.value='Pilot';els.filters.events.submit({preventDefault(){}});await settle();let p=new URL(requests.at(-1)).searchParams;assert.equal(p.get('mode'),'ifr');assert.equal(p.get('excludeSelf'),'1');assert.equal(p.get('start'),'2026-11-01');
 els.export.click();await settle();assert.match(els.status.textContent,/Exported 101/);const csv=await blob.text();assert.equal(csv.split('\r\n').length,102);assert.match(csv,/'=HYPERLINK/,'protect spreadsheet formula injection');assert.match(csv,/2026-11-01/);assert.match(csv,/Total time \(hh:mm:ss\)/);assert.match(csv,/01:30:00/);
 els.start.value='2026-12-01';els.filters.events.submit({preventDefault(){}});await settle();assert.match(els.status.textContent,/Start date/);
 els.reset.click();await settle();p=new URL(requests.at(-1)).searchParams;assert.equal(p.has('start'),false);assert.equal(p.has('excludeSelf'),false);
 mode='403';els.refresh.click();await settle();assert.match(els.status.textContent,/Owner verification/);assert.equal(els.export.disabled,true);assert.equal(els.people.children.length,0);
 mode='old';els.refresh.click();await settle();assert.match(els.status.textContent,/migration/);
 console.log('Owner dashboard UI checks passed: filters, date validation, reset, pagination, safe full-result CSV, stale access and old-backend messages.');
})().catch(e=>{console.error(e);process.exit(1)});
