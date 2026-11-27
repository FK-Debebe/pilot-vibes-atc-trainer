/* Normal HTTPS form submission; no mailto, analytics payload, or automatic transcript attachment. */
(() => {
 'use strict';
 document.addEventListener('DOMContentLoaded',()=>{
  const form=document.getElementById('contactForm');if(!form)return;
  const status=document.getElementById('contactStatus');
  form.addEventListener('submit',event=>{
   if(!form.reportValidity()){event.preventDefault();return;}
   for(const key of ['name','email','message']){
    const field=document.getElementById('contact-'+key);
    if(!field.value.trim()){event.preventDefault();status.textContent='Please enter your '+key+'.';field.focus();return;}
   }
   status.textContent='Submitting securely. Complete the verification on the next screen if asked.';
   // Allow the browser to POST to the delivery service. It handles verification and errors.
  });
 });
})();
