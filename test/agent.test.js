import test from "node:test";
import assert from "node:assert/strict";
import { createDemoConnectors } from "../src/connectors/memory.js";
import { executeRecovery, planRecovery } from "../src/agent.js";

const acme = {
  id: "acme",
  arr: 18000,
  renewalDays: 12,
  usageChange: -62,
  failedPayment: true,
  unresolvedTickets: 2,
  doNotContact: false,
  openLegalEscalation: false,
};

test("does not execute enterprise work before approval", async () => {
  const result = await executeRecovery(
    planRecovery(acme, "run-1"),
    createDemoConnectors(),
  );
  assert.equal(result.status, "awaiting_approval");
  assert.equal(result.receipts.length, 0);
});

test("executes and verifies five recovery writes after approval", async () => {
  const result = await executeRecovery(
    planRecovery(acme, "run-2"),
    createDemoConnectors(),
    { approved: true },
  );
  assert.equal(result.status, "verified");
  assert.equal(result.receipts.length, 5);
  assert.ok(result.receipts.every((receipt) => receipt.verified));
});

test("fails closed if a connector cannot verify its write", async () => {
  const connectors = createDemoConnectors({
    slack: { failVerificationFor: "post_escalation" },
  });
  const result = await executeRecovery(
    planRecovery(acme, "run-3"),
    connectors,
    { approved: true },
  );
  assert.equal(result.status, "verification_failed");
  assert.equal(result.failedAction.connector, "slack");
});

test("idempotency key prevents duplicate writes on retry", async () => {
  const connectors = createDemoConnectors();
  const plan = planRecovery(acme, "same-run");
  await executeRecovery(plan, connectors, { approved: true });
  await executeRecovery(plan, connectors, { approved: true });
  assert.equal(connectors.github.writes.size, 1);
  assert.equal(connectors.slack.writes.size, 1);
});
