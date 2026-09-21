import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {one,run,id,now} from './store';
import type {Profile} from '../crm';
export class ApiError extends Error{constructor(public status:number,message:string){super(message);}}
const hash=(x:string)=>createHash('sha256').update(x).digest('hex');
export function passwordHash(password:string){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex');}
export function checkPassword(password:string,stored:string){const [salt,value]=stored.split(':');const actual=scryptSync(password,salt,64);const expected=Buffer.from(value,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected);}
export function sessionToken(req:Request){return req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('ool_session='))?.slice(12)||'';}
export function user(req:Request){const row=one<Profile&{password:string}>(`SELECT u.* FROM users u JOIN sessions s ON s.userId=u.id WHERE s.token=? AND s.expires>?`,hash(sessionToken(req)),Date.now());if(!row)throw new ApiError(401,'Please sign in to your workspace.');return row;}
export function publicProfile(row:Profile&{password?:string}){const {password,...profile}=row;void password;return profile;}
export function csrf(req:Request){const origin=req.headers.get('origin');const allowed=new URL(process.env.APP_URL||'https://ourownleads.test').origin;if(!origin||![allowed,...(process.env.LOCAL_DEVELOPMENT==='true'?['https://ourownleads.test','http://localhost:3100','http://127.0.0.1:3100']:[])].includes(origin))throw new ApiError(403,'This request must come from your portal.');}
export function loginSession(userId:string){const token=randomBytes(32).toString('hex');run('INSERT INTO sessions(token,userId,expires) VALUES(?,?,?)',hash(token),userId,Date.now()+7*86400000);run('DELETE FROM sessions WHERE expires<?',Date.now());return token;}
export function sessionCookie(token:string){const secure=(process.env.APP_URL||'https://ourownleads.test').startsWith('https:');return `ool_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${token?604800:0}${secure?'; Secure':''}`;}
export function logout(req:Request){run('DELETE FROM sessions WHERE token=?',hash(sessionToken(req)));}
export async function body(req:Request){if(Number(req.headers.get('content-length')||0)>3_000_000)throw new ApiError(413,'This upload is too large.');const text=await req.text();if(text.length>3_000_000)throw new ApiError(413,'This upload is too large.');try{return JSON.parse(text);}catch{throw new ApiError(400,'Please check your submitted information.');}}
export function required(value:unknown,label:string,max=200){if(typeof value!=='string'||!value.trim())throw new ApiError(400,`${label} is required.`);if(value.length>max)throw new ApiError(400,`${label} is too long.`);return value.trim();}
export function limitAuth(email:string){const row=one<{attempts:number;resetAt:number}>('SELECT * FROM auth_attempts WHERE email=?',email);if(row&&row.resetAt>Date.now()&&row.attempts>=10)throw new ApiError(429,'Too many attempts. Please try again in 15 minutes.');run(`INSERT INTO auth_attempts(email,attempts,resetAt) VALUES(?,1,?) ON CONFLICT(email) DO UPDATE SET attempts=CASE WHEN resetAt<? THEN 1 ELSE attempts+1 END,resetAt=CASE WHEN resetAt<? THEN excluded.resetAt ELSE resetAt END`,email,Date.now()+900000,Date.now(),Date.now());}
export function register(data:Record<string,unknown>){const name=required(data.name,'Your name'),business=required(data.business,'Business name'),email=required(data.email,'Email').toLowerCase(),password=required(data.password,'Password',200);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new ApiError(400,'Enter a valid email address.');if(password.length<8)throw new ApiError(400,'Use at least 8 characters for your password.');if(one('SELECT id FROM users WHERE email=?',email))throw new ApiError(409,'This email already has an account. Please sign in.');const userId=id();run('INSERT INTO users(id,name,email,password,business,supportEmail,createdAt) VALUES(?,?,?,?,?,?,?)',userId,name,email,passwordHash(password),business,email,now());return userId;}

export function loginPlatformAdmin(password:string){
 const configured=process.env.ADMIN_PASSWORD;
 if(!configured||configured.length<8||!timingSafeEqual(Buffer.from(hash(password)),Buffer.from(hash(configured))))throw new ApiError(401,'Username or password is incorrect.');
 return 'platform-admin';
}
