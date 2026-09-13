import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseRecoveryRoute, evaluatePolicy } from '../src/policy.js';

test('blocks outreach to protected accounts', () => {
  const result = evaluatePolicy({ arr: 18000, doNotContact: true, openLegalEscalation: false });
  assert.equal(result.blocked, true);
});

test('requires approval for enterprise outreach', () => {
  const result = evaluatePolicy({ arr: 18000, doNotContact: false, openLegalEscalation: false });
  assert.equal(result.needsApproval, true);
});

test('prioritizes support when unresolved issues caused a usage decline', () => {
  assert.equal(chooseRecoveryRoute({ failedPayment: true, usageChange: -62, unresolvedTickets: 2 }), 'support');
});
