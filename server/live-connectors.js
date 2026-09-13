import {
  createCalendarHold, createGitHubIssue, postSlackEscalation, sendGmailUpdate, updateHubSpotRecoveryPlan,
  verifyCalendarHold, verifyGitHubIssue, verifyGmailUpdate, verifyHubSpotRecoveryPlan, verifySlackEscalation
} from './connectors.js';

const customerEmail = () => process.env.DEMO_CUSTOMER_EMAIL;
const recoveryStart = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const recoveryEnd = () => new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();

export function createLiveConnectors(account) {
  return {
    github: {
      execute: (action, idempotencyKey) => createGitHubIssue({ title: `[RevenueRescue] ${account.name}: ${action.label}`, body: `Account: ${account.name}\nARR at risk: $${account.arr}\nRoute: support recovery`, idempotencyKey }),
      verify: verifyGitHubIssue
    },
    slack: {
      execute: (_action, idempotencyKey) => postSlackEscalation({ text: `🚨 RevenueRescue: ${account.name} has $${account.arr} ARR at risk. Renewal in ${account.renewalDays} days; usage ${account.usageChange}%; ${account.unresolvedTickets} unresolved tickets. Recovery plan approved.`, idempotencyKey }),
      verify: verifySlackEscalation
    },
    gmail: {
      execute: (_action, idempotencyKey) => sendGmailUpdate({ to: customerEmail(), subject: `We're working on your ${account.name} login issue`, text: `Hi,\n\nWe saw your recent login issue and our team is actively investigating it. We will share a verified update shortly.\n\nBest,\nCustomer Success`, idempotencyKey }),
      verify: verifyGmailUpdate
    },
    calendar: {
      execute: (_action, idempotencyKey) => createCalendarHold({ summary: `Recovery call — ${account.name}`, start: recoveryStart(), end: recoveryEnd(), attendeeEmail: customerEmail(), idempotencyKey }),
      verify: verifyCalendarHold
    },
    hubspot: {
      execute: (_action, idempotencyKey) => updateHubSpotRecoveryPlan({ note: `Support recovery approved for ${account.name}: login issue, falling usage, failed invoice.`, idempotencyKey }),
      verify: verifyHubSpotRecoveryPlan
    }
  };
}
