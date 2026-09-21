import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3100';
const emails=[];const password=randomUUID()+randomUUID();
async function request(path,method='GET',data,cookie,origin=process.env.TEST_ORIGIN||'https://ourownleads.test'){const r=await fetch(base+'/api/'+path,{method,headers:{Origin:origin,...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
try{
 assert.equal((await request('workspace')).status,401);
 const accounts=[];
 for(let i=0;i<2;i++){const email=`test-${randomUUID()}@example.invalid`;emails.push(email);const r=await request('auth/register','POST',{name:'Test Account',business:'Test Business',email,password});assert.equal(r.status,201);assert.ok(r.cookie);accounts.push(r.cookie);}
 const [a,b]=accounts;
 const lead={name:'Test Lead',phone:'+12025550123',stage:'New',consent:0};
 const create=await request('leads','POST',lead,a);assert.equal(create.status,201);
 assert.equal((await request('leads','POST',lead,a)).status,409);
 assert.equal((await request('workspace','GET',undefined,b)).data.leads.length,0);
 assert.equal((await request('leads/'+create.data.id,'PATCH',lead,b)).status,404);
 assert.equal((await request('leads','POST',lead,a,'https://untrusted.example')).status,403);
 const imp=await request('imports','POST',{rows:[['Imported','+12025550124'],['Duplicate','+12025550123']],mapping:{name:0,phone:1},confirm:true},a);assert.deepEqual(imp.data,{imported:1,duplicates:1,skipped:0,errors:[]});
 const mixed=await request('imports','POST',{rows:[['Dummy','p:<test lead: dummy data for phone_number>'],['Valid One','p:+12025550126'],['Valid Two','+12025550127']],mapping:{name:0,phone:1},confirm:true},a);
 assert.equal(mixed.status,200);assert.equal(mixed.data.imported,2);assert.equal(mixed.data.skipped,1);assert.equal(mixed.data.errors[0].row,2);
 const retry=await request('imports','POST',{rows:[['Dummy','p:<test lead: dummy data for phone_number>'],['Valid One','p:+12025550126'],['Valid Two','+12025550127']],mapping:{name:0,phone:1},confirm:true},a);
 assert.equal(retry.data.imported,0);assert.equal(retry.data.duplicates,2);assert.equal(retry.data.skipped,1);
 assert.equal((await request('imports','POST',{rows:[['Dummy','N/A']],mapping:{name:0,phone:1},confirm:true},a)).status,400);
 const customImport=await request('imports','POST',{rows:[['Custom Lead','p:+12025550125','Autumn','Premium']],columns:[{id:'n',label:'Full name',target:'name',column:0},{id:'p',label:'WhatsApp number',target:'phone',column:1},{id:'c',label:'Campaign',target:'custom',column:2},{id:'b',label:'Plan',target:'custom',column:3}],confirm:true},a);
 assert.equal(customImport.status,200);assert.equal(customImport.data.imported,1);
 const imported=(await request('workspace','GET',undefined,a)).data.leads.find(l=>l.phone==='+12025550125');assert.deepEqual(imported.customFields,{Campaign:'Autumn',Plan:'Premium'});
 assert.equal((await request('leads/'+imported.id,'PATCH',{...imported,notes:'Edited without losing custom fields'},a)).status,200);
 assert.deepEqual((await request('workspace','GET',undefined,a)).data.leads.find(l=>l.id===imported.id).customFields,imported.customFields);
 assert.equal((await request('workspace','GET',undefined,b)).data.leads.length,0);
 assert.equal((await request('knowledge','POST',{title:'Delivery',body:'Delivery takes three days.'},a)).status,201);
 assert.equal((await request('knowledge/search','POST',{question:'delivery'},a)).data.matches.length,1);
 assert.equal((await request('knowledge/search','POST',{question:'delivery'},b)).data.matches.length,0);
 const workspace=(await request('workspace','GET',undefined,a)).data;
 assert.equal((await request('profile','PATCH',{...workspace.profile,business:'Updated Business'},a)).status,200);
 assert.equal((await request('workspace','GET',undefined,a)).data.profile.business,'Updated Business');
 assert.equal((await request('messages','POST',{leadId:create.data.id,requestKey:randomUUID(),body:'Test'},a)).status,400);
 assert.equal((await request('auth/logout','POST',{},a)).status,200);
 assert.equal((await request('workspace','GET',undefined,a)).status,401);
 assert.equal((await request('auth/login','POST',{email:emails[0],password})).status,200);
 console.log('PASS: registration, login/logout, persistence, tenant isolation, CSRF, imports, deduplication, knowledge search, messaging guards. No external messages sent.');
}finally{
 const db=new DatabaseSync(process.env.TEST_DB_PATH||'data/our-own-leads.sqlite');db.exec('PRAGMA foreign_keys=ON');
 for(const email of emails){const u=db.prepare('SELECT id FROM users WHERE email=?').get(email);if(u){for(const table of ['whatsapp_signup','messages','sessions','knowledge','connections','leads'])db.prepare(`DELETE FROM ${table} WHERE userId=?`).run(u.id);db.prepare('DELETE FROM users WHERE id=?').run(u.id);}db.prepare('DELETE FROM auth_attempts WHERE email=?').run(email);}db.close();
}
