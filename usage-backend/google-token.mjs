// Fixed issuer/key endpoint; RS256 verification uses platform WebCrypto, never a client-selected key URL.
const encoder=new TextEncoder();let keyCache=null,keyUntil=0;
function decode(part){return Uint8Array.from(atob(part.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
export async function verifyGoogleToken(token,clientId,nonce,fetchKeys=()=>fetch('https://www.googleapis.com/oauth2/v3/certs')){
 if(typeof token!=='string'||token.length>12000||!clientId||!nonce)throw Error('Invalid sign-in');
 const parts=token.split('.');if(parts.length!==3)throw Error('Invalid token');
 const head=JSON.parse(new TextDecoder().decode(decode(parts[0])));
 if(head.alg!=='RS256'||typeof head.kid!=='string')throw Error('Invalid signing algorithm');
 // Tests supply their own fetcher, but production always uses the fixed Google endpoint.
 if(!keyCache||Date.now()>keyUntil||!keyCache.some(k=>k.kid===head.kid)){
  const response=await fetchKeys();if(!response.ok)throw Error('Google verification unavailable');
  const body=await response.json();if(!Array.isArray(body.keys))throw Error('Invalid keys');
  keyCache=body.keys;keyUntil=Date.now()+60*60*1000;
 }
 const jwk=keyCache.find(k=>k.kid===head.kid&&k.kty==='RSA'&&(!k.use||k.use==='sig')&&(!k.alg||k.alg==='RS256'));
 if(!jwk)throw Error('Unknown key');
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),encoder.encode(parts[0]+'.'+parts[1])))throw Error('Invalid signature');
 const claims=JSON.parse(new TextDecoder().decode(decode(parts[1]))),now=Math.floor(Date.now()/1000);
 if(!['accounts.google.com','https://accounts.google.com'].includes(claims.iss)||claims.aud!==clientId||
  (claims.azp&&claims.azp!==clientId)||typeof claims.exp!=='number'||claims.exp<=now||
  typeof claims.iat!=='number'||claims.iat>now+60||claims.iat<now-7200||
  (claims.nbf&&claims.nbf>now+60)||typeof claims.sub!=='string'||!claims.sub||claims.sub.length>255||claims.nonce!==nonce)throw Error('Invalid token claims');
 return claims;
}
