(() => {
 const cfg=window.FK_USAGE_CONFIG||{},base=String(cfg.apiBase||'').replace(/\/$/,'');let offset=0;
 const $=id=>document.getElementById(id),message=text=>$('status').textContent=text;
 async function load(reset=true){
  if(!/^https:\/\//.test(base)){message('Usage backend has not been connected yet.');return;}
  let token='';try{token=sessionStorage.getItem('fk-usage-member-v1')||localStorage.getItem('fk-usage-guest-v1')||'';}catch{}
  if(!token){message('Sign in as the owner on the trainer start page first.');return;}
  if(reset){offset=0;$('people').replaceChildren();$('summary').replaceChildren();}
  $('refresh').disabled=true;$('more').disabled=true;
  try{
   const response=await fetch(base+'/admin/people?offset='+offset,{headers:{Authorization:'Bearer '+token},cache:'no-store',credentials:'omit'});
   const data=await response.json();if(!response.ok)throw Error(response.status===403?'This account is not authorized to view owner reports.':response.status===401?'Your sign-in expired. Sign in again through the trainer.':data.error||'Service unavailable');
   if(reset)for(const [label,value] of [['People/browser IDs',data.summary.people],['Guests',data.summary.guests||0],['Signed-in profiles',data.summary.members||0],['Active hours',(data.summary.active_seconds/3600).toFixed(2)]]){
    const p=document.createElement('p');p.textContent=label+': '+value;$('summary').appendChild(p);
   }
   for(const person of data.people){const row=document.createElement('tr');
    for(const value of [person.display_name,person.kind,[person.city,person.region,person.country].filter(Boolean).join(', ')||'Unknown',(person.active_seconds/3600).toFixed(2),new Date(person.last_seen).toLocaleString()]){const td=document.createElement('td');td.textContent=value;row.appendChild(td);}
    $('people').appendChild(row);
   }
   offset=data.nextOffset;$('more').hidden=offset===null;message('Usage records loaded.');
  }catch(e){message(e.message);$('more').hidden=true;}finally{$('refresh').disabled=false;$('more').disabled=false;}
 }
 $('refresh').addEventListener('click',()=>load(true));$('more').addEventListener('click',()=>load(false));load();
})();
