import test from "node:test";
import assert from "node:assert/strict";
import { validateRecoveryProposal } from "../server/recovery-agent.js";

const enterprise = {
  arr: 18000,
  doNotContact: false,
  openLegalEscalation: false,
};
const validProposal = {
  recommended_route: "support",
  action_bundle: [
    {
      tool: "github",
      action: "create issue",
      reason: "login issue",
      requires_approval: true,
    },
  ],
};

test("rejects model actions using unknown tools", () => {
  assert.throws(() =>
    validateRecoveryProposal(enterprise, {
      ...validProposal,
      action_bundle: [
        { ...validProposal.action_bundle[0], tool: "stripe_refund" },
      ],
    }),
  );
});

test("rejects unapproved enterprise actions", () => {
  assert.throws(() =>
    validateRecoveryProposal(enterprise, {
      ...validProposal,
      action_bundle: [
        { ...validProposal.action_bundle[0], requires_approval: false },
      ],
    }),
  );
});

test("rejects actions proposed for protected accounts", () => {
  assert.throws(() =>
    validateRecoveryProposal(
      { ...enterprise, doNotContact: true },
      validProposal,
    ),
  );
});

test("accepts a blocked proposal for a protected account", () => {
  const blocked = { recommended_route: "block", action_bundle: [] };
  assert.deepEqual(
    validateRecoveryProposal({ ...enterprise, doNotContact: true }, blocked),
    blocked,
  );
});
