import {createHash,randomBytes,randomInt} from 'node:crypto';
import {ApiError,sessionToken,required} from './auth';
import {one,run,now} from './store';
import {encrypt,meta,connection} from './whatsapp';
import {platformConfig,signupStatus} from './platform';
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export function beginSignup(req:Request,userId:string){if(!signupStatus(userId).ready)throw new ApiError(503,'WhatsApp connection is being prepared by our team. Please try again later.');const attempt=randomBytes(32).toString('hex');run('DELETE FROM whatsapp_signup WHERE userId=? OR expires<?',userId,Date.now());run('INSERT INTO whatsapp_signup(attempt,userId,sessionHash,expires) VALUES(?,?,?,?)',digest(attempt),userId,digest(sessionToken(req)),Date.now()+15*60*1000);return {attempt};}
export async function completeSignup(req:Request,userId:string,d:Record<string,unknown>){
 if(!signupStatus(userId).ready)throw new ApiError(503,'WhatsApp connection is temporarily unavailable.');
 const attempt=required(d.attempt,'Connection session'),code=required(d.code,'Facebook authorization',4000),wabaId=required(d.wabaId,'WhatsApp account'),phoneId=required(d.phoneId,'Business number');
 if(!/^\d+$/.test(wabaId)||!/^\d+$/.test(phoneId))throw new ApiError(400,'Please finish selecting and verifying a number in Facebook.');
 const consumed=run('DELETE FROM whatsapp_signup WHERE attempt=? AND userId=? AND sessionHash=? AND expires>?',digest(attempt),userId,digest(sessionToken(req)),Date.now());
 if(!consumed.changes)throw new ApiError(400,'This connection session expired or was already used. Please start again.');
 const existing=connection(userId);if(existing&&existing.phoneId!==phoneId)throw new ApiError(409,'Reconnect your existing number. Contact support to change business numbers.');
 if(one('SELECT userId FROM connections WHERE phoneId=? AND userId<>?',phoneId,userId))throw new ApiError(409,'This number is connected to another workspace.');
 const config=platformConfig(),version=process.env.META_GRAPH_VERSION||'v25.0';
 const response=await fetch(`https://graph.facebook.com/${version}/oauth/access_token`,{method:'POST',body:new URLSearchParams({client_id:config.appId,client_secret:config.appSecret,code}),signal:AbortSignal.timeout(20000),cache:'no-store'});
 const result=await response.json() as {access_token?:string};if(!response.ok||!result.access_token)throw new ApiError(400,'Facebook authorization could not be completed. Please connect again.');
 const token=result.access_token;
 // Treat browser IDs as untrusted: require the exchanged token to access this WABA and number.
 const numbers=await meta(`${wabaId}/phone_numbers?fields=id,display_phone_number,status&limit=100`,token);
 const phone=numbers.data?.find(p=>p.id===phoneId);if(!phone)throw new ApiError(403,'Facebook did not grant access to the selected business number.');
 // Reserve the number before external mutations to prevent concurrent cross-workspace claims.
 const pendingToken=encrypt(token);
 const reservation=run('INSERT INTO connections(userId,phoneId,wabaId,displayPhone,token,updatedAt,status) VALUES(?,?,?,?,?,?,?) ON CONFLICT(userId) DO UPDATE SET token=excluded.token,wabaId=excluded.wabaId,displayPhone=excluded.displayPhone,status=excluded.status,updatedAt=excluded.updatedAt WHERE connections.phoneId=excluded.phoneId',userId,phoneId,wabaId,phone.display_phone_number,pendingToken,now(),'pending');
 if(!reservation.changes)throw new ApiError(409,'A different number was connected during setup. Please refresh.');
 try{
  if(phone.status!=='CONNECTED'){const pin=String(randomInt(100000,1000000));run('UPDATE connections SET registrationPin=? WHERE userId=?',encrypt(pin),userId);await meta(`${phoneId}/register`,token,{method:'POST',body:JSON.stringify({messaging_product:'whatsapp',pin})});}
  await meta(`${wabaId}/subscribed_apps`,token,{method:'POST',body:'{}'});
  run("UPDATE connections SET status='connected',updatedAt=? WHERE userId=?",now(),userId);
 }catch{throw new ApiError(502,'Your number was authorized, but setup could not finish. Reconnect to retry, or contact support.');}
 return {ok:true};
}
