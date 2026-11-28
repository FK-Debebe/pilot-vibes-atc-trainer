const bad=message=>{throw Object.assign(Error(message),{status:400});};
function date(value){
 if(!value)return '';
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)bad('Use valid dates in YYYY-MM-DD format.');
 return value;
}
export async function ownerPeople(env,p,ownerId){
 const start=date(p.get('start')),end=date(p.get('end'));
 if(start&&end&&start>end)bad('Start date must be on or before end date.');
 const mode=p.get('mode')||'',kind=p.get('kind')||'';
 if(mode&&!['vfr','ifr','unknown'].includes(mode))bad('Invalid training mode.');
 if(kind&&!['guest','member'].includes(kind))bad('Invalid user type.');
 const offset=Number(p.get('offset')||0);
 if(!Number.isSafeInteger(offset)||offset<0)bad('Invalid page offset.');
 const dailyArgs=[],dailyWhere=[];
 if(start){dailyWhere.push('day>=?');dailyArgs.push(start);}
 if(end){dailyWhere.push('day<=?');dailyArgs.push(end);}
 const dated=!!(start||end);
 // Lifetime totals include usage collected before daily/mode recording was introduced.
 const cte=`WITH d AS (SELECT person_id,SUM(active_seconds) total,
 SUM(CASE WHEN mode='vfr' THEN active_seconds ELSE 0 END) vfr_seconds,
 SUM(CASE WHEN mode='ifr' THEN active_seconds ELSE 0 END) ifr_seconds,
 SUM(CASE WHEN mode='unknown' THEN active_seconds ELSE 0 END) unknown_seconds
 FROM usage_daily ${dailyWhere.length?'WHERE '+dailyWhere.join(' AND '):''} GROUP BY person_id),
 metrics AS (SELECT p.id,p.display_name,p.kind,p.country,p.region,p.city,p.created_at,p.last_seen,
 ${dated?'COALESCE(d.total,0)':'p.active_seconds'} active_seconds,
 COALESCE(d.vfr_seconds,0) vfr_seconds,COALESCE(d.ifr_seconds,0) ifr_seconds,
 ${dated?'COALESCE(d.unknown_seconds,0)':'MAX(0,p.active_seconds-COALESCE(d.vfr_seconds,0)-COALESCE(d.ifr_seconds,0))'} unknown_seconds
 FROM people p LEFT JOIN d ON d.person_id=p.id),
 selected AS (SELECT *,${mode?mode+'_seconds':'active_seconds'} filtered_seconds FROM metrics)`;
 const args=[...dailyArgs],where=[];
 if(dated||mode)where.push('filtered_seconds>0');
 for(const [key,column] of [['search','display_name'],['country','country'],['region','region'],['city','city']]){
  const value=(p.get(key)||'').trim();if(value.length>100)bad('Filter text is too long.');
  if(value){where.push(`instr(lower(${column}),lower(?))>0`);args.push(value);}
 }
 if(kind){where.push('kind=?');args.push(kind);}
 if(p.get('excludeSelf')==='1'){where.push('id<>?');args.push(ownerId);}
 const filter=where.length?' WHERE '+where.join(' AND '):'';
 const sorts={hours:'filtered_seconds DESC,id',recent:'last_seen DESC,id',name:'display_name COLLATE NOCASE,id'};
 const sort=p.get('sort')||'recent';if(!sorts[sort])bad('Invalid sort order.');
 const rows=await env.DB.prepare(cte+' SELECT * FROM selected'+filter+' ORDER BY '+sorts[sort]+' LIMIT 101 OFFSET ?').bind(...args,offset).all();
 const summary=await env.DB.prepare(cte+` SELECT COUNT(*) people,COALESCE(SUM(kind='guest'),0) guests,COALESCE(SUM(kind='member'),0) members,
 COALESCE(SUM(filtered_seconds),0) active_seconds,
 COALESCE(SUM(${mode&&mode!=='vfr'?'0':'vfr_seconds'}),0) vfr_seconds,
 COALESCE(SUM(${mode&&mode!=='ifr'?'0':'ifr_seconds'}),0) ifr_seconds,
 COALESCE(SUM(${mode&&mode!=='unknown'?'0':'unknown_seconds'}),0) unknown_seconds FROM selected`+filter).bind(...args).first();
 const meta=await env.DB.prepare("SELECT value FROM usage_metadata WHERE key='daily_since'").first();
 return {people:rows.results.slice(0,100).map(row=>({...row,active_seconds:row.filtered_seconds,
 vfr_seconds:mode&&mode!=='vfr'?0:row.vfr_seconds,ifr_seconds:mode&&mode!=='ifr'?0:row.ifr_seconds,unknown_seconds:mode&&mode!=='unknown'?0:row.unknown_seconds})),summary,
 nextOffset:rows.results.length>100?offset+100:null,dailySince:meta?.value||null,timezone:'UTC'};
}
