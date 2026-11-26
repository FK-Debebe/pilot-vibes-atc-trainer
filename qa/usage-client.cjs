const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/../usage-client.js','utf8');
function run({configured=true,privacy=false,declined=false}={}){
 const calls=[],store={},session={},intervals=[];
 if(declined)store['fk-atc-analytics-consent-v1']='denied';
 class E{constructor(tag){this.tag=tag;this.children=[];this.events={};}appendChild(e){e.parent=this;this.children.push(e);return e;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);this.parent=null;}setAttribute(k,v){this[k]=v;}addEventListener(k,f){this.events[k]=f;}all(){return [this,...this.children.flatMap(c=>c.all())];}get isConnected(){return !!this.parent;}}
 const body=new E('body'),head=new E('head');
 const g={window:null,document:{body,head,createElement:t=>new E(t),getElementById:id=>body.all().find(e=>e.id===id)},
  FK_USAGE_CONFIG:{apiBase:configured?'https://usage.example':'',googleClientId:'test-id'},
  navigator:{globalPrivacyControl:privacy,onLine:true},crypto:require('node:crypto').webcrypto,
  localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},
  sessionStorage:{getItem:k=>session[k]||null,setItem:(k,v)=>session[k]=v,removeItem:k=>delete session[k]},
  setInterval:f=>intervals.push(f),addEventListener(){},confirm:()=>true,
  fetch:async(url,opts)=>{
   calls.push({url,method:opts.method,body:opts.body?JSON.parse(opts.body):null});
   let data=url.endsWith('/usage')?{accepted:true}:{token:'a'.repeat(64),profile:{id:'guest-id',display_name:'Guest 1234',kind:'guest',country:'US',region:'California',city:'Long Beach',active_seconds:0},owner:false};
   return {ok:true,status:200,json:async()=>data};
  }};
 g.window=g;vm.createContext(g);vm.runInContext(source,g);
 return {g,calls,store,body,intervals};
}
async function settle(){for(let i=0;i<25;i++)await Promise.resolve();}
(async()=>{
 for(const settings of [{configured:false},{privacy:true},{declined:true}]){const q=run(settings);await settle();assert.equal(q.calls.length,0);}
 const q=run();await settle();assert.equal(q.calls.length,1);assert.ok(q.store['fk-usage-guest-v1']);
 q.g.FKUsage.record('trainer_training_start',{callsign:'PRIVATE'});await settle();assert.equal(q.calls.length,1);
 q.g.FKUsage.record('trainer_active_time',{active_seconds:30,callsign:'PRIVATE',transcript:'DO NOT SEND'});await settle();
 const usage=q.calls.find(c=>c.url.endsWith('/usage'));assert.deepEqual(Object.keys(usage.body).sort(),['id','seconds']);assert.equal(usage.body.seconds,30);
 assert.ok(!JSON.stringify(q.calls).includes('PRIVATE'));assert.ok(!JSON.stringify(q.calls).includes('DO NOT SEND'));
 await q.g.FKUsage.preferences();await settle();assert.ok(q.body.all().some(x=>x.textContent==='Profile and usage'));
 q.g.FKUsage.preference(false);const before=q.calls.length;
 q.g.FKUsage.record('trainer_active_time',{active_seconds:30});await settle();assert.equal(q.calls.length,before);assert.equal(q.store['fk-usage-guest-v1'],undefined);
 q.g.FKUsage.preference(true);await settle();assert.ok(q.calls.length>before);
 console.log('Usage client checks passed: unconfigured/privacy/opt-out inactivity, automatic guest session, minimal timing payload, preference controls and withdrawal');
})().catch(e=>{console.error(e);process.exit(1)});
