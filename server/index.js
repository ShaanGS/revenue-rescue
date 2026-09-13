import "dotenv/config";
import express from "express";
import { integrationStatus } from "./connectors.js";
import { createLiveConnectors } from "./live-connectors.js";
import { reasonAboutRecovery } from "./recovery-agent.js";
import { executeRecovery, planRecovery } from "../src/agent.js";

const app = express();
app.use(express.json());

const demoAccount = {
  id: "acme-analytics",
  name: "Acme Analytics",
  arr: 18000,
  renewalDays: 12,
  usageChange: -62,
  failedPayment: true,
  unresolvedTickets: 2,
  doNotContact: false,
  openLegalEscalation: false,
};

app.get("/api/health", (_request, response) => response.json({ ok: true }));
app.get("/api/integrations", (_request, response) =>
  response.json(integrationStatus()),
);
app.post("/api/recovery/plan", (request, response) =>
  response.json(planRecovery({ ...demoAccount, ...request.body })),
);
app.post("/api/agent/reason", async (request, response) => {
  const account = { ...demoAccount, ...request.body.account };
  const evidence = request.body.evidence ?? [
    "HubSpot: renewal in 12 days; ARR is $18,000",
    "Stripe: latest invoice failed",
    "Intercom: two unresolved login tickets",
    "PostHog: weekly active seats decreased 62%",
  ];
  try {
    response.json(await reasonAboutRecovery(account, evidence));
  } catch (error) {
    response
      .status(process.env.OPENAI_API_KEY ? 502 : 503)
      .json({ error: error.message });
  }
});
app.post("/api/recovery/execute", async (request, response) => {
  if (process.env.ENABLE_LIVE_WRITES !== "true")
    return response
      .status(403)
      .json({
        error:
          "Live writes are disabled. Set ENABLE_LIVE_WRITES=true only for a test workspace.",
      });
  const plan = planRecovery(
    { ...demoAccount, ...request.body.account },
    request.body.runId,
  );
  try {
    response.json(
      await executeRecovery(plan, createLiveConnectors(plan.account), {
        approved: request.body.approved === true,
      }),
    );
  } catch (error) {
    response
      .status(502)
      .json({
        error:
          "Connector execution failed; workflow stopped before claiming completion.",
        detail: error.message,
      });
  }
});
app.use(express.static("dist"));
app.get("/{*splat}", (_request, response) =>
  response.sendFile("index.html", { root: "dist" }),
);

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`RevenueRescue server listening at http://localhost:${port}`),
);
