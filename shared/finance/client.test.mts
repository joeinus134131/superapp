import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createFinanceClient, FinanceAPIError } from './client.ts';
const entity='00000000-0000-4000-8000-000000000001';
test('canonical client uses user auth, preserves decimal strings and rejects session switch', async () => {
 let user='one';let calls=0;
 const client=createFinanceClient({baseURL:'https://finance.invalid/api/v1',userId:'one',session:async()=>({userId:user,token:'user-access-token'}),fetcher:async (url,options)=>{
  calls++;assert.equal(String(url),`https://finance.invalid/api/v1/finance/entities/${entity}/balances`);assert.equal((options?.headers as Record<string,string>).Authorization,'Bearer user-access-token');
  return new Response(JSON.stringify({balances:[{debit_less_credit:'999999999999999999.01'}]}),{status:200});
 }});
 assert.equal((await client.balances(entity)).balances[0].debit_less_credit,'999999999999999999.01');
 user='two';await assert.rejects(client.balances(entity));assert.equal(calls,1);
});
test('client forwards revision/idempotency, propagates errors without optimistic success', async()=>{
 const client=createFinanceClient({baseURL:'https://finance.invalid/api/v1',userId:'one',session:async()=>({userId:'one',token:'user-token'}),fetcher:async (_url,options)=>{
  assert.equal((options?.headers as Record<string,string>)['Idempotency-Key'],'retry-key');assert.equal(JSON.parse(String(options?.body)).expected_revision,3);
  return new Response(JSON.stringify({error:{code:'idempotency_conflict'}}),{status:409});
 }});
 await assert.rejects(client.review(entity,entity,{expected_revision:3,action:'reject'},'retry-key'),(error:unknown)=>error instanceof FinanceAPIError && error.status===409);
 assert.throws(() => client.sources('../other-entity'));
});
test('account switch while receiving a response suppresses previous user data',async()=>{
 let user='one';const client=createFinanceClient({baseURL:'https://finance.invalid/api/v1',userId:'one',session:async()=>({userId:user,token:'token'}),fetcher:async()=>{user='two';return new Response(JSON.stringify({entities:[]}));}});
 await assert.rejects(client.entities());
});
