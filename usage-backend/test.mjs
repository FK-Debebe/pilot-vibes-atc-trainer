import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createWorker} from './worker.mjs';
import {verifyGoogleToken} from './google-token.mjs';
const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
function prepare(sql,args=[]){return {bind(...a){return prepare(sql,a);},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}};}};}
const DB={prepare,async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
let claims={sub:'pilot-123',name:'Test Pilot',email:'pilot@gmail.com',email_verified:true};
const worker=createWorker(async credential=>{if(credential!=='valid')throw Error('invalid');return claims;});
const env={DB,GOOGLE_CLIENT_ID:'test-client',OWNER_EMAILS:'owner@gmail.com',ALLOWED_ORIGINS:'https://atc.fwdskillzone.com',API_RATE_LIMITER:{limit:async()=>({success:true})}};
async function request(path,method='GET',data,token,origin='https://atc.fwdskillzone.com',usageOff=false){
 const req=new Request('https://usage.example'+path,{method,headers:{Origin:origin,...(usageOff?{'X-FK-Usage':'off'}:{}),'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data?{body:JSON.stringify(data)}:{})});
 Object.defineProperty(req,'cf',{value:{country:'US',region:'California',city:'Long Beach',latitude:'DO NOT STORE',longitude:'DO NOT STORE'}});
 const res=await worker.fetch(req,env);return {status:res.status,data:res.status===204?null:await res.json()};
}
const realNow=Date.now;let now=realNow();Date.now=()=>now;
try{
 // Authentication-only traffic must not collect location or usage.
 const authRequest=(path,method='GET',data,token)=>request(path,method,data,token,'https://atc.fwdskillzone.com',true);
 const authGuest=(await authRequest('/session','POST',{})).data;
 assert.equal(authGuest.profile.city,'');assert.equal(authGuest.profile.country,'');
 assert.equal(sqlite.prepare('SELECT expires_at FROM sessions WHERE person_id=?').get(authGuest.profile.id).expires_at,now+300000);
 const authNonce=(await authRequest('/challenge','POST',{},authGuest.token)).data.nonce;
 const authLogin=await authRequest('/login','POST',{credential:'valid',nonce:authNonce},authGuest.token);
 assert.equal(authLogin.status,200);assert.equal(authLogin.data.profile.city,'');assert.equal(authLogin.data.profile.active_seconds,0);
 assert.equal((await authRequest('/usage','POST',{id:crypto.randomUUID(),seconds:30},authLogin.data.token)).status,403);
 await authRequest('/me','DELETE',undefined,authLogin.data.token);
 assert.equal((await request('/session','POST',{},null,'https://evil.example')).status,403);
 assert.equal((await request('/admin/people')).status,401);
 let guest=await request('/session','POST',{});assert.equal(guest.status,201);let token=guest.data.token,id=guest.data.profile.id;
 assert.equal(guest.data.profile.kind,'guest');assert.equal(guest.data.profile.city,'Long Beach');
 assert.equal((await request('/me','GET',undefined,token)).data.profile.id,id);
 now+=30000;const batch={id:crypto.randomUUID(),seconds:30};
 assert.equal((await request('/usage','POST',batch,token)).status,200);
 await request('/usage','POST',batch,token);
 assert.equal((await request('/me','GET',undefined,token)).data.profile.active_seconds,30,'retry is idempotent');
 await request('/usage','POST',{id:crypto.randomUUID(),seconds:90},token);
 assert.equal((await request('/me','GET',undefined,token)).data.profile.active_seconds,30,'cannot credit faster than wall clock');
 now+=10000;await request('/usage','POST',{id:crypto.randomUUID(),seconds:90},token);
 assert.equal((await request('/me','GET',undefined,token)).data.profile.active_seconds,40);
 assert.equal((await request('/usage','POST',{id:crypto.randomUUID(),seconds:1,transcript:'Do not store'},token)).status,400);
 assert.equal((await request('/admin/people','GET',undefined,token)).status,403);
 const challenge=(await request('/challenge','POST',{},token)).data;
 assert.equal((await request('/login','POST',{credential:'valid',nonce:'x'.repeat(64)},token)).status,401);
 const login=await request('/login','POST',{credential:'valid',nonce:challenge.nonce},token);assert.equal(login.status,200);
 let memberToken=login.data.token;assert.equal(login.data.profile.display_name,'Test Pilot');assert.equal(login.data.profile.active_seconds,40);
 assert.equal((await request('/me','GET',undefined,token)).status,401,'old credential rotates');
 assert.equal((await request('/admin/people','GET',undefined,memberToken)).status,403,'normal member cannot view owner data');
 // A separate owned guest can join the same verified Google identity; time merges once.
 const another=(await request('/session','POST',{})).data;now+=10000;
 await request('/usage','POST',{id:crypto.randomUUID(),seconds:10},another.token);
 const c2=(await request('/challenge','POST',{},another.token)).data;
 const merged=await request('/login','POST',{credential:'valid',nonce:c2.nonce},another.token);
 assert.equal(merged.data.profile.id,id);assert.equal(merged.data.profile.active_seconds,50);
 assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM people WHERE kind='member'").get().n,1);
 // Bad token fails and its nonce cannot be replayed.
 const badGuest=(await request('/session','POST',{})).data,c3=(await request('/challenge','POST',{},badGuest.token)).data;
 assert.equal((await request('/login','POST',{credential:'bad',nonce:c3.nonce},badGuest.token)).status,401);
 assert.equal((await request('/login','POST',{credential:'valid',nonce:c3.nonce},badGuest.token)).status,401);
 // Owner access comes from verified server claims, never a client field.
 const ownerGuest=(await request('/session','POST',{})).data,c4=(await request('/challenge','POST',{},ownerGuest.token)).data;
 claims={sub:'owner-456',name:'Owner',email:'owner@gmail.com',email_verified:true};
 const ownerLogin=(await request('/login','POST',{credential:'valid',nonce:c4.nonce},ownerGuest.token)).data;
 assert.equal(ownerLogin.owner,true);
 const report=await request('/admin/people','GET',undefined,ownerLogin.token);assert.equal(report.status,200);
 assert.equal(report.data.summary.members,2);assert.equal(report.data.summary.active_seconds,50);
 assert.equal(sqlite.prepare('SELECT SUM(active_seconds) n FROM usage_daily WHERE person_id=?').get(id).n,50,'guest daily usage merges with the member');
 assert.ok(report.data.people.every(p=>!('google_sub' in p)&&!('token_hash' in p)&&!('email' in p)));
 // Deletion removes the requesting person's sessions and usage rows only.
 assert.equal((await request('/me','DELETE',undefined,merged.data.token)).status,200);
 assert.equal((await request('/me','GET',undefined,memberToken)).status,401);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM usage_batches WHERE person_id=?').get(id).n,0);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM usage_daily WHERE person_id=?').get(id).n,0,'daily records cascade on profile deletion');
 assert.equal((await request('/admin/people','GET',undefined,ownerLogin.token)).status,200);
 now+=3600001;assert.equal((await request('/admin/people','GET',undefined,ownerLogin.token)).status,403);
 assert.equal((await request('/me','GET',undefined,ownerLogin.token)).status,200,'owner stays signed in after report authorization expires');
 assert.equal((await request('/me','GET',undefined,ownerLogin.token)).data.owner,false);
 now+=2*86400000;assert.equal((await request('/me','GET',undefined,ownerLogin.token)).status,200,'remember login across visits');
 now+=30*86400000;assert.equal((await request('/me','GET',undefined,ownerLogin.token)).status,401,'login expires after thirty days');
 env.API_RATE_LIMITER.limit=async()=>({success:false});assert.equal((await request('/session','POST',{})).status,429);
}finally{Date.now=realNow;}
// Verify actual RSA signatures and claims using generated test keys, not an auth bypass.
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);Object.assign(jwk,{kid:'test-signing-key',alg:'RS256',use:'sig'});
const keys=async()=>new Response(JSON.stringify({keys:[jwk]}),{status:200});
const b64=data=>Buffer.from(data).toString('base64url');
const sign=async payload=>{const input=b64(JSON.stringify({alg:'RS256',kid:jwk.kid}))+'.'+b64(JSON.stringify(payload));return input+'.'+b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(input)));};
const payload={iss:'https://accounts.google.com',aud:'test-client',sub:'123',nonce:'test-nonce',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000)};
assert.equal((await verifyGoogleToken(await sign(payload),'test-client','test-nonce',keys)).sub,'123');
for(const patch of [{aud:'wrong'},{iss:'https://evil.example'},{exp:0},{nonce:'wrong'},{iat:Math.floor(Date.now()/1000)+3600}])await assert.rejects(()=>sign({...payload,...patch}).then(t=>verifyGoogleToken(t,'test-client','test-nonce',keys)));
const original=await sign(payload);const parts=original.split('.');parts[1]=b64(JSON.stringify({...payload,sub:'attacker'}));await assert.rejects(()=>verifyGoogleToken(parts.join('.'),'test-client','test-nonce',keys));
const columns=sqlite.prepare('PRAGMA table_info(people)').all().map(x=>x.name);assert.deepEqual(columns,['id','google_sub','display_name','kind','country','region','city','active_seconds','created_at','last_seen']);
console.log('Backend checks passed: SQLite aggregation, retries/caps, own-session access, verified login, guest merge, owner-only reports, token rotation/expiry, deletion, rate limiting, real RSA signature/claim checks, minimal schema');
