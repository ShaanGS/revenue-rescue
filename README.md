# RevenueRescue

> An evidence-backed AI revenue-operations agent that turns scattered churn signals into verified recovery work.

**[Watch the 2-minute demo](REPLACE_WITH_DEMO_VIDEO_URL)** · **[Open the live demo](REPLACE_WITH_LIVE_DEMO_URL)**

> Before submission: replace the two links above with the uploaded video and deployed app URLs. The product can also be run locally using the instructions below.

## The problem

Revenue teams lose customers not because they have no data, but because the warning signs live in separate tools. A Customer Success Manager has to manually connect CRM context, a failed payment, unresolved support issues, and falling product usage; decide who should act; create work; contact the customer; and verify that nothing fell through.

That work is slow, repetitive, and easy to miss when a renewal is days away.

## What RevenueRescue does

RevenueRescue investigates an at-risk account, explains its decision from source evidence, creates a recovery plan, asks for approval when appropriate, performs the cross-app work, and verifies every write.

### Demo scenario

**Acme Analytics** has **$18,000 ARR** renewing in **12 days**. The agent finds:

- a failed $1,500 Stripe invoice;
- two unresolved Intercom support tickets about a login problem;
- a 62% drop in weekly active seats in PostHog; and
- the account owner and renewal context in HubSpot.

It correctly chooses a **support recovery** route: resolve the problem causing the usage drop before sending sales outreach. After one approval, it creates and verifies the recovery work across connected apps.

## Connected apps

The prototype models the exact read/write interactions below through sandbox connector adapters, using seeded data so the demo and tests are deterministic. Production OAuth/API credentials are intentionally not committed to the repository.

| App | What RevenueRescue reads or writes | Role in the recovery workflow |
| --- | --- | --- |
| HubSpot | Account value, renewal date, owner; recovery-plan update | Customer and renewal context |
| Stripe | Failed invoice and outstanding balance | Billing risk signal |
| Intercom | Unresolved tickets and customer issue context | Support risk signal |
| PostHog | Product usage trend | Adoption risk signal |
| GitHub | Creates a P1 issue | Assigns the fix to engineering/support |
| Slack | Posts an evidence-backed escalation | Coordinates the internal owners |
| Gmail | Sends approved, truthful customer communication | Customer recovery outreach |
| Google Calendar | Creates a recovery-call hold | Ensures follow-up happens |

## How to use it

### Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

### Run the Acme recovery workflow

1. Review Acme’s account summary and evidence from the four source systems.
2. Review the recovery route chosen by the agent and the reason it chose it.
3. Click **Approve recovery plan**. This models the required human approval for high-value outbound communication.
4. Click **Execute & verify 5 actions**.
5. Review the verified receipt: a GitHub issue, Slack alert, Gmail message, Calendar hold, and HubSpot update are each marked complete only after verification.
6. Click **Show protected-account test** to load an account with a do-not-contact flag. RevenueRescue must stop without creating any external action.

The interface reports whether it is in **Sandbox connectors online** mode or how many of the five live connectors are configured. It automatically uses live execution only when every required test connector is configured; otherwise the reproducible sandbox path is used.

## How the agent works

```text
HubSpot + Stripe + Intercom + PostHog
                 ↓
       Evidence-backed risk assessment
                 ↓
       Policy and approval checks
                 ↓
 GitHub + Slack + Gmail + Calendar + HubSpot
                 ↓
        Re-read and verify every action
```

The route is deliberately not a fixed Zap. For example:

- An unresolved support issue takes priority when it plausibly explains the usage drop.
- A failed payment with otherwise healthy usage uses the billing-recovery route.
- A do-not-contact or legal-escalation flag blocks autonomous work.
- Enterprise outreach requires approval before an external message is sent.

## Reliability and evaluation

For an agent that communicates externally, a successful API call is not enough. RevenueRescue is designed around measurable safety properties.

