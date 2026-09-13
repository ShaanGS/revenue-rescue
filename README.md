# RevenueRescue

> An evidence-backed revenue-operations agent that turns churn signals into verified recovery work.

RevenueRescue detects a high-value account at risk by joining signals from customer relationship management, billing, support, and product analytics systems. It chooses an appropriate recovery route, enforces outbound-action policy, requests approval when required, executes cross-app recovery actions, and verifies the resulting records.

## Demo flow

The seeded Acme Analytics scenario shows an $18,000 ARR account with a renewal in 12 days, a failed payment, two unresolved support tickets, and a 62% usage decline.

1. The agent assembles evidence from HubSpot, Stripe, Intercom, and PostHog.
2. It prioritizes a support recovery route because unresolved support issues best explain the adoption decline.
3. It requires approval before external outreach to an enterprise account.
4. Following approval, it creates/updates work across Linear, Slack, Gmail, Google Calendar, and HubSpot.
5. It displays a receipt only after every write is verified.
6. The “protected-account test” demonstrates that a do-not-contact label prevents all external actions.

## Reliability principles

- **Evidence-first:** action proposals retain the source facts that supported them.
- **Policy-gated:** protected accounts are blocked; enterprise outreach requires approval.
- **Idempotent:** each planned write carries an operation key, preventing duplicates on retry.
- **Verified:** a completed action means the destination record was re-read successfully, not merely that an API request returned.
- **Fail closed:** unavailable connector evidence prevents the agent from claiming completion.

## Run locally

```bash
npm install
npm run dev
```

Run the small deterministic policy suite:

```bash
npm test
```

## Production connector contract

The demo currently runs against seeded connector data so it is reproducible. A production connector implements:

```ts
type Connector = {
  read(context: AccountContext): Promise<Evidence[]>;
  execute(action: PlannedAction, idempotencyKey: string): Promise<Receipt>;
  verify(receipt: Receipt): Promise<boolean>;
};
```

Required integrations: HubSpot, Stripe, Intercom, PostHog, Linear, Slack, Gmail, and Google Calendar. No API credentials are stored in this repository.

## Two-minute video beat sheet

0:00–0:12 — State the $18k renewal risk.

0:12–0:32 — Show four source systems and the evidence assembled.

0:32–0:50 — Explain why support recovery is selected and why approval is required.

0:50–1:25 — Approve, execute, and show five verified cross-app writes.

1:25–1:43 — Show the resulting receipt.

1:43–1:55 — Switch to the protected account and show that the agent refuses to act.

1:55–2:00 — Close: “RevenueRescue turns churn signals into verified recovery work before revenue disappears.”
