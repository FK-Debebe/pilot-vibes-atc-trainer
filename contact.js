/* Contact details stay in the email draft, never in trainer analytics. */
(() => {
 'use strict';
 function draft(values){
  const name=String(values.name||'').trim().slice(0,100).replace(/[\r\n]/g,' ');
  const email=String(values.email||'').trim().slice(0,254).replace(/[\r\n]/g,'');
  const message=String(values.message||'').trim().slice(0,2000);
  const subject='FK ATC COM Trainer — Contact us';
  const body=['Name: '+name,'Email: '+email,'Trainer version: V6.21 Standalone','','Message:',message].join('\n');
  return {subject,body,uri:'mailto:fwdskillzone@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body)};
 }
 window.FKContact=Object.freeze({draft});
 document.addEventListener('DOMContentLoaded',()=>{
  const form=document.getElementById('contactForm');if(!form)return;
  const status=document.getElementById('contactStatus');
  form.addEventListener('submit',event=>{
   event.preventDefault();if(!form.reportValidity())return;
   const values={};
   for(const key of ['name','email','message']){
    const field=document.getElementById('contact-'+key);values[key]=field.value.trim();
    if(!values[key]){status.textContent='Please enter your '+key+'.';field.focus();return;}
   }
   const d=draft(values);
   status.textContent='Opening your email app. Review and send your message there. If no email app opens, email fwdskillzone@gmail.com directly. Your message has not been sent by the trainer.';
   window.location.href=d.uri;
  });
 });
})();
