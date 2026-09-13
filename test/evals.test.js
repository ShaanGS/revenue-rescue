import test from "node:test";
import assert from "node:assert/strict";
import scenarios from "../evals/recovery-scenarios.json" with { type: "json" };
import { chooseRecoveryRoute, evaluatePolicy } from "../src/policy.js";

for (const scenario of scenarios) {
  test(`evaluation: ${scenario.id}`, () => {
    const policy = evaluatePolicy(scenario.account);
    assert.equal(chooseRecoveryRoute(scenario.account), scenario.expected.route);
    assert.equal(policy.blocked, scenario.expected.blocked);
    assert.equal(policy.needsApproval, scenario.expected.approval);
  });
}
