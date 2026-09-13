import {
  createCalendarHold, createGitHubIssue, postSlackEscalation, sendGmailUpdate, updateHubSpotRecoveryPlan,
  verifyCalendarHold, verifyGitHubIssue, verifyGmailUpdate, verifyHubSpotRecoveryPlan, verifySlackEscalation
} from './connectors.js';
import { createOperationStore } from './operation-store.js';

const customerEmail = () => process.env.DEMO_CUSTOMER_EMAIL;
const recoveryStart = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const recoveryEnd = () => new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();

export function createLiveConnectors(account) {
  const store = createOperationStore();
  const guarded = (connector, execute, verify) => ({
    async execute(action, idempotencyKey) {
      const existing = store.get(idempotencyKey);
      if (existing?.status === 'verified') return existing.receipt;
      if (existing?.status === 'pending' || existing?.status === 'executed') {
        throw new Error(`${connector} action is in an uncertain state. Verify the external record before retrying.`);
      }
      store.begin(idempotencyKey, action);
      try {
        const receipt = await execute(action, idempotencyKey);
        store.record(idempotencyKey, receipt);
        return receipt;
      } catch (error) {
        store.fail(idempotencyKey, error);
        throw error;
      }
    },
    async verify(receipt) {
      const isVerified = await verify(receipt);
      if (isVerified) store.verify(receipt.idempotencyKey);
      return isVerified;
    }
  });

  return {
    github: guarded('github', (action, idempotencyKey) => createGitHubIssue({ title: `[RevenueRescue] ${account.name}: ${action.label}`, body: `Account: ${account.name}\nARR at risk: $${account.arr}\nRoute: support recovery`, idempotencyKey }), verifyGitHubIssue),
    slack: guarded('slack', (_action, idempotencyKey) => postSlackEscalation({ text: `🚨 RevenueRescue: ${account.name} has $${account.arr} ARR at risk. Renewal in ${account.renewalDays} days; usage ${account.usageChange}%; ${account.unresolvedTickets} unresolved tickets. Recovery plan approved.`, idempotencyKey }), verifySlackEscalation),
    gmail: guarded('gmail', (_action, idempotencyKey) => sendGmailUpdate({ to: customerEmail(), subject: `We're working on your ${account.name} login issue`, text: `Hi,\n\nWe saw your recent login issue and our team is actively investigating it. We will share a verified update shortly.\n\nBest,\nCustomer Success`, idempotencyKey }), verifyGmailUpdate),
    calendar: guarded('calendar', (_action, idempotencyKey) => createCalendarHold({ summary: `Recovery call — ${account.name}`, start: recoveryStart(), end: recoveryEnd(), attendeeEmail: customerEmail(), idempotencyKey }), verifyCalendarHold),
    hubspot: guarded('hubspot', (_action, idempotencyKey) => updateHubSpotRecoveryPlan({ note: `Support recovery approved for ${account.name}: login issue, falling usage, failed invoice.`, idempotencyKey }), verifyHubSpotRecoveryPlan)
  };
}
