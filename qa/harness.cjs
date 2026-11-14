const vm=require('node:vm'),fs=require('node:fs'),a=require('node:assert/strict');
function run(mobile=false,stored={},patch=false) {
 const timers=[], events={};
 class E {
  constructor([tag,attrs={},str='',children=[]]){this.tagName=tag.toUpperCase();this.attrs=attrs;this.id=attrs.id||'';this.className=attrs.class||'';this.textContent=str;this.style={setProperty(){}};this.children=[];this.events={};this.dataset=Object.fromEntries(Object.entries(attrs).filter(([k])=>k.startsWith('data-')).map(([k,v])=>[k.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase()),v]));this.open='open' in attrs;this.hidden='hidden' in attrs;this.disabled='disabled' in attrs;this.checked='checked' in attrs;this.value=attrs.value||'';children.forEach(c=>this.appendChild(new E(c)));if(tag==='select')this.value=(this.options.find(o=>'selected' in o.attrs)||this.options[0])?.value||'';}
  get options(){return this.children.filter(c=>c.tagName==='OPTION').concat(...this.children.filter(c=>c.tagName==='OPTGROUP').map(c=>c.options));}
  get classList(){let s=new Set(this.className.split(/\s+/).filter(Boolean));const save=()=>this.className=[...s].join(' ');return {contains:k=>s.has(k),add:(...ks)=>{ks.forEach(k=>s.add(k));save()},remove:(...ks)=>{ks.forEach(k=>s.delete(k));save()},toggle:(k,on=!s.has(k))=>{on?s.add(k):s.delete(k);save();return on;}}}
  set innerHTML(s){this._html=s;this.children=[];for(const m of s.matchAll(/<(span|div|option)\b([^>]*)>/g)){const attrs=Object.fromEntries([...m[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(([,k,v])=>[k,v]));this.appendChild(new E([m[1],attrs]));}} get innerHTML(){return this._html||'';}
  appendChild(e){e.remove();e.parentElement=this;this.children.push(e);return e;}
  append(...es){es.forEach(e=>this.appendChild(e));}
  remove(){if(this.parentElement){const p=this.parentElement;p.children=p.children.filter(e=>e!==this);this.parentElement=null;}}
  removeAttribute(k){delete this.attrs[k];} setAttribute(k,v){this.attrs[k]=String(v)} getAttribute(k){return this.attrs[k]??null;}
  matches(s){const attrs=[...s.matchAll(/\[([^=\]]+)(?:=["']?([^"'\]]+)["']?)?\]/g)];s=s.replace(/\[[^\]]+\]/g,'');if(attrs.some(([,k,v])=>v===undefined?!(k in this.attrs):this.attrs[k]!==v))return false;return (!s.match(/^[\w-]+/)||s.match(/^[\w-]+/)[0].toUpperCase()===this.tagName)&&[...s.matchAll(/#([\w-]+)|\.([\w-]+)/g)].every(([,id,cls])=>id?this.id===id:this.classList.contains(cls));}
  closest(s){return this.matches(s)?this:this.parentElement?.closest(s);}
  all(){return this.children.flatMap(c=>[c,...c.all()]);}
  querySelectorAll(sel){return this.all().filter(e=>sel.split(',').some(s=>{const parts=s.trim().split(/\s+/);if(!e.matches(parts.pop()))return false;let p=e;while(parts.length){p=p.parentElement?.closest(parts.pop());if(!p)return false;}return true;}));}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
  click(){if(!this.disabled)this.events.click?.forEach(fn=>fn({target:this,preventDefault(){},stopPropagation(){}}));}
  scrollIntoView(){} focus(){}
 }
 const root=new E(require('./qa-dom-v551.json')),body=root.querySelector('body');
 const document={body,getElementById:id=>root.querySelector('#'+id),querySelector:s=>root.querySelector(s),querySelectorAll:s=>root.querySelectorAll(s),createElement:tag=>new E([tag]),addEventListener:(k,f)=>(events[k]??=[]).push(f)};
 const spoken=[], requests=[];
 const g={document,console,navigator:{},location:{protocol:'https:',hostname:'test.invalid'},localStorage:{getItem:k=>stored[k]??null,setItem:(k,v)=>stored[k]=String(v),removeItem:k=>delete stored[k]},setTimeout:f=>timers.push(f),clearTimeout(){},setInterval(){},clearInterval(){},requestAnimationFrame:f=>timers.push(f),scrollTo(){},matchMedia:()=>({matches:mobile,addEventListener(){}}),addEventListener(){},isSecureContext:true,fetch:(...args)=>{requests.push(args);throw Error('Unexpected request')},SpeechSynthesisUtterance:class{constructor(text){this.text=text}},speechSynthesis:{getVoices:()=>[],speak:u=>spoken.push(u.text),cancel(){},addEventListener(){}}};
 g.window=g; const cx=vm.createContext(g); const exec=s=>vm.runInContext(s,cx);let src=Array.from(fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g),m=>m[1]).join('\n');if(patch){const start=src.indexOf('if(stage.id==="tower"){',src.indexOf('function evaluateTransmission'));const end=src.indexOf('if(stage.id==="departure"){',start);src=src.slice(0,start)+src.slice(start,end).replace('checks.facility&&checks.callsign&&checks.atis&&checks.destination&&checks.request','checks.facility&&checks.callsign&&checks.runway&&checks.ready')+src.slice(end);src=src.replace('$("atis").value=app.config.atis;\n  $("arrivalAtis").value=app.config.arrivalAtis;','');}exec(src);events.DOMContentLoaded?.forEach(f=>f());
 return {exec,document,stored,spoken,requests,flush:()=>{for(let i=0;timers.length&&i<100;i++)timers.shift()();}};
}
module.exports={run};
if(require.main===module){const q=run(); console.log(q.exec('JSON.stringify({v:app.config,i:IFR_APP.config,vStages:STAGES.map(s=>[s.id,s.freq]),iStages:IFR_STAGES.map(s=>[s.id,s.freq])})'))}
