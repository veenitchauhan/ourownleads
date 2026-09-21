import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV,rowsToLeads,suggestMapping,normalizePhone,canFreeform,sheetExportURL} from '../lib/crm.ts';
test('CSV preserves quoted commas, escaped quotes and multiline notes',()=>{assert.deepEqual(parseCSV('\uFEFFName,Notes\r\n"A, B","Said ""hello""\nAgain"'),[['Name','Notes'],['A, B','Said "hello"\nAgain']]);assert.throws(()=>parseCSV('name\n"unfinished'));});
test('Imports normalize and deduplicate phones and require consent evidence',()=>{const mapping=suggestMapping(['Name','Phone','Consent','Consent note']);const r=rowsToLeads([['A','+1 (202) 555-0123','yes','Web enquiry'],['B','12025550123','',''],['C','+12025550124','yes','']],mapping,'CSV');assert.equal(r.valid.length,1);assert.equal(r.duplicates,1);assert.equal(r.errors.length,1);assert.equal(r.valid[0].phone,'+12025550123');assert.equal(r.valid[0].consent,1);});
test('Phone validation rejects unusable input',()=>{assert.equal(normalizePhone('0091 9876543210'),'+919876543210');assert.throws(()=>normalizePhone('call me'));assert.throws(()=>normalizePhone('123'));});
test('Free text is restricted to actual inbound messages in the last 24 hours',()=>{const t=Date.now();assert.equal(canFreeform({lastInboundAt:null},t),false);assert.equal(canFreeform({lastInboundAt:new Date(t-1000).toISOString()},t),true);assert.equal(canFreeform({lastInboundAt:new Date(t-86400000).toISOString()},t),false);assert.equal(canFreeform({lastInboundAt:new Date(t+1000).toISOString()},t),false);});
test('Sheets URL conversion cannot fetch arbitrary hosts',()=>{assert.equal(sheetExportURL('https://docs.google.com/spreadsheets/d/abc/edit#gid=17'),'https://docs.google.com/spreadsheets/d/abc/export?format=csv&gid=17');assert.throws(()=>sheetExportURL('https://docs.google.com.evil.example/spreadsheets/d/a'));assert.throws(()=>sheetExportURL('http://127.0.0.1/'));});
test('Phone formatting from lead exports and sheets is normalized without losing digits',()=>{
 for(const value of ['p:+919876543210','tel: +91 (98765) 43210',"'+919876543210",'="+919876543210"','919876543210.0','9.19876543210E+11','https://wa.me/919876543210','＋９１９８７６５４３２１０'])assert.equal(normalizePhone(value),'+919876543210');
 for(const value of ['9.19877E+11','+919876543210 / +919876543211','N/A','phone: abc','12345678 ext 9'])assert.throws(()=>normalizePhone(value));
});
test('Standard export headers map automatically and invalid rows do not swallow valid duplicates',()=>{
 const mapping=suggestMapping(['full_name','phone_number','lead_status']);assert.equal(mapping.name,0);assert.equal(mapping.phone,1);assert.equal(mapping.stage,2);
 const parsed=rowsToLeads([['A','p:+12025550123','bad'],['A','+12025550123','new']],mapping,'CSV');assert.equal(parsed.valid.length,1);assert.equal(parsed.errors.length,1);assert.equal(parsed.valid[0].stage,'New');
});
