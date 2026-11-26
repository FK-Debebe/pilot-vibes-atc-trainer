/* Small usage/profile client. Never reads reports, callsigns, audio or transmission inputs. */
(() => {
 'use strict';
 const cfg=window.FK_USAGE_CONFIG||{},base=String(cfg.apiBase||'').replace(/\/$/,'');
 if(!/^https:\/\/[^/?#]+(?:\/[a-z0-9_-]+)*$/i.test(base))return;
 const localKey='fk-usage-guest-v1',memberKey='fk-usage-member-v1';
 let token='',person=null,owner=false,opening=null,sending=false,enabled=true,gis=null,generation=0;
 const pending=[];
 try{token=sessionStorage.getItem(memberKey)||localStorage.getItem(localKey)||'';}catch{}
 const permitted=()=>enabled && !navigator.globalPrivacyControl && navigator.doNotTrack!=='1' && window.doNotTrack!=='1' && (()=>{try{return localStorage.getItem('fk-atc-analytics-consent-v1')!=='denied';}catch{return true;}})();
 const panelId='fk-usage-profile';
 async function api(path,method='GET',body){
  const resp=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',credentials:'omit',keepalive:method==='POST'});
  const data=await resp.json();if(!resp.ok){const error=Error(data.error||'Connection unavailable');error.status=resp.status;throw error;}return data;
 }
 function save(result){
  token=result.token||token;person=result.profile;owner=!!result.owner;
  try{localStorage.removeItem(localKey);sessionStorage.removeItem(memberKey);(person.kind==='guest'?localStorage:sessionStorage).setItem(person.kind==='guest'?localKey:memberKey,token);}catch{}
 }
 async function ensure(){
  if(!permitted())return false;
  if(person&&token)return true;
  if(opening)return opening;
  const started=generation;
  opening=(async()=>{
   if(token){try{const result=await api('/me');if(!permitted()||started!==generation)return false;save(result);return true;}catch(e){if(e.status!==401)throw e;token='';}}
   const result=await api('/session','POST',{});if(!permitted()||started!==generation)return false;save(result);return true;
  })().catch(()=>false).finally(()=>opening=null);return opening;
 }
 async function drain(){
  if(sending||!permitted()||navigator.onLine===false||!await ensure())return;
  sending=true;
  try{while(pending.length&&permitted()){
   const item=pending[0];
   try{await api('/usage','POST',item);pending.shift();}
   catch(e){if(e.status===401){token='';person=null;pending.length=0;try{localStorage.removeItem(localKey);sessionStorage.removeItem(memberKey);}catch{}}break;}
  }}finally{sending=false;}
 }
 function record(name,data){
  if(name!=='trainer_active_time'||!permitted())return;
  const seconds=Math.min(90,Math.floor(Number(data.active_seconds)||0));if(seconds<1)return;
  pending.push({id:crypto.randomUUID(),seconds});if(pending.length>20)pending.shift();drain();
 }
 function stop(){
  enabled=false;generation++;pending.length=0;token='';person=null;owner=false;
  try{localStorage.removeItem(localKey);sessionStorage.removeItem(memberKey);}catch{}
  document.getElementById(panelId)?.remove();
 }
 function preference(granted){if(granted){enabled=true;ensure();}else stop();}
 function element(tag,text){const e=document.createElement(tag);if(text)e.textContent=text;return e;}
 async function loadGoogle(){
  if(window.google?.accounts?.id)return;
  if(!gis)gis=new Promise((resolve,reject)=>{const s=element('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=resolve;s.onerror=()=>{gis=null;reject(Error('Google sign-in could not load. You can continue as a guest.'));};document.head.appendChild(s);});
  return gis;
 }
 async function preferences(){
  document.getElementById(panelId)?.remove();
  const panel=element('section');panel.id=panelId;panel.className='fk-analytics-panel';panel.setAttribute('aria-label','Optional profile and usage');
  panel.appendChild(element('h3','Profile and usage'));
  panel.appendChild(element('p','Optional Google sign-in attaches your display name to your approximate location and active usage hours, visible to the trainer owner. Guests use a random browser ID. Reports, radio text and audio are not uploaded.'));
  const status=element('p',permitted()?'Connecting…':'Usage tracking is off. You can still practice.');status.setAttribute('aria-live','polite');panel.appendChild(status);
  const controls=element('div');controls.className='fk-analytics-actions';panel.appendChild(controls);
  const button=(name,fn)=>{const b=element('button',name);b.type='button';b.addEventListener('click',()=>Promise.resolve(fn()).catch(e=>status.textContent=e.message));controls.appendChild(b);return b;};
  button('Close',()=>panel.remove());document.body.appendChild(panel);
  if(!await ensure()){if(permitted())status.textContent='The usage service is unavailable. You can continue practicing.';return;}
  if(!panel.isConnected)return;
  status.textContent=(person.kind==='guest'?person.display_name:'Signed in as '+person.display_name)+'. Location: '+[person.city,person.region,person.country].filter(Boolean).join(', ')+'.';
  if(person.kind==='guest'&&cfg.googleClientId){
   const host=element('div');panel.appendChild(host);
   button('Show Google sign-in',async()=>{
    await loadGoogle();const {nonce}=await api('/challenge','POST',{});
    window.google.accounts.id.initialize({client_id:cfg.googleClientId,nonce,auto_select:false,callback:async result=>{
     try{if(!permitted())return;await drain();const signed=await api('/login','POST',{credential:result.credential,nonce});if(!permitted())return;save(signed);preferences();}
     catch(e){status.textContent=e.message;}
    }});
    window.google.accounts.id.renderButton(host,{type:'standard',theme:'outline',size:'large',text:'signin_with',width:240});
   });
  }else if(person.kind==='member')button('Sign out',async()=>{await drain();await api('/logout','POST',{});token='';person=null;owner=false;try{sessionStorage.removeItem(memberKey);}catch{}await ensure();preferences();});
  if(owner){const a=element('a','Owner usage dashboard');a.href='./usage-dashboard.html';controls.appendChild(a);}
  button('Delete my usage data',async()=>{if(!window.confirm('Delete your profile and usage history from the trainer usage database?'))return;await api('/me','DELETE');stop();footer.appendChild(element('p','Usage data deleted. No new usage session will start in this tab.'));});
 }
 window.FKUsage=Object.freeze({record,preference,preferences});
 const footer=element('footer');footer.className='fk-analytics-footer';const link=element('button','Profile and usage');link.type='button';link.addEventListener('click',preferences);footer.appendChild(link);document.body.appendChild(footer);
 window.addEventListener('online',drain);window.addEventListener('pagehide',drain);setInterval(drain,30000);
 ensure();
})();
