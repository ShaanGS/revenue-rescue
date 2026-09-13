export function evaluatePolicy(account) {
  const reasons = [];
  if (account.doNotContact) reasons.push('Account is marked do not contact.');
  if (account.openLegalEscalation) reasons.push('Open legal escalation requires human ownership.');
  if (account.arr >= 10000) reasons.push('Enterprise outreach requires approval before sending.');

  return {
    blocked: account.doNotContact || account.openLegalEscalation,
    needsApproval: !account.doNotContact && !account.openLegalEscalation && account.arr >= 10000,
    reasons
  };
}

export function chooseRecoveryRoute(account) {
  if (account.failedPayment && account.usageChange > -25) return 'billing';
  if (account.unresolvedTickets > 0) return 'support';
  return 'adoption';
}
