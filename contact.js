/* Email drafts use only these form fields; never attach reports, audio, or training logs. */
(() => {
 'use strict';
 const email='fwdskillzone@gmail.com';
 function draft(values){
  const clean=(key,max)=>String(values[key]||'').trim().slice(0,max);
  const topic=['Report an issue','Suggest an improvement','General question'].includes(values.topic)?values.topic:'General question';
  const subject='FK ATC COM Trainer — '+topic;
  const body=['Trainer version: V6.20 Standalone','Topic: '+topic,
   'Training mode: '+(clean('mode',40)||'Not specified'),
   'Airports / route: '+(clean('route',120)||'Not specified'),
   'Stage: '+(clean('stage',120)||'Not specified'),'',
   'Message:',clean('message',2000),'','Radio call (optional):',clean('call',600)||'Not provided'].join('\n');
  return {subject,body,uri:'mailto:'+email+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body)};
 }
 window.FKContact=Object.freeze({draft});
 document.addEventListener('DOMContentLoaded',()=>{
  const form=document.getElementById('contactForm');if(!form)return;
  const status=document.getElementById('contactStatus'),preview=document.getElementById('contactDraft');
  function current(){const values={};for(const key of ['topic','mode','route','stage','message','call'])values[key]=document.getElementById('contact-'+key).value;return draft(values);}
  function display(){const d=current();preview.value='To: '+email+'\nSubject: '+d.subject+'\n\n'+d.body;document.getElementById('contactDraftSection').hidden=false;return d;}
  form.addEventListener('submit',event=>{
   event.preventDefault();if(!form.reportValidity())return;
   if(!document.getElementById('contact-message').value.trim()){status.textContent='Please enter a message.';document.getElementById('contact-message').focus();return;}
   const d=display();status.textContent='Opening your email app. Review the draft and send it there. If nothing opens, copy the draft below and email it to '+email+'.';
   window.location.href=d.uri;
  });
  document.getElementById('contactCopy').addEventListener('click',async()=>{
   display();try{await navigator.clipboard.writeText(preview.value);status.textContent='Draft copied. Paste it into an email to '+email+'.';}
   catch{preview.focus();preview.select();status.textContent='Select and copy the draft below, then paste it into your email app.';}
  });
 });
})();
