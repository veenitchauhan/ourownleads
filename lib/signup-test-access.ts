// Development testing is explicit, per workspace, and expires automatically.
export function hasSignupTestAccess(userId:string,environment:Record<string,string|undefined>,time=Date.now()){
 const expires=Date.parse(environment.META_TEST_UNTIL||'');
 return environment.LOCAL_DEVELOPMENT==='true'&&Number.isFinite(expires)&&expires>time&&!!userId&&(environment.META_TEST_USER_IDS||'').split(',').map(id=>id.trim()).filter(Boolean).includes(userId);
}
