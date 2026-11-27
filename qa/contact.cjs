const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),formHTML=html.split('<form id="contactForm"')[1].split('</form>')[0];
assert.match(formHTML,/action="https:\/\/formsubmit.co\/fwdskillzone@gmail.com" method="POST"/);assert.equal((formHTML.match(/ required/g)||[]).length,3);assert.match(formHTML,/type="email"/);assert.match(formHTML,/name="_next" value="https:\/\/atc.fwdskillzone.com\/contact-thanks.html"/);assert(!formHTML.includes('name="_captcha"'));assert(!formHTML.includes('contact-call'));assert(!/Open email draft|Copy email draft/.test(formHTML));
const ids={};for(const id of ['contactForm','contactStatus','contact-name','contact-email','contact-message'])ids[id]={value:'test',events:{},addEventListener(k,f){this.events[k]=f},focus(){this.focused=true},reportValidity(){return this.valid!==false}};
let ready;const g={document:{addEventListener:(k,f)=>ready=f,getElementById:id=>ids[id]}};vm.createContext(g);const source=fs.readFileSync(__dirname+'/../contact.js','utf8');assert(!source.includes('mailto:'));vm.runInContext(source,g);ready();
let prevented=false;const submit=()=>{prevented=false;ids.contactForm.events.submit({preventDefault(){prevented=true}})};
submit();assert.equal(prevented,false,'valid form must use native HTTPS POST');assert.match(ids.contactStatus.textContent,/Submitting/);
for(const key of ['name','email','message']){const f=ids['contact-'+key],v=f.value;f.value=' ';submit();assert(prevented);assert(f.focused);f.value=v;}
ids.contactForm.valid=false;submit();assert(prevented);
assert(fs.existsSync(__dirname+'/../contact-thanks.html'));
console.log('Direct contact checks passed: HTTPS POST, required inputs, verification preserved, validation and return page. Live activation/delivery still requires owner test.');
