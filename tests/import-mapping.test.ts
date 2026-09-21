import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialColumns,compileColumns} from '../lib/import-mapping.ts';
import {rowsToLeads} from '../lib/crm.ts';
test('User named fields map to selected columns and preserve their values',()=>{
 const columns=[...initialColumns(['full_name','phone_number','campaign_name']),{id:'campaign',target:'custom',label:'Campaign',column:2}];
 const result=compileColumns(columns,3);assert.deepEqual(result.errors,[]);
 const parsed=rowsToLeads([['Test Lead','p:+12025550123','September enquiries']],result.mapping,'Google Sheets',result.custom);
 assert.equal(parsed.valid[0].phone,'+12025550123');assert.deepEqual(parsed.valid[0].customFields,{Campaign:'September enquiries'});
});
test('Missing, duplicate, reserved and invalid mappings cannot silently discard fields',()=>{
 const base=initialColumns(['name','phone','campaign']);
 for(const fields of [[{id:'x',target:'custom',label:'Campaign',column:-1}],[{id:'x',target:'custom',label:'',column:2}],[{id:'x',target:'custom',label:'__proto__',column:2}],[{id:'x',target:'custom',label:'Campaign',column:2},{id:'y',target:'custom',label:'campaign',column:2}]])assert.ok(compileColumns([...base,...fields],3).errors.length);
 assert.ok(compileColumns(base.slice(1),3).errors.length);
});