| Reliability property | Implementation | How it is evaluated |
| --- | --- | --- |
| Evidence-backed decisions | Every recovery route is tied to account, billing, ticket, and usage evidence. | Acme must select the support route because open tickets explain the 62% usage decline. |
| Policy compliance | Do-not-contact and legal-escalation accounts are blocked. | Protected-account scenario must create zero messages, meetings, or tasks. |
| Human control | High-value/enterprise outreach pauses for approval. | Acme cannot execute the plan until the approval button is used. |
| Correct prioritization | A deterministic route policy selects support, billing, or adoption recovery. | Policy test verifies support wins when unresolved tickets exist. |
| Idempotency | Production writes use one operation key per account/action/run. | A retry cannot create duplicate tasks, messages, or meetings. |
| Verified completion | Each connector action is re-read after execution. | A receipt is shown only after every destination record verifies. |
| Fail closed | Missing evidence or failed verification prevents a false “completed” claim. | Production connector contract requires a successful `verify` response. |

Run the automated reliability tests:

```bash
npm test
```

Current test coverage validates:

1. protected accounts are blocked;
2. enterprise outreach requires approval; and
3. unresolved support issues select the support-recovery route;
4. no enterprise work is performed before approval;
5. five recovery writes execute and verify after approval;
6. the run fails closed when a connector cannot verify its write; and
7. retrying the same plan does not create duplicate connector writes.
8. a verified external-action receipt persists across server restarts in the local audit ledger.

Build the production bundle:

```bash
npm run build
```

## Technical design

The UI uses Vite and vanilla JavaScript to keep the demo fast and reproducible. The agent core is an executable orchestration layer with deterministic in-memory connectors for the demo and tests. Connector boundaries are designed around three operations:

```ts
type Connector = {
  read(context: AccountContext): Promise<Evidence[]>;
  execute(action: PlannedAction, idempotencyKey: string): Promise<Receipt>;
  verify(receipt: Receipt): Promise<boolean>;
};
```

This makes the reliability behavior portable across each external app: collect evidence, execute a guarded action with an idempotency key, then re-read the external system to verify completion.

### Live connector mode

The repository also contains a Node/Express connector service for real API execution. It includes adapters for GitHub Issues, Slack, Gmail, Google Calendar, and HubSpot. Live writes are disabled by default.

1. Copy `.env.example` to `.env` and supply **test-workspace** credentials only.
2. Use a GitHub token with `Issues: write`, a Slack bot token, Google OAuth access token with Gmail send and Calendar event scopes, and a HubSpot private-app token with company read/write scopes.
3. Create the custom HubSpot company property `revenuerescue_last_plan` before enabling the HubSpot update.
4. Build and start the server:

   ```bash
   npm run build
   npm start
   ```

5. Confirm configuration at `GET /api/integrations`. It reports only whether each connector is configured, never credentials.
6. Set `ENABLE_LIVE_WRITES=true` only after every credential is pointed at a test workspace. The `POST /api/recovery/execute` route otherwise rejects execution with HTTP 403.

The live endpoint refuses to claim success when any connector fails or post-write verification fails.

Every live action is first recorded in `.revenuerescue/operations.json` (which is ignored by Git). If a process stops while an external write is uncertain, RevenueRescue blocks a retry and requires verification instead of risking a duplicate email, issue, message, or meeting.

## Demo video script

The submission video should show this exact sequence in under two minutes:

1. **0:00–0:12** — Introduce the $18k renewal risk and the fragmented signals.
2. **0:12–0:32** — Show evidence being joined from four source apps.
3. **0:32–0:50** — Explain the selected route and approval gate.
4. **0:50–1:25** — Approve and execute the five cross-app actions.
5. **1:25–1:43** — Show the verified receipt across GitHub, Slack, Gmail, Calendar, and HubSpot.
6. **1:43–1:55** — Run the protected-account test: the agent refuses to act.
7. **1:55–2:00** — Close: “RevenueRescue turns churn signals into verified recovery work before revenue disappears.”

## Privacy and credentials

No API keys, customer data, or OAuth credentials are committed to this repository. The included scenario is synthetic. In production, RevenueRescue should request the minimum OAuth scopes required per connector and preserve action receipts for auditability.
