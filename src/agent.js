import { chooseRecoveryRoute, evaluatePolicy } from './policy.js';

const actionsByRoute = {
  support: [
    { connector: 'linear', type: 'create_issue', label: 'Create a P1 issue for the login failure' },
    { connector: 'slack', type: 'post_escalation', label: 'Alert the CSM and Support Lead in Slack' },
    { connector: 'gmail', type: 'send_customer_update', label: 'Send an approved, truthful support update' },
    { connector: 'calendar', type: 'create_recovery_hold', label: 'Create a recovery-call calendar hold' },
    { connector: 'hubspot', type: 'update_recovery_plan', label: 'Update account recovery plan in HubSpot' }
  ],
  billing: [
    { connector: 'linear', type: 'create_billing_task', label: 'Create a billing recovery task' },
    { connector: 'slack', type: 'post_escalation', label: 'Alert the account owner in Slack' },
    { connector: 'gmail', type: 'send_payment_update', label: 'Send an approved payment recovery update' },
    { connector: 'calendar', type: 'create_recovery_hold', label: 'Create a billing follow-up hold' },
    { connector: 'hubspot', type: 'update_recovery_plan', label: 'Update account recovery plan in HubSpot' }
  ],
  adoption: [
    { connector: 'linear', type: 'create_adoption_task', label: 'Create an adoption recovery task' },
    { connector: 'slack', type: 'post_escalation', label: 'Alert the account owner in Slack' },
    { connector: 'gmail', type: 'send_adoption_update', label: 'Send an approved adoption recovery update' },
    { connector: 'calendar', type: 'create_recovery_hold', label: 'Create a success-call calendar hold' },
    { connector: 'hubspot', type: 'update_recovery_plan', label: 'Update account recovery plan in HubSpot' }
  ]
};

export function planRecovery(account, runId = crypto.randomUUID()) {
  const policy = evaluatePolicy(account);
  const route = chooseRecoveryRoute(account);
  const evidence = [
    { source: 'hubspot', fact: `${account.renewalDays} days to renewal; ${account.arr} ARR` },
    { source: 'stripe', fact: account.failedPayment ? 'Latest invoice failed' : 'No payment failure found' },
    { source: 'intercom', fact: `${account.unresolvedTickets} unresolved tickets` },
    { source: 'posthog', fact: `Usage changed ${account.usageChange}%` }
  ];
  const actions = actionsByRoute[route].map((action) => ({
    ...action,
    accountId: account.id,
    idempotencyKey: `${runId}:${account.id}:${action.type}`
  }));

  return { runId, account, route, evidence, policy, actions };
}

export async function executeRecovery(plan, connectors, { approved = false } = {}) {
  if (plan.policy.blocked) {
    return { status: 'blocked', reason: plan.policy.reasons, receipts: [] };
  }
  if (plan.policy.needsApproval && !approved) {
    return { status: 'awaiting_approval', reason: plan.policy.reasons, receipts: [] };
  }

  const receipts = [];
  for (const action of plan.actions) {
    const connector = connectors[action.connector];
    if (!connector) throw new Error(`Missing connector: ${action.connector}`);
    const receipt = await connector.execute(action, action.idempotencyKey);
    const verified = await connector.verify(receipt);
    if (!verified) {
      return { status: 'verification_failed', failedAction: action, receipts };
    }
    receipts.push({ ...receipt, verified: true });
  }
  return { status: 'verified', receipts };
}
