const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync(__dirname+'/../usage-client.js','utf8');
function run({mobile=false,privacy=false,member=false,owner=false,remembered=false}={}){
 class E{constructor(tag){this.tag=tag;this.children=[];this.events={};this.open=false;}appendChild(x){x.parent=this;this.children.push(x);return x;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}setAttribute(){}addEventListener(k,f){this.events[k]=f;}all(){return [this,...this.children.flatMap(x=>x.all())];}focus(){}scrollIntoView(){}}
 const body=new E('body'),head=new E('head'),welcome=new E('dialog');welcome.id='mobileIntroduction';welcome.open=mobile;body.appendChild(welcome);
 const classes=new Set(['fk-entry-pending']),events={},de={},calls=[],ss=member?{'fk-usage-member-v1':'membertoken'}:{},ls=remembered?{'fk-usage-member-v1':'rememberedtoken'}:{};let googleOptions;
 const profile=()=>({id:'test',kind:member||remembered?'member':'guest',display_name:'Test pilot'});
 const g={window:null,document:{body,head,documentElement:{classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}},createElement:t=>new E(t),getElementById:id=>body.all().find(x=>x.id===id),addEventListener:(k,f)=>de[k]=f},
 FK_USAGE_CONFIG:{apiBase:'https://test.example',googleClientId:'public-client'},navigator:{globalPrivacyControl:privacy,onLine:true},crypto:require('node:crypto').webcrypto,
 localStorage:{getItem:k=>ls[k],setItem:(k,v)=>ls[k]=v,removeItem:k=>delete ls[k]},sessionStorage:{getItem:k=>ss[k],setItem:(k,v)=>ss[k]=v,removeItem:k=>delete ss[k]},
 addEventListener:(k,f)=>events[k]=f,setInterval(){},google:{accounts:{id:{initialize:o=>googleOptions=o,renderButton:host=>host.appendChild(new E('google-button'))}}},
 fetch:async(url,opts)=>{calls.push({url,opts});return {ok:true,json:async()=>url.endsWith('/challenge')?{nonce:'testnonce'}:url.endsWith('/login')?{token:'signed',profile:{kind:'member',display_name:'Owner'},owner}: {token:'guest',profile:profile(),owner:(member||remembered)&&owner}};}};g.window=g;vm.createContext(g);vm.runInContext(code,g);
 return {g,body,classes,events,de,calls,local:ls,session:ss,options:()=>googleOptions};
}
async function settle(){for(let i=0;i<80;i++)await Promise.resolve();}
(async()=>{
 let q=run();q.de.DOMContentLoaded();await settle();assert(q.body.all().some(x=>x.id==='fk-entry'));assert.equal(q.calls.length,0);
 assert(!q.body.all().some(x=>['Profile and usage','Close','Delete my usage data'].includes(x.textContent)));
 q.body.all().find(x=>x.tag==='button'&&x.textContent==='Continue as Guest').events.click();await settle();assert(!q.classes.has('fk-entry-pending'));
 q.g.FKUsage.record('trainer_active_time',{active_seconds:30,transcript:'PRIVATE'});await settle();const u=q.calls.find(x=>x.url.endsWith('/usage'));assert.deepEqual(Object.keys(JSON.parse(u.opts.body)).sort(),['id','seconds']);
 q=run({mobile:true});q.de.DOMContentLoaded();await settle();assert(!q.body.all().some(x=>x.id==='fk-entry'));q.events['fk-welcome-complete']();await settle();assert(q.body.all().some(x=>x.id==='fk-entry'));
 q=run({privacy:true});q.de.DOMContentLoaded();await settle();assert.equal(q.calls.length,0);q.body.all().find(x=>x.tag==='button'&&x.textContent==='Continue as Guest').events.click();assert(!q.classes.has('fk-entry-pending'));
 q=run({member:true,owner:true});q.de.DOMContentLoaded();await settle();assert(!q.classes.has('fk-entry-pending'));assert(q.body.all().some(x=>x.textContent==='Owner dashboard'));
 q=run({owner:false});q.de.DOMContentLoaded();await settle();await q.body.all().find(x=>x.tag==='button'&&x.textContent==='Sign in with Google').events.click();await settle();await q.options().callback({credential:'signed-google'});await settle();assert(!q.classes.has('fk-entry-pending'));assert(q.body.all().some(x=>x.textContent==='Sign out'));assert(!q.body.all().some(x=>x.textContent==='Owner dashboard'));
 for(const privacyType of ['gpc','dnt','optout']){
  q=run({privacy:privacyType==='gpc',owner:true});
  if(privacyType==='dnt')q.g.navigator.doNotTrack='1';
  if(privacyType==='optout')q.g.localStorage.setItem('fk-atc-analytics-consent-v1','denied');
  q.de.DOMContentLoaded();await settle();assert.equal(q.calls.length,0);
  await q.body.all().find(x=>x.tag==='button'&&x.textContent==='Sign in with Google').events.click();await settle();assert(q.options());
  await q.options().callback({credential:'signed-google'});await settle();assert(!q.classes.has('fk-entry-pending'));
  assert(q.body.all().some(x=>x.textContent==='Owner dashboard'));
  q.g.FKUsage.record('trainer_active_time',{active_seconds:30});await settle();
  assert(!q.calls.some(x=>x.url.endsWith('/usage')));assert(q.calls.every(x=>x.opts.headers['X-FK-Usage']==='off'));
  q.g.FKUsage.preference(false);assert(q.body.all().some(x=>x.textContent==='Sign out'));
 }
 // Reopen with only durable storage, including privacy-enabled browser settings.
 for(const privacy of [false,true]){
  q=run({remembered:true,privacy});q.de.DOMContentLoaded();await settle();
  assert(!q.classes.has('fk-entry-pending'));assert(q.calls[0].url.endsWith('/me'));
  assert(q.body.all().some(x=>x.textContent==='Sign out'));
  await q.body.all().find(x=>x.textContent==='Sign out').events.click();await settle();
  assert.equal(q.local['fk-usage-member-v1'],undefined);assert.equal(q.session['fk-usage-member-v1'],undefined);
  assert(q.classes.has('fk-entry-pending'));
 }
 q=run();q.de.DOMContentLoaded();await settle();
 await q.body.all().find(x=>x.tag==='button'&&x.textContent==='Sign in with Google').events.click();await settle();
 await q.options().callback({credential:'signed-google'});await settle();assert.equal(q.local['fk-usage-member-v1'],'signed');
 console.log('Startup tests passed: desktop/mobile order, guest, Google callback, returning member, owner controls, privacy and minimal payload.');
})().catch(e=>{console.error(e);process.exit(1)});
