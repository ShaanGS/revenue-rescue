import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Durable local action ledger. A pending record means a process stopped after
 * intent was recorded but before a verified receipt was saved. Retrying that
 * action is intentionally blocked: it may already have changed an external app.
 */
export function createOperationStore(path = resolve('.revenuerescue', 'operations.json')) {
  const read = () => existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  const write = (entries) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(entries, null, 2));
  };

  return {
    get(key) { return read()[key]; },
    begin(key, action) {
      const entries = read();
      if (entries[key]) return entries[key];
      entries[key] = { status: 'pending', action, startedAt: new Date().toISOString() };
      write(entries);
      return entries[key];
    },
    record(key, receipt) {
      const entries = read();
      entries[key] = { ...entries[key], status: 'executed', receipt, executedAt: new Date().toISOString() };
      write(entries);
    },
    verify(key) {
      const entries = read();
      entries[key] = { ...entries[key], status: 'verified', verifiedAt: new Date().toISOString() };
      write(entries);
    },
    fail(key, error) {
      const entries = read();
      entries[key] = { ...entries[key], status: 'failed', error: error.message, failedAt: new Date().toISOString() };
      write(entries);
    }
  };
}
