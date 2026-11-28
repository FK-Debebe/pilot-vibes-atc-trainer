import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';import {ownerPeople} from './owner-reports.mjs';import {createWorker} from './worker.mjs';
const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
function prepare(sql,args=[]){return {bind(...a){return prepare(sql,a)},async first(){return sqlite.prepare(sql).get(...args)||null},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}}}}}
const DB={prepare,async batch(ss){sqlite.exec('BEGIN');try{for(const s of ss)await s.run();sqlite.exec('COMMIT')}catch(e){sqlite.exec('ROLLBACK');throw e}}},env={DB};
const person=(id,name,seconds,kind='member',city='Long Beach')=>sqlite.prepare('INSERT INTO people(id,display_name,kind,country,region,city,created_at,last_seen,active_seconds) VALUES(?,?,?,?,?,?,?,?,?)').run(id,name,kind,'US','California',city,1,1000,seconds);
const daily=(id,day,mode,seconds)=>sqlite.prepare('INSERT INTO usage_daily VALUES(?,?,?,?)').run(id,day,mode,seconds);
person('owner','Owner',100);person('alice','Alice',1000);person('bob','Bob',300,'guest','San Diego');
daily('owner','2026-11-26','vfr',100);daily('alice','2026-11-26','vfr',200);daily('alice','2026-11-27','ifr',400);daily('bob','2026-11-27','unknown',300);
const report=q=>ownerPeople(env,new URLSearchParams(q),'owner');
let r=await report('');assert.equal(r.summary.active_seconds,1400);assert.equal(r.summary.unknown_seconds,700);assert.equal(r.summary.vfr_seconds,300);assert.equal(r.summary.ifr_seconds,400);
r=await report('start=2026-11-27&end=2026-11-27');assert.equal(r.summary.active_seconds,700);assert.equal(r.summary.people,2);
r=await report('mode=vfr&excludeSelf=1');assert.equal(r.summary.people,1);assert.equal(r.summary.active_seconds,200);assert.equal(r.summary.ifr_seconds,0);
r=await report('kind=guest&country=US&region=calif&city=diego&search=bo');assert.equal(r.people[0].id,'bob');
assert.equal((await report('search=%27%20OR%201%3D1')).summary.people,0);
assert.equal((await report('start=2026-11-28')).summary.people,0);
assert.equal((await report('mode=unknown')).summary.active_seconds,700);
for(const q of ['start=2026-02-30','start=2026-11-28&end=2026-11-27','offset=-1','mode=bad','sort=DROP TABLE people','kind=owner'])await assert.rejects(()=>report(q),e=>e.status===400);
for(let i=0;i<205;i++)person('page'+i,'Pilot '+String(i).padStart(3,'0'),0);
let offset=0,ids=[];do{r=await report('sort=name&offset='+offset);ids.push(...r.people.map(p=>p.id));offset=r.nextOffset}while(offset!==null);assert.equal(new Set(ids).size,208);assert.equal(ids.length,208);
// Actual endpoint authorization and atomic, deduplicated daily credits.
const token='a'.repeat(64),{digest}=await import('./worker.mjs');const hash=await digest(token);let now=Date.now();
sqlite.prepare('INSERT INTO sessions(token_hash,person_id,expires_at,last_credit_ms,owner) VALUES(?,?,?,?,?)').run(hash,'alice',now+30*86400000,now-30000,0);
const worker=createWorker();Object.assign(env,{ALLOWED_ORIGINS:'https://atc.fwdskillzone.com',API_RATE_LIMITER:{limit:async()=>({success:true})}});
const req=async(path,method='GET',data)=>{const response=await worker.fetch(new Request('https://api.example'+path,{method,headers:{Origin:'https://atc.fwdskillzone.com',Authorization:'Bearer '+token,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})}),env);return {status:response.status,data:await response.json()}};
assert.equal((await req('/admin/people')).status,403);
const batch={id:crypto.randomUUID(),seconds:30,mode:'ifr'};assert.equal((await req('/usage','POST',batch)).status,200);await req('/usage','POST',batch);
assert.equal(sqlite.prepare("SELECT SUM(active_seconds) n FROM usage_daily WHERE person_id='alice' AND mode='ifr'").get().n,430);
assert.equal((await req('/usage','POST',{id:crypto.randomUUID(),seconds:30,mode:'sql'})).status,400);
sqlite.prepare('UPDATE sessions SET owner=1 WHERE token_hash=?').run(hash);assert.equal((await req('/admin/people?mode=ifr')).status,200);assert.equal((await req('/admin/people?start=bad')).status,400);
// Old database migration preserves lifetime totals and installs future daily credit.
const old=new DatabaseSync(':memory:');const schema=readFileSync(new URL('./schema.sql',import.meta.url),'utf8');const before=schema.slice(0,schema.indexOf('CREATE TABLE IF NOT EXISTS usage_daily')).replace(", mode TEXT NOT NULL DEFAULT 'unknown' CHECK(mode IN ('vfr','ifr','unknown'))",'');old.exec(before);
old.prepare('INSERT INTO people(id,display_name,kind,created_at,last_seen,active_seconds) VALUES(?,?,?,?,?,?)').run('legacy','Legacy','member',1,1,900);
old.exec(readFileSync(new URL('./migrations/001_daily_usage.sql',import.meta.url),'utf8'));assert.equal(old.prepare('SELECT active_seconds FROM people').get().active_seconds,900);
assert.equal(old.prepare('SELECT COUNT(*) n FROM usage_daily').get().n,0,'do not invent historical breakdowns');
old.prepare('INSERT INTO sessions(token_hash,person_id,expires_at,last_credit_ms) VALUES(?,?,?,?)').run('x','legacy',now+100000,now-30000);
old.prepare('INSERT INTO usage_batches VALUES(?,?,?,?,?,?)').run('new','legacy','x',30,now,'vfr');assert.equal(old.prepare('SELECT active_seconds FROM usage_daily').get().active_seconds,30);assert.equal(old.prepare('SELECT active_seconds FROM people').get().active_seconds,930);
await worker.scheduled(null,env);assert.equal(sqlite.prepare("SELECT SUM(active_seconds) n FROM usage_daily WHERE person_id='alice'").get().n,630,'retention cleanup keeps daily totals');
console.log('Owner reports passed: date boundaries, mode/identity/location filters, legacy totals, pagination, owner authorization, daily deduplication, migration and retention.');
