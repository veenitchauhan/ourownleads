import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
let db:DatabaseSync;
export function database(){
 if(db)return db;const file=resolve(process.env.CRM_DB_PATH||'data/our-own-leads.sqlite');mkdirSync(dirname(file),{recursive:true,mode:0o700});db=new DatabaseSync(file);db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 db.exec(`CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password TEXT NOT NULL,business TEXT NOT NULL,brandColor TEXT NOT NULL DEFAULT '#087b66',logo TEXT NOT NULL DEFAULT '',supportEmail TEXT NOT NULL DEFAULT '',hours TEXT NOT NULL DEFAULT '',assistantName TEXT NOT NULL DEFAULT 'Your assistant',assistantTone TEXT NOT NULL DEFAULT 'Friendly and helpful',welcome TEXT NOT NULL DEFAULT 'Hello! How can we help you today?',assistantActive INTEGER NOT NULL DEFAULT 0,createdAt TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS admin_client_events(id TEXT PRIMARY KEY,clientId TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,createdAt TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS admin_sessions(token TEXT PRIMARY KEY,expires INTEGER NOT NULL,credentialHash TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS platform_settings(id TEXT PRIMARY KEY,value TEXT NOT NULL,updatedAt TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS whatsapp_signup(attempt TEXT PRIMARY KEY,userId TEXT NOT NULL REFERENCES users(id),sessionHash TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,userId TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS leads(id TEXT PRIMARY KEY,userId TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,phone TEXT NOT NULL,email TEXT NOT NULL DEFAULT '',company TEXT NOT NULL DEFAULT '',stage TEXT NOT NULL DEFAULT 'New',source TEXT NOT NULL DEFAULT 'Manual',notes TEXT NOT NULL DEFAULT '',consent INTEGER NOT NULL DEFAULT 0,consentNote TEXT NOT NULL DEFAULT '',createdAt TEXT NOT NULL,lastInboundAt TEXT,UNIQUE(userId,phone));
 CREATE TABLE IF NOT EXISTS knowledge(id TEXT PRIMARY KEY,userId TEXT NOT NULL REFERENCES users(id),title TEXT NOT NULL,body TEXT NOT NULL,updatedAt TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS connections(userId TEXT PRIMARY KEY REFERENCES users(id),phoneId TEXT NOT NULL UNIQUE,wabaId TEXT NOT NULL,displayPhone TEXT NOT NULL,token TEXT NOT NULL,updatedAt TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,userId TEXT NOT NULL REFERENCES users(id),leadId TEXT NOT NULL REFERENCES leads(id),direction TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL,template TEXT,error TEXT,metaId TEXT UNIQUE,requestKey TEXT,createdAt TEXT NOT NULL,UNIQUE(userId,requestKey));
 CREATE INDEX IF NOT EXISTS idx_leads_user_date ON leads(userId,createdAt);
 CREATE INDEX IF NOT EXISTS idx_messages_user_lead ON messages(userId,leadId,createdAt);
 CREATE INDEX IF NOT EXISTS idx_knowledge_user ON knowledge(userId);
 CREATE TABLE IF NOT EXISTS auth_attempts(email TEXT PRIMARY KEY,attempts INTEGER NOT NULL,resetAt INTEGER NOT NULL);`);
 if(!(db.prepare('PRAGMA table_info(leads)').all() as {name:string}[]).some(c=>c.name==='customFields'))db.exec("ALTER TABLE leads ADD COLUMN customFields TEXT NOT NULL DEFAULT '{}'");
 if(!(db.prepare('PRAGMA table_info(connections)').all() as {name:string}[]).some(c=>c.name==='status'))db.exec("ALTER TABLE connections ADD COLUMN status TEXT NOT NULL DEFAULT 'manual'; ALTER TABLE connections ADD COLUMN registrationPin TEXT");
 return db;
}
export function all<T=Record<string,unknown>>(sql:string,...args:(string|number|null)[]):T[]{return database().prepare(sql).all(...args) as T[];}
export function one<T=Record<string,unknown>>(sql:string,...args:(string|number|null)[]):T|undefined{return database().prepare(sql).get(...args) as T|undefined;}
export function run(sql:string,...args:(string|number|null)[]){return database().prepare(sql).run(...args);}
export function transaction<T>(fn:()=>T):T{database().exec('BEGIN IMMEDIATE');try{const result=fn();database().exec('COMMIT');return result;}catch(e){database().exec('ROLLBACK');throw e;}}
export const id=()=>randomUUID();
export const now=()=>new Date().toISOString();
