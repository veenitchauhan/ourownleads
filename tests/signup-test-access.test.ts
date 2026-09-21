import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hasSignupTestAccess} from '../lib/signup-test-access.ts';
const time=Date.parse('2026-09-20T15:00:00Z');
const config={LOCAL_DEVELOPMENT:'true',META_TEST_USER_IDS:'test-owner',META_TEST_UNTIL:'2026-09-20T17:00:00Z'};
test('test signup access is restricted to the named workspace',()=>{assert.equal(hasSignupTestAccess('test-owner',config,time),true);assert.equal(hasSignupTestAccess('another-client',config,time),false);assert.equal(hasSignupTestAccess('',config,time),false);});
test('test signup access expires and fails closed outside local development',()=>{assert.equal(hasSignupTestAccess('test-owner',config,Date.parse(config.META_TEST_UNTIL)),false);assert.equal(hasSignupTestAccess('test-owner',{...config,LOCAL_DEVELOPMENT:'false'},time),false);assert.equal(hasSignupTestAccess('test-owner',{...config,META_TEST_UNTIL:''},time),false);});
