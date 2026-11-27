/* FK ATC usage analytics. GA4 loads automatically unless opted out or blocked by a browser privacy signal.
   Deliberately never reads inputs, transcripts, audio, callsigns or flight reports. */
(() => {
  "use strict";
  const config=window.FK_ANALYTICS_CONFIG||{};
  const id=String(config.measurementId||"").trim();
  const configured=/^G-[A-Z0-9]+$/.test(id);
  const preferenceKey="fk-atc-analytics-consent-v1";
  const blocked=()=>navigator.globalPrivacyControl===true || navigator.doNotTrack==="1" || window.doNotTrack==="1";
  let choice="unset",enabled=false,loaded=false,tagReady=false,loading=false,attempts=0,retryTimer=null;
  const pendingEvents=[];
  const maxQueue=200,maxAgeMs=30*60*1000;
  try { choice=localStorage.getItem(preferenceKey)||"unset"; } catch {}
  const pages={trainer:"vfr_trainer","ifr-trainer":"ifr_trainer","training-log":"training_log",report:"flight_reports","how-to":"how_to",contact:"contact_feedback"};
  const modes=["vfr","ifr"];
  const types={on:"flight_following",off:"no_flight_following",pattern:"traffic_pattern",ifr:"ifr"};
  const stages=["atis","clearance","ground","tower","departure","enroute","arrival","arrivalAtis","destTower","destGround","parking"];
  let section="vfr_trainer",lastTick=Date.now(),lastActivity=lastTick,pendingMs=0,wasVisible=document.visibilityState!=="hidden";
  const contexts={vfr:{trainer_mode:"vfr",flight_type:"flight_following",stage_id:"atis"},ifr:{trainer_mode:"ifr",flight_type:"ifr",stage_id:"atis"}};
  const runs={vfr:null,ifr:null};
  const url=()=>location.origin+location.pathname+"#"+section;
  const modeForSection=()=>section==="vfr_trainer"?"vfr":section==="ifr_trainer"?"ifr":null;
  const context=()=>{ const mode=modeForSection();return mode?contexts[mode]:{}; };
  const allowedEvents=new Set(["page_view","trainer_active_time","trainer_training_start","trainer_stage_start","trainer_stage_complete","trainer_training_complete","trainer_training_abandon","trainer_pattern_choice"]);
  function send(name,parameters={}){
    if(!enabled||!allowedEvents.has(name)) return;
    try{window.FKUsage?.record(name,parameters);}catch{}
    // Only enumerated app states and numeric counts may leave this module.
    const out={section,app_version:"6.23",page_location:url(),page_title:"FK ATC COM Trainer",transport_type:"beacon",...parameters};
    if(!tagReady || navigator.onLine===false){
      pendingEvents.push({name,parameters:out,created:Date.now()});
      if(pendingEvents.length>maxQueue)pendingEvents.shift();
      return;
    }
    window.gtag("event",name,out);
  }
  function account(){
    const now=Date.now();
    if(enabled && wasVisible){
      pendingMs+=Math.max(0,Math.min(now,lastActivity+60000)-lastTick);
    }
    lastTick=now;wasVisible=document.visibilityState!=="hidden";
  }
  function flush(){
    account();
    if(pendingMs>=1000) send("trainer_active_time",{...context(),activity_kind:modeForSection() && runs[modeForSection()] && !runs[modeForSection()].completed ? "practice" : "browsing",active_seconds:Math.floor(pendingMs/1000),transport_type:"beacon"});
    pendingMs%=1000;
  }
  function page(pageId){
    const next=pages[pageId];if(!next||next===section) return;
    flush();pendingMs=0;section=next;lastActivity=Date.now();
    send("page_view");
  }
  function setContext(mode,type,stage){
    if(!modes.includes(mode))return;
    if(contexts[mode].flight_type===(types[type]||types[mode]||"flight_following") && contexts[mode].stage_id===stage)return;
    if(modeForSection()===mode){flush();pendingMs=0;}
    contexts[mode]={trainer_mode:mode,flight_type:types[type]||types[mode]||"flight_following",stage_id:stages.includes(stage)?stage:"atis"};
  }
  function start(mode,type,stage,key=stage){
    if(!enabled||!modes.includes(mode))return;
    setContext(mode,type,stage);
    if(!runs[mode]){
      flush();pendingMs=0;
      runs[mode]={completed:false,seen:new Set(),done:new Set()};
      send("trainer_training_start",contexts[mode]);
    }
    stageStart(mode,stage,key);
  }
  function stageStart(mode,stage,key=stage){
    const run=runs[mode];
    if(!enabled||!run||run.completed||!stages.includes(stage))return;
    if(modeForSection()===mode && contexts[mode].stage_id!==stage){flush();pendingMs=0;}
    contexts[mode].stage_id=stage;
    if(!run.seen.has(key)){run.seen.add(key);send("trainer_stage_start",contexts[mode]);}
  }
  function stageComplete(mode,stage,key=stage){
    const run=runs[mode];
    if(!enabled||!run||run.completed||!stages.includes(stage)||run.done.has(key))return;
    run.done.add(key);send("trainer_stage_complete",{...contexts[mode],stage_id:stage});
  }
  function complete(mode){
    const run=runs[mode];if(!run||run.completed)return;
    flush();send("trainer_training_complete",contexts[mode]);run.completed=true;
  }
  function abandon(mode){
    const run=runs[mode];
    if(run&&!run.completed){flush();send("trainer_training_abandon",contexts[mode]);}
    runs[mode]=null;
  }
  function patternChoice(more){
    if(!runs.vfr||runs.vfr.completed)return;
    send("trainer_pattern_choice",{...contexts.vfr,pattern_action:more?"more_pattern":"end_practice"});
  }
  function drain(){
    if(!enabled||blocked()||choice==="denied"||!tagReady||navigator.onLine===false)return;
    while(pendingEvents.length){
      const event=pendingEvents.shift();
      if(Date.now()-event.created<=maxAgeMs)window.gtag("event",event.name,event.parameters);
    }
  }
  function connect(){
    if(!enabled||blocked()||choice==="denied"||tagReady||loading||navigator.onLine===false||attempts>=3)return;
    attempts++;loading=true;
    const script=document.createElement("script");script.async=true;
    script.src="https://www.googletagmanager.com/gtag/js?id="+encodeURIComponent(id);
    script.referrerPolicy="no-referrer";
    script.onload=()=>{loading=false;tagReady=true;drain();};
    script.onerror=()=>{
      loading=false;script.remove();
      if(enabled&&attempts<3)retryTimer=setTimeout(()=>{retryTimer=null;connect();},attempts*3000);
    };
    document.head.appendChild(script);
  }
  function load(){
    if(!configured||blocked()||choice==="denied")return;
    enabled=true;lastTick=lastActivity=Date.now();pendingMs=0;
    window["ga-disable-"+id]=false;
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
    if(!loaded){
      window.gtag("consent","default",{analytics_storage:"granted",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"});
      window.gtag("js",new Date());
      window.gtag("config",id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,
        cookie_domain:"none",cookie_expires:60*60*24*180,cookie_update:false,
        page_location:url(),page_referrer:"",page_title:"FK ATC COM Trainer",debug_mode:config.debug===true});
      loaded=true;
    }else window.gtag("consent","update",{analytics_storage:"granted"});
    connect();
    send("page_view");
    drain();
  }
  function consent(granted){
    if(enabled)flush();
    choice=granted?"granted":"denied";
    try{window.FKUsage?.preference(granted);}catch{}
    try {localStorage.setItem(preferenceKey,choice);} catch {}
    if(!granted){
      enabled=false;pendingMs=0;runs.vfr=runs.ifr=null;
      pendingEvents.length=0;
      if(retryTimer!==null){clearTimeout(retryTimer);retryTimer=null;}
      if(configured)window["ga-disable-"+id]=true;
      if(loaded)window.gtag("consent","update",{analytics_storage:"denied"});
      // Host-only cookies configured above; remove root and ancestor-path variants.
      const paths=["/"],parts=location.pathname.split("/").filter(Boolean);
      for(let i=1;i<parts.length;i++)paths.push("/"+parts.slice(0,i).join("/"),"/"+parts.slice(0,i).join("/")+"/");
      for(const cookie of document.cookie.split(";")){
        const name=cookie.trim().split("=")[0];
        if(/^_ga(?:_|$)/.test(name))for(const path of paths)document.cookie=name+"=; Max-Age=0; path="+path+"; SameSite=Lax";
      }
    }else load();
    document.getElementById("fk-analytics-panel")?.remove();
  }
  function preferences(){
    document.getElementById("fk-analytics-panel")?.remove();
    const panel=document.createElement("section");panel.id="fk-analytics-panel";panel.className="fk-analytics-panel";
    panel.setAttribute("aria-label","Usage analytics preferences");
    const text=document.createElement("p");
    text.textContent=!configured?"Usage analytics is not connected yet. No analytics data is being sent.":blocked()?"Usage analytics is off because your browser requests privacy protection.":
      "Google Analytics measures visits, active time, sections used, and approximate country, region and city. It uses cookies and IP-based location. We do not send your callsign, audio, typed transmissions or flight reports. You can turn usage analytics off here without limiting training.";
    panel.appendChild(text);
    const actions=document.createElement("div");actions.className="fk-analytics-actions";
    function button(label,fn){const b=document.createElement("button");b.type="button";b.textContent=label;b.addEventListener("click",fn);actions.appendChild(b);}
    if(configured&&!blocked()){
      button("Allow usage analytics",()=>consent(true));button("No thanks",()=>consent(false));
    }else button("Close",()=>panel.remove());
    const policy=document.createElement("a");policy.href="./analytics-privacy.html";policy.target="_blank";policy.rel="noopener";policy.textContent="Privacy details";actions.appendChild(policy);
    panel.appendChild(actions);document.body.appendChild(panel);
  }
  const api={page,setContext,start,stageStart,stageComplete,complete,abandon,patternChoice,preferences,
    status:()=>({configured,enabled,choice,privacySignal:blocked(),tagReady,queuedEvents:pendingEvents.length})};
  window.FKAnalytics=Object.freeze(Object.fromEntries(Object.entries(api).map(([key,fn])=>[key,(...args)=>{try{return fn(...args);}catch{return undefined;}}])));
  const active=document.querySelector(".app-page.active");
  if(active&&pages[active.id.replace("page-","")])section=pages[active.id.replace("page-","")];
  const footer=document.createElement("footer");footer.className="fk-analytics-footer";
  const link=document.createElement("button");link.type="button";link.textContent="Analytics privacy";link.addEventListener("click",preferences);footer.appendChild(link);document.body.appendChild(footer);
  ["pointerdown","keydown","touchstart","scroll"].forEach(event=>document.addEventListener(event,()=>{account();lastActivity=Date.now();},{passive:true,capture:true}));
  document.addEventListener("visibilitychange",()=>{flush();lastTick=Date.now();pendingMs=0;if(document.visibilityState!=="hidden")lastActivity=Date.now();});
  window.addEventListener("online",()=>{
    if(!enabled||blocked()||choice==="denied")return;
    if(!tagReady&&!loading){attempts=0;connect();}
    drain();
  });
  window.addEventListener("pagehide",()=>{flush();drain();});
  window.addEventListener("pageshow",()=>{lastTick=lastActivity=Date.now();});
  setInterval(flush,30000);
  if(choice!=="denied")load();
  // Preferences open only from the footer link; never interrupt app startup.
})();
