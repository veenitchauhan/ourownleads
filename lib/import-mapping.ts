import {importFields,suggestMapping} from './crm.ts';
export type ImportColumn={id:string;label:string;target:string;column:number};
export const fieldLabels:Record<string,string>={name:'Full name',phone:'WhatsApp number',email:'Email',company:'Company',stage:'Stage',notes:'Notes',consent:'WhatsApp consent',consentNote:'Consent note'};
export function initialColumns(headers:string[]):ImportColumn[]{const guessed=suggestMapping(headers);return ['name','phone'].map(target=>({id:target,label:fieldLabels[target],target,column:guessed[target]}));}
export function compileColumns(columns:ImportColumn[],width:number){
 const mapping:Record<string,number>={};const custom:{label:string;column:number}[]=[];const errors:string[]=[];const labels=new Set<string>();const targets=new Set<string>();
 if(!Array.isArray(columns)||columns.length>40)throw new Error('Use up to 40 fields.');
 for(const field of columns){if(!field||typeof field.label!=='string'||typeof field.target!=='string'){errors.push('Choose a valid field.');continue;}const label=field.label.trim();if(!label||label.length>80){errors.push('Give every field a name of 1–80 characters.');continue;}if(labels.has(label.toLowerCase()))errors.push(`Use a unique field name: ${label}.`);labels.add(label.toLowerCase());if(!Number.isInteger(field.column)||field.column<0||field.column>=width){errors.push(`Choose a source column for ${label}.`);continue;}if(field.target==='custom'){if(['__proto__','constructor','prototype',...importFields].includes(label.toLowerCase()))errors.push(`Use a different custom field name: ${label}.`);custom.push({label,column:field.column});}else if(importFields.includes(field.target as typeof importFields[number])){if(targets.has(field.target))errors.push(`Map ${fieldLabels[field.target]} only once.`);targets.add(field.target);mapping[field.target]=field.column;}else errors.push('Choose a valid field type.');}
 if(mapping.name===undefined||mapping.phone===undefined)errors.push('Full name and WhatsApp number are required.');
 return {mapping,custom,errors:[...new Set(errors)]};
}
