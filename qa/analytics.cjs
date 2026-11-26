const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture({id='G-TEST123',choice,privacy=false}={}){
 let now=1000000;const events={},windowEvents={},intervals=[],store={},cookies={};
 if(choice)store['fk-atc-analytics-consent-v1']=choice;
 class E{
  constructor(tag){this.tagName=tag;this.children=[];this.events={};this.id='';}
  appendChild(e){e.parent=this;this.children.push(e);return e;}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
  setAttribute(k,v){this[k]=v;}
  addEventListener(k,f){this.events[k]=f;}
  all(){return [this,...this.children.flatMap(x=>x.all())];}
 }
 const body=new E('body'),head=new E('head');
 const document={body,head,visibilityState:'visible',querySelector:()=>null,getElementById:id=>body.all().find(x=>x.id===id),createElement:t=>new E(t),addEventListener:(k,f)=>{(events[k]??=[]).push(f);}};
 Object.defineProperty(document,'cookie',{get:()=>Object.entries(cookies).map(([k,v])=>k+'='+v).join('; '),set:s=>{const [k,v]=s.split(';')[0].split('=');if(s.includes('Max-Age=0'))delete cookies[k];else cookies[k]=v;}});
 const g={document,navigator:{globalPrivacyControl:privacy},location:{origin:'https://trainer.example',pathname:'/app/index.html',search:'?callsign=PRIVATE'},
  localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},FK_ANALYTICS_CONFIG:{measurementId:id,debug:false},
  Date:class extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}},
  setInterval:f=>intervals.push(f),addEventListener:(k,f)=>{(windowEvents[k]??=[]).push(f);}};
 g.window=g;vm.createContext(g);vm.runInContext(fs.readFileSync(__dirname+'/../analytics.js','utf8'),g);
 const button=label=>body.all().find(x=>x.textContent===label)?.events.click();
 const ev=()=>Array.from(g.dataLayer||[]).map(a=>Array.from(a)).filter(a=>a[0]==='event');
 const tick=ms=>{now+=ms;intervals.forEach(f=>f());};
 const dispatch=type=>events[type]?.forEach(f=>f());
 return {g,document,body,head,button,events:ev,tick,dispatch,store,cookies,now:()=>now};
}
{
 const q=fixture({id:''});assert.equal(q.head.children.length,0);assert.equal(q.g.FKAnalytics.status().configured,false);
 q.button('Analytics privacy');assert.match(q.body.all().map(x=>x.textContent||'').join(' '),/not connected/);
}
for(const options of [{choice:'denied'},{choice:'granted',privacy:true}]){
 const q=fixture(options);assert.equal(q.head.children.length,0);assert.equal(q.g.FKAnalytics.status().enabled,false);
}
{
 const q=fixture();assert.equal(q.head.children.length,0);
 q.g.FKAnalytics.start('vfr','on','atis');assert.equal(q.events().length,0);
 q.button('Allow usage analytics');const a=q.g.FKAnalytics;
 assert.equal(q.head.children.length,1);assert.equal(a.status().enabled,true);
 assert.equal(q.store['fk-atc-analytics-consent-v1'],'granted');
 a.page('ifr-trainer');a.page('ifr-trainer');assert.equal(q.events().filter(x=>x[1]==='page_view').length,2);
 a.start('ifr','ifr','clearance');a.start('ifr','ifr','clearance');
 a.stageComplete('ifr','clearance');a.stageComplete('ifr','clearance');
 assert.equal(q.events().filter(x=>x[1]==='trainer_training_start').length,1);
 assert.equal(q.events().filter(x=>x[1]==='trainer_stage_complete').length,1);
 q.tick(90000);
 const total=()=>q.events().filter(x=>x[1]==='trainer_active_time').reduce((n,x)=>n+x[2].active_seconds,0);
 assert.equal(total(),60);
 q.document.visibilityState='hidden';q.dispatch('visibilitychange');q.tick(120000);assert.equal(total(),60);
 q.document.visibilityState='visible';q.dispatch('visibilitychange');q.tick(30000);assert.equal(total(),90);
 a.complete('ifr');a.complete('ifr');assert.equal(q.events().filter(x=>x[1]==='trainer_training_complete').length,1);
 a.page('trainer');a.start('vfr','pattern','tower','tower-1');a.stageComplete('vfr','tower','tower-1');a.stageComplete('vfr','tower','tower-1');
 a.patternChoice(true);a.stageStart('vfr','tower','tower-2');a.stageComplete('vfr','tower','tower-2');
 assert.equal(q.events().filter(x=>x[1]==='trainer_stage_complete'&&x[2].trainer_mode==='vfr').length,2);
 a.abandon('vfr');a.abandon('vfr');assert.equal(q.events().filter(x=>x[1]==='trainer_training_abandon').length,1);
 a.start('vfr','off','atis');assert.equal(q.events().filter(x=>x[1]==='trainer_training_start'&&x[2].flight_type==='no_flight_following').length,1);
 const allowed=new Set(['section','app_version','page_location','page_title','trainer_mode','flight_type','stage_id','active_seconds','activity_kind','transport_type','pattern_action']);
 for(const row of q.events())for(const key of Object.keys(row[2]))assert.ok(allowed.has(key),key);
 assert.ok(!JSON.stringify(q.events()).includes('PRIVATE'));
 q.cookies._ga='123';q.cookies._ga_TEST123='456';q.cookies.unrelated='keep';
 q.button('Analytics privacy');q.button('No thanks');
 assert.equal(q.cookies._ga,undefined);assert.equal(q.cookies.unrelated,'keep');
 assert.equal(a.status().enabled,false);const count=q.events().length;a.start('vfr','on','ground');q.tick(30000);assert.equal(q.events().length,count);
 assert.equal(q.g['ga-disable-G-TEST123'],true);
}
// App integration, using a spy instead of any remote analytics service.
{
 const {run}=require('./harness.cjs');const q=run(),e=q.exec;
 e('const telemetry=[];window.FKAnalytics=new Proxy({},{get:(_,name)=>(...args)=>telemetry.push([name,...args])});scrollToCompletedStageRadio=()=>{};applyVFRSetup();app.stageIndex=STAGES.findIndex(s=>s.id==="ground");renderStage();$("frequency").value=STAGES[app.stageIndex].freq;evaluateTransmission(STAGES[app.stageIndex].facility+", Cessna 172SP, main ramp, information "+app.config.atis+", request taxi runway "+app.config.runway);recordStageComplete();');
 assert.equal(e('telemetry.filter(x=>x[0]==="start"&&x[1]==="vfr").length'),1);
 assert.equal(e('telemetry.some(x=>x[0]==="stageComplete"&&x[1]==="vfr")'),true);
 e('ifrReadSetup();IFR_APP.stageIndex=IFR_STAGES.findIndex(s=>s.id==="ground");ifrRenderStage();ifr$("frequency").value=IFR_STAGES[IFR_APP.stageIndex].freq;ifrEvaluateTransmission(IFR_STAGES[IFR_APP.stageIndex].facility+", Cessna 172SP, main ramp, information "+IFR_APP.config.atis+", request taxi");ifrRecordStageComplete();');
 assert.equal(e('telemetry.filter(x=>x[0]==="start"&&x[1]==="ifr").length'),1);
 assert.equal(e('telemetry.some(x=>x[0]==="stageComplete"&&x[1]==="ifr")'),true);
 assert.ok(!e('JSON.stringify(telemetry)').includes('172SP'));
}
console.log('Analytics checks passed: consent/off states, privacy signals, active/idle/background time, section/flight types, completion deduplication, cookie withdrawal and VFR/IFR hooks');
