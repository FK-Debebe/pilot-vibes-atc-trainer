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
 const login=async q=>{await q.body.all().find(x=>x.tag==='button'&&x.textContent==='Sign in with Google').events.click();await settle();};
 let q=run();q.de.DOMContentLoaded();await settle();assert(q.classes.has('fk-entry-pending'));assert.equal(q.calls.length,0);
 assert(!q.body.all().some(x=>/Guest|Practice without signing in/.test(x.textContent||'')));
 q.g.FKUsage.record('trainer_active_time',{active_seconds:30});await settle();assert.equal(q.calls.length,0);
 await login(q);assert(q.options());assert(q.classes.has('fk-entry-pending'));assert.equal(q.local['fk-usage-guest-v1'],undefined);
 await q.options().callback({credential:'signed-google'});await settle();assert(!q.classes.has('fk-entry-pending'));assert.equal(q.local['fk-usage-member-v1'],'signed');
 q.g.FKUsage.record('trainer_active_time',{active_seconds:30,transcript:'PRIVATE'});await settle();let u=q.calls.find(x=>x.url.endsWith('/usage'));assert.deepEqual(Object.keys(JSON.parse(u.opts.body)).sort(),['id','seconds']);
 q=run({mobile:true});q.de.DOMContentLoaded();await settle();assert(!q.body.all().some(x=>x.id==='fk-entry'));q.events['fk-welcome-complete']();await settle();assert(q.classes.has('fk-entry-pending'));assert(q.body.all().some(x=>x.id==='fk-entry'));
 for(const privacy of [false,true]){
  q=run({remembered:true,privacy,owner:true});q.de.DOMContentLoaded();await settle();assert(!q.classes.has('fk-entry-pending'));assert(q.calls[0].url.endsWith('/me'));assert(q.body.all().some(x=>x.textContent==='Owner dashboard'));
  await q.body.all().find(x=>x.textContent==='Sign out').events.click();await settle();assert.equal(q.local['fk-usage-member-v1'],undefined);assert(q.classes.has('fk-entry-pending'));
 }
 for(const privacyType of ['gpc','dnt','optout']){
  q=run({privacy:privacyType==='gpc'});if(privacyType==='dnt')q.g.navigator.doNotTrack='1';if(privacyType==='optout')q.g.localStorage.setItem('fk-atc-analytics-consent-v1','denied');
  q.de.DOMContentLoaded();await settle();assert.equal(q.calls.length,0);await login(q);await q.options().callback({credential:'signed-google'});await settle();assert(!q.classes.has('fk-entry-pending'));
  q.g.FKUsage.record('trainer_active_time',{active_seconds:30});await settle();assert(!q.calls.some(x=>x.url.endsWith('/usage')));assert(q.calls.every(x=>x.opts.headers['X-FK-Usage']==='off'));
 }
 q=run();q.g.fetch=async()=>{throw Error('offline')};q.de.DOMContentLoaded();await settle();await login(q);assert(q.classes.has('fk-entry-pending'));assert(q.body.all().some(x=>/temporarily unavailable/.test(x.textContent||'')));
 q=run();q.de.DOMContentLoaded();await settle();await login(q);q.g.fetch=async()=>({ok:false,status:401,json:async()=>({error:'Google verification failed'})});await q.options().callback({credential:'bad'});await settle();assert(q.classes.has('fk-entry-pending'));
 q=run({remembered:true});q.g.fetch=async()=>({ok:false,status:401,json:async()=>({error:'Expired'})});q.de.DOMContentLoaded();await settle();assert(q.classes.has('fk-entry-pending'));
 console.log('Required Google sign-in checks passed: no guest entry, verified login, mobile welcome order, remembered login, sign-out, privacy settings, failures and expiry.');
})().catch(e=>{console.error(e);process.exit(1)});
