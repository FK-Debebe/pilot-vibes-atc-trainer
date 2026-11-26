import {verifyGoogleToken} from './google-token.mjs';
const enc=new TextEncoder();
export const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
const secret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const clean=(v,n=100)=>typeof v==='string'?v.replace(/[\u0000-\u001f]/g,'').slice(0,n):'';
const uuid=v=>typeof v==='string'&&/^[0-9a-f-]{36}$/i.test(v);
const geo=req=>({country:clean(req.cf?.country,2),region:clean(req.cf?.region,80),city:clean(req.cf?.city,80)});
const origins=env=>String(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
function response(data,status=200,origin=''){
 return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})}});
}
async function body(req){
 if(!req.headers.get('Content-Type')?.startsWith('application/json'))throw new Error('JSON required');
 const reader=req.body?.getReader();if(!reader)return {};
 let size=0,chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16000){await reader.cancel();throw Error('Request too large');}chunks.push(value);}
 const all=new Uint8Array(size);let at=0;for(const c of chunks){all.set(c,at);at+=c.length;}return JSON.parse(new TextDecoder().decode(all));
}
async function session(req,env){
 const token=req.headers.get('Authorization')?.match(/^Bearer ([0-9a-f]{64})$/)?.[1];if(!token)return null;
 const hash=await digest(token);
 const row=await env.DB.prepare('SELECT s.*,p.kind,p.display_name FROM sessions s JOIN people p ON p.id=s.person_id WHERE token_hash=? AND expires_at>?').bind(hash,Date.now()).first();
 return row?{...row,hash}:null;
}
const profile=async(env,id)=>env.DB.prepare('SELECT id,display_name,kind,active_seconds,country,region,city FROM people WHERE id=?').bind(id).first();
export function createWorker(verify=verifyGoogleToken){return {
 async fetch(req,env){
  if(new URL(req.url).protocol!=='https:')return response({error:'HTTPS required'},400);
  const origin=req.headers.get('Origin')||'';
  if(!origins(env).includes(origin))return response({error:'Origin not allowed'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Max-Age':'600','Vary':'Origin'}});
  if(!env.DB)return response({error:'Usage service not configured'},503,origin);
  try{
   if(!env.API_RATE_LIMITER)return response({error:'Rate limiter not configured'},503,origin);
   const rate=await env.API_RATE_LIMITER.limit({key:await digest(req.headers.get('CF-Connecting-IP')||'unknown')});
   if(!rate.success)return response({error:'Too many requests'},429,origin);
   const path=new URL(req.url).pathname;
   if(path==='/session'&&req.method==='POST'){
    const data=await body(req);if(Object.keys(data).length)return response({error:'Unexpected fields'},400,origin);
    const id=crypto.randomUUID(),token=secret(),hash=await digest(token),now=Date.now(),g=geo(req);
    await env.DB.batch([
     env.DB.prepare('INSERT INTO people(id,display_name,kind,country,region,city,created_at,last_seen) VALUES(?,?,?,?,?,?,?,?)').bind(id,'Guest '+id.slice(0,8),'guest',g.country,g.region,g.city,now,now),
     env.DB.prepare('INSERT INTO sessions(token_hash,person_id,expires_at,last_credit_ms) VALUES(?,?,?,?)').bind(hash,id,now+90*86400000,now)
    ]);
    return response({token,profile:await profile(env,id),owner:false},201,origin);
   }
   const s=await session(req,env);if(!s)return response({error:'Sign in/session required'},401,origin);
   if(path==='/me'&&req.method==='GET')return response({profile:await profile(env,s.person_id),owner:!!s.owner},200,origin);
   if(path==='/me'&&req.method==='DELETE'){
    await env.DB.prepare('DELETE FROM people WHERE id=?').bind(s.person_id).run();return response({deleted:true},200,origin);
   }
   if(path==='/logout'&&req.method==='POST'){
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(s.hash).run();return response({signedOut:true},200,origin);
   }
   if(path==='/challenge'&&req.method==='POST'){
    if(!env.GOOGLE_CLIENT_ID)return response({error:'Google sign-in not configured'},503,origin);
    const nonce=secret();await env.DB.prepare('UPDATE sessions SET nonce_hash=?,nonce_expires=? WHERE token_hash=?').bind(await digest(nonce),Date.now()+300000,s.hash).run();
    return response({nonce},200,origin);
   }
   if(path==='/login'&&req.method==='POST'){
    const data=await body(req);
    if(Object.keys(data).some(k=>!['credential','nonce'].includes(k))||typeof data.nonce!=='string'||data.nonce.length!==64||!s.nonce_hash||s.nonce_expires<Date.now()||await digest(data.nonce)!==s.nonce_hash)return response({error:'Invalid or expired sign-in challenge'},401,origin);
    // Consume the challenge once, atomically, before processing identity.
    const consumed=await env.DB.prepare('UPDATE sessions SET nonce_hash=NULL,nonce_expires=NULL WHERE token_hash=? AND nonce_hash=?').bind(s.hash,s.nonce_hash).run();
    if(!consumed.meta.changes)return response({error:'Challenge already used'},401,origin);
    let claims;try{claims=await verify(data.credential,env.GOOGLE_CLIENT_ID,data.nonce);}catch{return response({error:'Google identity could not be verified'},401,origin);}
    const sub=await digest('google:'+claims.sub),name=clean(claims.name)||'Signed-in pilot';
    const owner=claims.email_verified===true && String(claims.email||'').toLowerCase().endsWith('@gmail.com') &&
      String(env.OWNER_EMAILS||'').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean).includes(String(claims.email).toLowerCase());
    const member=await env.DB.prepare('SELECT id FROM people WHERE google_sub=?').bind(sub).first();
    const now=Date.now(),token=secret(),hash=await digest(token),g=geo(req);
    let id=member?.id||s.person_id;
    const statements=[];
    if(!member){
     // Only a guest can become a new member. Switching members requires sign-out first.
     if(s.kind!=='guest')return response({error:'Sign out before switching accounts'},409,origin);
     statements.push(env.DB.prepare('UPDATE people SET google_sub=?,display_name=?,kind=\'member\' WHERE id=?').bind(sub,name,id));
    }else if(s.person_id!==id){
     if(s.kind!=='guest')return response({error:'Sign out before switching accounts'},409,origin);
     statements.push(env.DB.prepare('UPDATE people SET active_seconds=active_seconds+(SELECT active_seconds FROM people WHERE id=?) WHERE id=?').bind(s.person_id,id));
     statements.push(env.DB.prepare('DELETE FROM people WHERE id=?').bind(s.person_id));
    }
    statements.push(env.DB.prepare('UPDATE people SET display_name=?,country=?,region=?,city=?,last_seen=? WHERE id=?').bind(name,g.country,g.region,g.city,now,id));
    statements.push(env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(s.hash));
    statements.push(env.DB.prepare('INSERT INTO sessions(token_hash,person_id,expires_at,last_credit_ms,owner) VALUES(?,?,?,?,?)').bind(hash,id,now+(owner?3600000:86400000),now,owner?1:0));
    await env.DB.batch(statements);
    return response({token,profile:await profile(env,id),owner},200,origin);
   }
   if(path==='/usage'&&req.method==='POST'){
    const data=await body(req);
    if(Object.keys(data).some(k=>!['id','seconds'].includes(k))||!uuid(data.id)||!Number.isInteger(data.seconds)||data.seconds<1||data.seconds>90)return response({error:'Invalid usage batch'},400,origin);
    const now=Date.now(),g=geo(req);
    // An atomic insert/trigger deduplicates retries and caps credit to server elapsed time.
    await env.DB.batch([
     env.DB.prepare('INSERT OR IGNORE INTO usage_batches(id,person_id,session_hash,seconds,received_at) SELECT ?,person_id,token_hash,MIN(?,MAX(0,CAST((?-last_credit_ms)/1000 AS INTEGER))),? FROM sessions WHERE token_hash=? AND expires_at>?').bind(data.id,data.seconds,now,now,s.hash,now),
     env.DB.prepare('UPDATE people SET country=?,region=?,city=? WHERE id=?').bind(g.country,g.region,g.city,s.person_id)
    ]);
    return response({accepted:true},200,origin);
   }
   if(path==='/admin/people'&&req.method==='GET'){
    if(!s.owner)return response({error:'Owner access only'},403,origin);
    const url=new URL(req.url),offset=Math.max(0,Math.min(100000,Number(url.searchParams.get('offset'))||0));
    const rows=await env.DB.prepare('SELECT id,display_name,kind,country,region,city,active_seconds,created_at,last_seen FROM people ORDER BY last_seen DESC,id LIMIT 100 OFFSET ?').bind(offset).all();
    const summary=await env.DB.prepare('SELECT COUNT(*) people,SUM(kind=\'guest\') guests,SUM(kind=\'member\') members,COALESCE(SUM(active_seconds),0) active_seconds FROM people').first();
    return response({people:rows.results,summary,nextOffset:rows.results.length===100?offset+100:null},200,origin);
   }
   return response({error:'Not found'},404,origin);
  }catch{return response({error:'Usage service temporarily unavailable'},503,origin);}
 },
 async scheduled(_event,env){
  const now=Date.now();await env.DB.batch([
   env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(now),
   env.DB.prepare('DELETE FROM usage_batches WHERE received_at<?').bind(now-2*86400000),
   env.DB.prepare('DELETE FROM people WHERE kind=\'guest\' AND last_seen<?').bind(now-180*86400000)
  ]);
 }
};}
export default createWorker();
