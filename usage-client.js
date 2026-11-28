/* Small usage/profile client. Never reads reports, callsigns, audio or transmission inputs. */
(() => {
 'use strict';
 const cfg=window.FK_USAGE_CONFIG||{},base=String(cfg.apiBase||'').replace(/\/$/,'');
 const configured=/^https:\/\/[^/?#]+(?:\/[a-z0-9_-]+)*$/i.test(base);
 const localKey='fk-usage-guest-v1',memberKey='fk-usage-member-v1';
 let token='',person=null,owner=false,opening=null,sending=false,enabled=true,gis=null,generation=0;
 let entered=false,screen=null,welcomed=false,welcomePending=false;
 const pending=[];
 try{token=localStorage.getItem(memberKey)||sessionStorage.getItem(memberKey)||'';}catch{}
 try{localStorage.removeItem(localKey);sessionStorage.removeItem(localKey);}catch{}
 const permitted=()=>enabled && !navigator.globalPrivacyControl && navigator.doNotTrack!=='1' && window.doNotTrack!=='1' && (()=>{try{return localStorage.getItem('fk-atc-analytics-consent-v1')!=='denied';}catch{return true;}})();
 const panelId='fk-usage-profile';
 async function api(path,method='GET',body){
  const resp=await fetch(base+path,{method,headers:{...(!permitted()||person?.kind!=='member'?{'X-FK-Usage':'off'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',credentials:'omit',keepalive:method==='POST'});
  const data=await resp.json();if(!resp.ok){const error=Error(data.error||'Connection unavailable');error.status=resp.status;throw error;}return data;
 }
 function save(result){
  token=result.token||token;person=result.profile;owner=!!result.owner;
  try{localStorage.removeItem(localKey);if(person.kind==='member'){localStorage.setItem(memberKey,token);sessionStorage.setItem(memberKey,token);}else{localStorage.removeItem(memberKey);sessionStorage.removeItem(memberKey);}}catch{}
 }
 async function ensure(authentication=false){
  if(!configured||(!authentication&&(!permitted()||person?.kind!=='member')))return false;
  if(person&&token)return true;
  if(opening)return opening;
  const started=generation;
  opening=(async()=>{
   if(token){try{const result=await api('/me');if((!permitted()&&!authentication)||started!==generation)return false;save(result);return true;}catch(e){if(e.status!==401)throw e;token='';}}
   const result=await api('/session','POST',{});if((!permitted()&&!authentication)||started!==generation)return false;save(result);return true;
  })().catch(()=>false).finally(()=>opening=null);return opening;
 }
 async function drain(){
  if(sending||!permitted()||navigator.onLine===false||!await ensure())return;
  sending=true;
  try{while(pending.length&&permitted()){
   const item=pending[0];
   try{await api('/usage','POST',item);pending.shift();}
   catch(e){if(e.status===401){token='';person=null;pending.length=0;try{localStorage.removeItem(localKey);localStorage.removeItem(memberKey);sessionStorage.removeItem(memberKey);}catch{}entered=false;welcomed=false;document.getElementById('fk-account-controls')?.remove();showEntry();}break;}
  }}finally{sending=false;}
 }
 function record(name,data){
  if(!entered||person?.kind!=='member'||name!=='trainer_active_time'||!permitted())return;
  const seconds=Math.min(90,Math.floor(Number(data.active_seconds)||0));if(seconds<1)return;
  pending.push({id:crypto.randomUUID(),seconds,mode:['vfr','ifr'].includes(data.trainer_mode)?data.trainer_mode:'unknown'});if(pending.length>20)pending.shift();drain();
 }
 function preference(granted){
  enabled=!!granted;pending.length=0;
  if(granted&&entered)ensure();
 }
 function element(tag,text){const e=document.createElement(tag);if(text)e.textContent=text;return e;}
 async function loadGoogle(){
  if(window.google?.accounts?.id)return;
  if(!gis)gis=new Promise((resolve,reject)=>{const s=element('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=resolve;s.onerror=()=>{gis=null;reject(Error('Google sign-in could not load. Please check your connection and try again.'));};document.head.appendChild(s);});
  return gis;
 }
 function signedControls(){
  document.getElementById('fk-account-controls')?.remove();
  if(person?.kind!=='member')return;
  const bar=element('footer');bar.id='fk-account-controls';bar.className='fk-analytics-footer';
  bar.appendChild(element('span','Signed in as '+person.display_name+' '));
  const out=element('button','Sign out');out.type='button';out.addEventListener('click',async()=>{
   out.disabled=true;
   try{await drain();await api('/logout','POST',{});}catch{} 
   token='';person=null;owner=false;pending.length=0;try{localStorage.removeItem(memberKey);sessionStorage.removeItem(memberKey);}catch{}
   bar.remove();entered=false;welcomed=false;showEntry();
  });bar.appendChild(out);
  if(owner){const link=element('a','Owner dashboard');link.href='./usage-dashboard.html';bar.appendChild(link);}
  document.body.appendChild(bar);
 }
 function enter(){
  if(person?.kind!=='member'||!token){showEntry();return;}
  if(!welcomed&&typeof window.showMobileIntroduction==='function'){welcomePending=true;screen?.remove();screen=null;window.showMobileIntroduction();return;}
  entered=true;screen?.remove();screen=null;document.documentElement.classList.remove('fk-entry-pending');
  for(const id of ['vfrFlightSetupDetails','ifrFlightSetupDetails']){const setup=document.getElementById(id);if(setup)setup.open=true;}
  signedControls();
  const setup=document.getElementById('vfrFlightSetupDetails');
  setup?.scrollIntoView?.({block:'start'});document.getElementById('level')?.focus?.({preventScroll:true});
 }
 function showEntry(){
  if(screen)return;
  document.documentElement.classList.add('fk-entry-pending');
  const page=element('main');page.id='fk-entry';screen=page;
  const card=element('div');card.className='fk-entry-card';page.appendChild(card);
  const title=element('h1','Sign in to FK ATC COM Trainer');title.tabIndex=-1;card.appendChild(title);
  const login=element('section');card.appendChild(login);login.appendChild(element('h2','Sign in with Google'));
  login.appendChild(element('p','Sign in with Google to access the free VFR and IFR trainers.'));
  const host=element('div');host.className='fk-google-button';login.appendChild(host);
  const status=element('p');status.setAttribute('aria-live','polite');login.appendChild(status);
  const privacy=element('a','Analytics privacy');privacy.href='./analytics-privacy.html';card.appendChild(privacy);
  document.body.appendChild(page);title.focus?.();
  const launch=element('button','Sign in with Google');launch.type='button';launch.className='fk-signin-button';host.appendChild(launch);
  launch.addEventListener('click',async()=>{
   launch.disabled=true;
   try{
    if(!cfg.googleClientId||!await ensure(true))throw Error('Sign-in is temporarily unavailable. Please try again shortly.');
    await loadGoogle();if(screen!==page)return;
    const {nonce}=await api('/challenge','POST',{});if(screen!==page)return;
    window.google.accounts.id.initialize({client_id:cfg.googleClientId,nonce,auto_select:false,callback:async result=>{
     try{status.textContent='Signing in…';await drain();
      const signed=await api('/login','POST',{credential:result.credential,nonce});save(signed);enter();
     }catch(e){status.textContent=e.message;launch.disabled=false;launch.hidden=false;}
    }});
    launch.hidden=true;
    window.google.accounts.id.renderButton(host,{type:'standard',theme:'outline',size:'large',text:'signin_with',width:240});
   }catch(e){if(screen===page){status.textContent=e.message;launch.disabled=false;}}
  });

 }
 async function start(){
  if(entered||screen)return;
  if(token&&(permitted()||(()=>{try{return !!(localStorage.getItem(memberKey)||sessionStorage.getItem(memberKey));}catch{return false;}})())&&await ensure(true)&&person?.kind==='member'){enter();return;}
  showEntry();
 }
 window.FKUsage=Object.freeze({record,preference,start});
 window.addEventListener('fk-welcome-complete',()=>{if(welcomePending&&person?.kind==='member'){welcomePending=false;welcomed=true;enter();}});
 document.addEventListener('DOMContentLoaded',()=>{
  start();
 });
 window.addEventListener('online',drain);window.addEventListener('pagehide',drain);setInterval(drain,30000);
})();
