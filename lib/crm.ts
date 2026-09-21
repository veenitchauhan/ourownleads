export const stages=['New','Contacted','Qualified','Won','Lost'] as const;
export type Lead={customFields?:Record<string,string>;id:string;name:string;phone:string;email:string;company:string;stage:string;source:string;notes:string;consent:number;consentNote:string;createdAt:string;lastInboundAt:string|null};
export type Profile={isPlatformAdmin?:boolean;id:string;name:string;email:string;business:string;brandColor:string;logo:string;supportEmail:string;hours:string;assistantName:string;assistantTone:string;welcome:string;assistantActive:number};
export type Message={id:string;leadId:string;direction:string;body:string;status:string;createdAt:string;error:string|null;template:string|null};
export type Knowledge={id:string;title:string;body:string;updatedAt:string};
export type Template={name:string;language:string;status:string;body:string;parameters:number};
export function normalizePhone(value:string):string{
 let raw=String(value).normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g,'').trim();
 if(!raw)throw new Error('WhatsApp number is required.');
 raw=raw.replace(/^=\s*"([^"]*)"$/, '$1').replace(/^['"]|['"]$/g,'').trim();
 raw=raw.replace(/^(?:p|tel|phone(?:[_ ]number)?|mobile|whatsapp)\s*:\s*/i,'');
 if(/^https?:\/\//i.test(raw)){try{const url=new URL(raw);if(url.hostname==='wa.me')raw=url.pathname.slice(1);else if(['api.whatsapp.com','web.whatsapp.com'].includes(url.hostname)&&url.pathname==='/send')raw=url.searchParams.get('phone')||'';}catch{throw new Error('The phone link is not valid.');}}
 const scientific=raw.match(/^\+?(\d+)(?:\.(\d+))?[eE]\+?(\d+)$/);
 if(scientific){const digits=scientific[1]+(scientific[2]||''),length=scientific[1].length+Number(scientific[3]);if(length!==digits.length)throw new Error('This phone number uses rounded scientific notation; its original digits are needed.');raw=digits;}
 raw=raw.replace(/\.0+$/,'');
 if(!/^\+?[\d\s().-]+$/.test(raw))throw new Error('Could not read one complete phone number. Labels such as p: and tel: are supported.');
 let digits=raw.replace(/[^0-9]/g,'');if(digits.startsWith('00'))digits=digits.slice(2);
 if(!/^[1-9]\d{7,14}$/.test(digits))throw new Error('Use 8–15 digits including the country code.');
 return '+'+digits;
}

export function parseCSV(text:string):string[][]{
 if(text.length>2_000_000)throw new Error('Please use a file smaller than 2 MB.');
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 const input=text.replace(/^\uFEFF/,'');
 for(let i=0;i<input.length;i++){
  const c=input[i];if(c==='"'){if(quoted&&input[i+1]==='"'){cell+='"';i++;}else if(quoted){quoted=false;}else if(cell===''){quoted=true;}else{cell+=c;}}
  else if(c===','&&!quoted){row.push(cell.trim());cell='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&input[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell='';}
  else cell+=c;
 }
 if(quoted)throw new Error('A quoted field is incomplete. Please check the CSV file.');
 row.push(cell.trim());if(row.some(Boolean))rows.push(row);
 if(rows.length>1001)throw new Error('Import up to 1,000 leads at a time.');return rows;
}
export function parsePastedSheet(text:string):string[][]{
 if(text.includes('\t')){const rows=text.trim().split(/\r?\n/).map(r=>r.split('\t').map(c=>c.trim()));if(rows.length>1001)throw new Error('Import up to 1,000 leads at a time.');return rows;}return parseCSV(text);
}
export const importFields=['name','phone','email','company','stage','notes','consent','consentNote'] as const;
export function suggestMapping(headers:string[]):Record<string,number>{
 const synonyms:Record<string,string[]>= {name:['name','full name','lead name','customer','customer name'],phone:['phone','phone number','mobile number','mobile','whatsapp','whatsapp number','contact number'],email:['email','email address'],company:['company','business','company name'],stage:['stage','status','lead status'],notes:['notes','note'],consent:['consent','opt in','opt-in','whatsapp consent'],consentNote:['consent note','consent source','permission source']};
 return Object.fromEntries(importFields.map(f=>[f,headers.findIndex(h=>synonyms[f].includes(h.toLowerCase().trim().replace(/[_-]+/g,' ').replace(/\s+/g,' ')))]));
}
export function rowsToLeads(rows:string[][],mapping:Record<string,number>,source:string,custom:{label:string;column:number}[]=[]){
 const valid:Partial<Lead>[]=[];const errors:{row:number;message:string}[]=[];const seen=new Set<string>();let duplicates=0;
 rows.forEach((r,index)=>{try{const get=(f:string)=>String(r[mapping[f]]??'').trim();for(const [field,max] of Object.entries({name:200,phone:200,email:200,company:200,notes:5000,consentNote:500})){if(get(field).length>max)throw new Error(`${field} exceeds ${max} characters.`);}for(const field of custom){if(String(r[field.column]??'').trim().length>5000)throw new Error(`${field.label} exceeds 5,000 characters.`);}const name=get('name');if(!name)throw new Error('Name is required.');const phone=normalizePhone(get('phone'));if(seen.has(phone)){duplicates++;return;}const rawStage=get('stage');const stage=stages.find(s=>s.toLowerCase()===rawStage.toLowerCase())||(rawStage?'':'New');if(!stages.includes(stage as typeof stages[number]))throw new Error('Stage must be New, Contacted, Qualified, Won, or Lost.');const email=get('email');if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Email is not valid.');const opted=/^(yes|true|1)$/i.test(get('consent'));if(opted&&!get('consentNote'))throw new Error('Add a consent note explaining when or how permission was given.');seen.add(phone);valid.push({customFields:Object.fromEntries(custom.map(f=>[f.label,String(r[f.column]??'').trim()])),name,phone,email,company:get('company'),stage,notes:get('notes'),source,consent:opted?1:0,consentNote:get('consentNote')});}catch(e){errors.push({row:index+2,message:(e as Error).message});}});
 return {valid,errors,duplicates};
}
export function canFreeform(lead:Pick<Lead,'lastInboundAt'>,now=Date.now()){const time=lead.lastInboundAt?Date.parse(lead.lastInboundAt):NaN;return Number.isFinite(time)&&time<=now&&now-time<24*60*60*1000;}
export function sheetExportURL(raw:string){let url:URL;try{url=new URL(raw);}catch{throw new Error('Paste a valid Google Sheets link.');}if(url.protocol!=='https:'||url.hostname!=='docs.google.com'||url.username||url.password)throw new Error('Use a https://docs.google.com/spreadsheets/ link.');const published=url.pathname.match(/^\/spreadsheets\/d\/e\/([a-zA-Z0-9_-]+)\/pubhtml/);if(published)return `https://docs.google.com/spreadsheets/d/e/${published[1]}/pub?output=csv`;const m=url.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);if(!m)throw new Error('This link does not identify a Google Sheet.');const gid=new URLSearchParams(url.hash.slice(1)).get('gid')||url.searchParams.get('gid')||'0';if(!/^\d+$/.test(gid))throw new Error('Invalid sheet tab.');return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;}
