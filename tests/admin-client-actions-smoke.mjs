import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

// Run against an isolated test server/database, never a real client workspace.
const base=process.env.TEST_BASE_URL;
assert.ok(base && process.env.TEST_ADMIN_PASSWORD,'Set TEST_BASE_URL and TEST_ADMIN_PASSWORD for an isolated test server.');
async function request(path,data,cookie,origin=base){
 const response=await fetch(`${base}/api/${path}`,{method:data?'POST':'GET',headers:{Origin:origin,...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});
 return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const email=`admin-actions-${randomUUID()}@example.invalid`,oldPassword=randomUUID(),newPassword=randomUUID();
const registered=await request('auth/register',{name:'Disposable Client',business:'Client Actions Test',email,password:oldPassword});
assert.equal(registered.status,201);
const profile=(await request('workspace',undefined,registered.cookie)).data.profile;
const path=`admin/clients/${profile.id}`;
for(const action of ['login','password']){
 assert.equal((await request(`${path}/${action}`,{password:newPassword})).status,401);
 assert.equal((await request(`${path}/${action}`,{password:newPassword},registered.cookie)).status,401);
}
const admin=await request('admin/login',{username:'admin',password:process.env.TEST_ADMIN_PASSWORD});
assert.equal(admin.status,200);
assert.equal((await request(`${path}/login`,{},admin.cookie,'https://untrusted.example')).status,403);
assert.equal((await request(`${path}/password`,{password:newPassword},admin.cookie,'https://untrusted.example')).status,403);
assert.equal((await request('admin/clients/missing/login',{},admin.cookie)).status,404);
assert.equal((await request('admin/clients/missing/password',{password:newPassword},admin.cookie)).status,404);
assert.equal((await request(`${path}/login`,undefined,admin.cookie)).status,405);
const impersonated=await request(`${path}/login`,{},admin.cookie);
assert.equal(impersonated.status,200);
assert.equal((await request('workspace',undefined,impersonated.cookie)).data.profile.id,profile.id);
assert.equal((await request('admin/clients',undefined,impersonated.cookie)).status,401);
assert.equal((await request(`${path}/password`,{password:'short'},admin.cookie)).status,400);
assert.equal((await request(`${path}/password`,{password:'x'.repeat(201)},admin.cookie)).status,400);
assert.equal((await request(`${path}/password`,{password:newPassword},admin.cookie)).status,200);
assert.equal((await request('workspace',undefined,registered.cookie)).status,401);
assert.equal((await request('workspace',undefined,impersonated.cookie)).status,401);
assert.equal((await request('auth/login',{email,password:oldPassword})).status,401);
assert.equal((await request('auth/login',{email,password:newPassword})).status,200);
assert.equal((await request('admin/session',undefined,admin.cookie)).data.authenticated,true);
assert.equal((await request('admin/logout',{},admin.cookie)).status,200);
assert.equal((await request(`${path}/login`,{},admin.cookie)).status,401);
console.log('PASS: admin-only client login, CSRF, missing clients, password validation, session revocation, new password login, separate admin session.');
