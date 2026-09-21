'use client';

import {useState,type FormEvent} from 'react';
import {LogIn,KeyRound} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from './ui/dialog';
import {workspaceRoutes} from '@/lib/routes';

export function AdminClientActions({client}:{client:{id:string;business:string;email:string}}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function action(kind:string,data:Record<string,string>={}){
  const response=await fetch(`/api/admin/clients/${encodeURIComponent(client.id)}/${kind}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error||'Please try again.');
 }
 async function login(){setBusy(true);setError('');setNotice('');try{await action('login');window.location.assign(workspaceRoutes.Overview);}catch(e){setError((e as Error).message);setBusy(false);}}
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const form=e.currentTarget,values=new FormData(form);setError('');
  if(values.get('password')!==values.get('confirmPassword')){setError('The passwords do not match.');return;}
  setBusy(true);try{await action('password',{password:String(values.get('password'))});form.reset();setOpen(false);setNotice('Password updated. The client can sign in with the new password.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <><div className="admin-client-actions"><button className="btn primary" disabled={busy} onClick={()=>void login()} aria-label={`Login to ${client.business}`}><LogIn size={16}/>Login</button><button className="btn outline" disabled={busy} onClick={()=>{setError('');setNotice('');setOpen(true);}}><KeyRound size={16}/>Set Password</button></div>{notice&&<p role="status" className="admin-client-notice">{notice}</p>}{error&&!open&&<p role="alert" className="error-box">{error}</p>}<Dialog open={open} onOpenChange={value=>{if(!busy){setOpen(value);setError('');}}}><DialogContent><DialogHeader><DialogTitle>Set password for {client.business}</DialogTitle><DialogDescription>{client.email}. This replaces their current password and signs them out of existing sessions.</DialogDescription></DialogHeader><form className="form-panel" onSubmit={save}><label>New password<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={200} required disabled={busy}/></label><label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={200} required disabled={busy}/></label><p>Use at least 8 characters. Share the new password with the client securely.</p>{error&&<p role="alert" className="error-box">{error}</p>}<div className="admin-client-actions"><button className="btn outline" type="button" disabled={busy} onClick={()=>setOpen(false)}>Cancel</button><button className="btn primary" disabled={busy}>{busy?'Saving…':'Set Password'}</button></div></form></DialogContent></Dialog></>;
}
