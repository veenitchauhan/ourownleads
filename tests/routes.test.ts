import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workspaceRoutes,viewForPath,safeReturnPath,publicRoutes} from '../lib/routes.ts';
test('Every workspace section has a distinct reversible URL',()=>{
 assert.equal(new Set(Object.values(workspaceRoutes)).size,Object.keys(workspaceRoutes).length);
 for(const [view,path] of Object.entries(workspaceRoutes))assert.equal(viewForPath(path),view);
 assert.ok(publicRoutes.includes('/login'));assert.ok(publicRoutes.includes('/signup'));
});
test('Login return paths are restricted to known local workspace pages',()=>{
 assert.equal(safeReturnPath('/leads'),'/leads');
 for(const path of [null,'https://example.com','//example.com','/api/auth/logout','/login'])assert.equal(safeReturnPath(path),'/dashboard');
});
