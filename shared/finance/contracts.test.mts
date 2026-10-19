import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { mergeConfirmedCache, stageLegacyRecord } from './contracts.ts';
test('cache refuses cross-entity, conflicting and unconfirmed writes', () => {
 const current = { entity_id: 'entity-a', revision: 2, checksum: 'a', confirmed: true, data: [] };
 assert.throws(() => mergeConfirmedCache(current, {...current, entity_id:'entity-b'}));
 assert.throws(() => mergeConfirmedCache(current, {...current, checksum:'b'}));
 assert.throws(() => mergeConfirmedCache(current, {...current, confirmed:false}));
 assert.equal(mergeConfirmedCache(current, {...current, revision:1}), current);
});
test('legacy staging retains provenance without claiming posted money', () => {
 const source = { amount: 250000 };
 const staged = stageLegacyRecord('superapp_transactions','legacy-1',source);
 assert.equal(staged.payload,source); assert.equal(staged.state,'needs_review'); assert.equal(staged.journal_id,null);
});
