import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createOperationStore } from '../server/operation-store.js';

test('persists a verified receipt across store instances', () => {
  const directory = mkdtempSync(join(tmpdir(), 'revenuerescue-test-'));
  const path = join(directory, 'operations.json');
  try {
    const store = createOperationStore(path);
    const receipt = { connector: 'github', id: '42', idempotencyKey: 'run:acme:issue' };
    store.begin(receipt.idempotencyKey, { type: 'create_issue' });
    store.record(receipt.idempotencyKey, receipt);
    store.verify(receipt.idempotencyKey);

    const recoveredStore = createOperationStore(path);
    assert.equal(recoveredStore.get(receipt.idempotencyKey).status, 'verified');
    assert.deepEqual(recoveredStore.get(receipt.idempotencyKey).receipt, receipt);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
