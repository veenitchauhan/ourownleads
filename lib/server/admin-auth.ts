import {createHash,randomBytes} from 'node:crypto';
import {ApiError,loginPlatformAdmin} from './auth';
import {one,run} from './store';
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
function token(req:Request){return req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('ool_admin_session='))?.split('=')[1]||'';}
export function adminCookie(value:string){return `ool_admin_session=${value}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${value?28800:0}${(process.env.APP_URL||'https:').startsWith('https:')?'; Secure':''}`;}
export function requireAdmin(req:Request){const configured=process.env.ADMIN_PASSWORD;if(!configured||!one('SELECT token FROM admin_sessions WHERE token=? AND expires>? AND credentialHash=?',hash(token(req)),Date.now(),hash(configured)))throw new ApiError(401,'Sign in to the administration console.');}
export function createAdminSession(password:string){loginPlatformAdmin(password);const value=randomBytes(32).toString('hex');run('DELETE FROM admin_sessions WHERE expires<?',Date.now());run('INSERT INTO admin_sessions(token,expires,credentialHash) VALUES(?,?,?)',hash(value),Date.now()+8*3600000,hash(process.env.ADMIN_PASSWORD!));return value;}
export function logoutAdmin(req:Request){run('DELETE FROM admin_sessions WHERE token=?',hash(token(req)));}
