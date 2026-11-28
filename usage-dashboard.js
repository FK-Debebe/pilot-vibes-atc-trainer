(() => {
 'use strict';
 const cfg=window.FK_USAGE_CONFIG||{},base=String(cfg.apiBase||'').replace(/\/$/,'');
 const $=id=>document.getElementById(id),hours=s=>(Number(s||0)/3600).toFixed(2);
 function duration(seconds){
  const value=Number(seconds),total=Number.isFinite(value)?Math.max(0,Math.floor(value)):0;
  return [Math.floor(total/3600),Math.floor(total%3600/60),total%60].map(n=>String(n).padStart(2,'0')).join(':');
 }
 let offset=0,next=null,total=0,query=new URLSearchParams(),loaded=false,busy=false;
 const utc=t=>new Date(t).toISOString().slice(0,10);
 function message(text,error=false){$('status').textContent=text;$('status').className=error?'error':'';}
 function token(){try{return localStorage.getItem('fk-usage-member-v1')||sessionStorage.getItem('fk-usage-member-v1')||'';}catch{return '';}}
 function setBusy(value){busy=value;$('filterFields').disabled=value;for(const id of ['refresh','export','previous','more'])$(id).disabled=value; if(!value){$('export').disabled=!loaded||total===0;$('previous').disabled=!loaded||offset===0;$('more').disabled=!loaded||next===null;}}
 function dates(){
  const range=$('range').value,custom=range==='custom';$('start').disabled=$('end').disabled=!custom;
  if(range==='all'){$('start').value=$('end').value='';return;}
  if(custom)return;
  const now=Date.now();$('end').value=utc(now);$('start').value=utc(now-(range==='today'?0:Number(range)-1)*86400000);
 }
 function filters(){
  const p=new URLSearchParams();for(const id of ['start','end','search','mode','kind','country','region','city','sort']){const v=$(id).value.trim();if(v)p.set(id,v);}
  if($('excludeSelf').checked)p.set('excludeSelf','1');
  if($('range').value==='custom'&&(!$('start').value||!$('end').value))throw Error('Choose both custom dates.');
  if(p.get('start')&&p.get('end')&&p.get('start')>p.get('end'))throw Error('Start date must be on or before end date.');return p;
 }
 async function fetchPage(params,pageOffset){
  if(!/^https:\/\//.test(base))throw Error('Usage backend has not been connected yet.');
  const auth=token();if(!auth)throw Error('Sign in as the owner on the trainer start page first.');
  const p=new URLSearchParams(params);p.set('offset',pageOffset);
  const response=await fetch(base+'/admin/people?'+p,{headers:{Authorization:'Bearer '+auth},cache:'no-store',credentials:'omit'});
  const data=await response.json().catch(()=>{throw Error('The usage service returned an invalid response.');});
  if(!response.ok)throw Error(response.status===403?'Owner verification expired or this account is not authorized. Return to the trainer, sign out, then sign in with your authorized owner account.':response.status===401?'Your sign-in expired. Sign in again through the trainer.':response.status===429?'Too many requests. Wait a minute and try again.':data.error||'Usage service unavailable.');
  if(!data.summary||!Array.isArray(data.people)||typeof data.summary.vfr_seconds!=='number')throw Error('Dashboard upgrade needs the V6.30 database migration and Worker deployment.');return data;
 }
 function render(data){
  $('summary').replaceChildren();for(const [label,value] of [['Profiles/browser IDs',data.summary.people],['Total active time (hh:mm:ss)',duration(data.summary.active_seconds)],['VFR hours',hours(data.summary.vfr_seconds)],['IFR hours',hours(data.summary.ifr_seconds)]]){const card=document.createElement('div');card.className='metric';const title=document.createElement('span');title.textContent=label;const n=document.createElement('strong');n.textContent=value;card.append(title,n);$('summary').appendChild(card);}
  $('people').replaceChildren();for(const person of data.people){const row=document.createElement('tr');for(const value of [person.display_name,person.kind==='member'?'Signed in':'Historical guest',[person.city,person.region,person.country].filter(Boolean).join(', ')||'Unknown',hours(person.vfr_seconds),hours(person.ifr_seconds),hours(person.unknown_seconds),duration(person.active_seconds),new Date(person.last_seen).toISOString().replace('T',' ').slice(0,19)]){const td=document.createElement('td');td.textContent=value;row.appendChild(td);}$('people').appendChild(row);}
  total=data.summary.people;next=data.nextOffset;loaded=true;$('empty').hidden=total!==0;
  $('pageInfo').textContent=total?`${offset+1}–${offset+data.people.length} of ${total} profiles`:'0 profiles';
  $('rangeNote').textContent=(query.has('start')||query.has('end')?`${query.get('start')||'Beginning'} through ${query.get('end')||'today'} (UTC)`:'All-time usage')+(query.get('mode')?' · '+query.get('mode').toUpperCase():'');
  $('coverage').textContent=`Daily and mode recording began ${data.dailySince||'with this upgrade'} (UTC). Earlier time appears only in All time as Unclassified; historical daily/mode detail is unavailable. Filtered unclassified hours: ${hours(data.summary.unknown_seconds)}. All-time profiles may include sign-ins with no credited use.`;
  $('lastRefresh').textContent='Last refreshed: '+new Date().toLocaleTimeString();message(total?'Usage records loaded.':'No usage matches these filters.');
 }
 async function load(pageOffset=0,newFilters=false){if(busy)return;let params;try{params=newFilters?filters():query;}catch(e){message(e.message,true);return;}setBusy(true);message('Loading usage…');try{const data=await fetchPage(params,pageOffset);query=new URLSearchParams(params);offset=pageOffset;render(data);}catch(e){loaded=false;$('summary').replaceChildren();$('people').replaceChildren();$('pageInfo').textContent='';$('coverage').textContent='';$('lastRefresh').textContent='';$('empty').hidden=true;message(e.message,true);}finally{setBusy(false);}}
 function csvCell(value){let text=String(value??'');if(/^[\s]*[=+\-@\t\r\n]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
 async function exportCSV(){if(busy||!loaded)return;setBusy(true);message('Preparing filtered CSV…');try{
  const lines=[['Profile','Type','Latest city','Latest region','Latest country','VFR hours','IFR hours','Unclassified hours','Total time (hh:mm:ss)','Last activity UTC','Filter start UTC','Filter end UTC','Filter mode','Daily tracking since UTC']];let at=0,count=0;
  do{const data=await fetchPage(query,at);for(const p of data.people){lines.push([p.display_name,p.kind,p.city,p.region,p.country,hours(p.vfr_seconds),hours(p.ifr_seconds),hours(p.unknown_seconds),duration(p.active_seconds),new Date(p.last_seen).toISOString(),query.get('start')||'All time',query.get('end')||'',query.get('mode')||'All modes',data.dailySince||'']);count++;}at=data.nextOffset;if(at!==null&&at<=count-data.people.length)throw Error('Export pagination did not advance. Please refresh and retry.');}while(at!==null);
  const url=URL.createObjectURL(new Blob(['\uFEFF'+lines.map(line=>line.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='FK_ATC_Usage_'+utc(Date.now())+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);message(`Exported ${count} filtered profiles. Usage may change while an export is running.`);
 }catch(e){message(e.message,true);}finally{setBusy(false);}}
 $('range').addEventListener('change',dates);$('filters').addEventListener('submit',e=>{e.preventDefault();load(0,true);});$('reset').addEventListener('click',()=>{$('filters').reset();dates();load(0,true);});$('refresh').addEventListener('click',()=>load(offset));$('previous').addEventListener('click',()=>load(Math.max(0,offset-100)));$('more').addEventListener('click',()=>{if(next!==null)load(next);});$('export').addEventListener('click',exportCSV);dates();load(0,true);
})();
