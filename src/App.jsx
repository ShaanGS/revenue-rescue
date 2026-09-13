import { useState } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Database,
  FileCheck2,
  LockKeyhole,
  MessagesSquare,
  Plug,
  ListChecks,
  FlaskConical,
  Play,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { executeRecovery, planRecovery } from "./agent";
import { createDemoConnectors } from "./connectors/memory";

const accounts = [
  {
    id: "acme-analytics",
    name: "Acme Analytics",
    owner: "Maya Chen",
    arr: 18000,
    renewalDays: 12,
    usageChange: -62,
    failedPayment: true,
    unresolvedTickets: 2,
    doNotContact: false,
    openLegalEscalation: false,
    risk: "Critical",
  },
  {
    id: "orbit-payments",
    name: "Orbit Payments",
    owner: "Adrian Cole",
    arr: 42000,
    renewalDays: 24,
    usageChange: -8,
    failedPayment: true,
    unresolvedTickets: 0,
    doNotContact: false,
    openLegalEscalation: false,
    risk: "High",
  },
  {
    id: "northstar-health",
    name: "Northstar Health",
    owner: "Iris Patel",
    arr: 56000,
    renewalDays: 18,
    usageChange: -41,
    failedPayment: false,
    unresolvedTickets: 3,
    doNotContact: true,
    openLegalEscalation: false,
    risk: "Protected",
  },
];
const sources = [
  ["HubSpot", "Renewal in 12 days · $18,000 ARR", Database],
  ["Stripe", "Invoice #IN-4821 failed · $1,500 due", CircleDollarSign],
  ["Intercom", "2 unresolved login tickets", MessagesSquare],
  ["PostHog", "Weekly active seats down 62%", Activity],
];
const money = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
const badge = (r) =>
  r === "Critical"
    ? "border-red-200 bg-red-50 text-red-700"
    : r === "Protected"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-orange-200 bg-orange-50 text-orange-700";

export default function App() {
  const [id, setId] = useState("acme-analytics"),
    [stage, setStage] = useState("idle"),
    [receipts, setReceipts] = useState([]),
    [log, setLog] = useState([]),
    [reasoning, setReasoning] = useState(null),
    [agentError, setAgentError] = useState("");
  const a = accounts.find((x) => x.id === id),
    blocked = a.doNotContact || a.openLegalEscalation;
  const select = (next) => {
    setId(next);
    setStage("idle");
    setReceipts([]);
    setLog([]);
    setReasoning(null);
    setAgentError("");
  };
  const investigate = async () => {
    if (blocked) {
      setStage("blocked");
      setLog([
        "Read account policies",
        "Found do-not-contact flag",
        "Stopped before external tools",
      ]);
      return;
    }
    setStage("reasoning");
    setAgentError("");
    setLog([
      "Gathered evidence from HubSpot, Stripe, Intercom, and PostHog",
      "Calling RecoveryRescue reasoning model",
    ]);
    try {
      const response = await fetch("/api/agent/reason", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: a,
          evidence: sources.map(([n, d]) => `${n}: ${d}`),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setReasoning(result);
      setStage("investigated");
      setLog((x) => [
        ...x,
        `Model selected ${result.recommended_route} recovery · ${result.confidence} confidence`,
      ]);
    } catch (error) {
      setStage("agent_error");
      setAgentError(error.message);
      setLog((x) => [
        ...x,
        "Reasoning run stopped — no fallback plan generated",
      ]);
    }
  };
  const execute = async () => {
    setStage("running");
    setLog((x) => [
      ...x,
      "CSM approval recorded",
      "Executing five connector actions",
    ]);
    const r = await executeRecovery(
      planRecovery(a, "demo-run"),
      createDemoConnectors(),
      { approved: true },
    );
    setReceipts(r.receipts);
    setLog((x) => [
      ...x,
      ...r.receipts.map((y) => `Verified ${y.connector} receipt ${y.id}`),
    ]);
    setStage("verified");
  };
  const status =
    stage === "verified"
      ? "Recovery verified"
      : stage === "blocked"
        ? "Blocked by policy"
        : stage === "running"
          ? "Executing verified plan"
          : stage === "reasoning"
            ? "Reasoning from evidence"
            : stage === "investigated"
              ? "Awaiting human approval"
              : stage === "agent_error"
                ? "Model unavailable"
                : "Ready to investigate";
  const message =
    stage === "blocked"
      ? "I found a do-not-contact policy. I stopped before creating any external work."
      : stage === "verified"
        ? "Recovery work is complete. I re-read every destination and attached five verified receipts."
        : stage === "running"
          ? "I am executing the approved plan and checking each destination for a durable record."
          : stage === "reasoning"
            ? "I am weighing the evidence and drafting an action bundle."
            : stage === "investigated"
              ? reasoning.hypothesis
              : "I will collect evidence, evaluate policy, and propose only safe actions.";
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5">
          <div className="flex items-center gap-3 font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-700 text-white">
              R
            </span>
            RevenueRescue{" "}
            <span className="hidden text-sm font-normal text-stone-500 md:inline">
              / Recovery Command Center
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-stone-500">
              acme / workspace
            </span>
            <span className="grid size-8 place-items-center rounded-full bg-stone-900 text-xs font-semibold text-white">
              MC
            </span>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1600px]">
        <aside className="hidden min-h-[calc(100vh-65px)] w-56 shrink-0 border-r border-stone-200 bg-stone-50 p-4 lg:block">
          <p className="mb-2 px-3 text-xs font-medium text-stone-500">
            OPERATIONS
          </p>
          <nav className="space-y-1 text-sm">
            <a className="flex items-center gap-3 rounded-lg bg-emerald-100 px-3 py-2.5 font-medium text-emerald-950">
              <Play className="size-4" />
              Recovery Runs
            </a>
            <a className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-stone-600">
              <ListChecks className="size-4" />
              Scenarios
            </a>
            <a className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-stone-600">
              <FlaskConical className="size-4" />
              Evaluations
            </a>
          </nav>
          <p className="mb-2 mt-8 px-3 text-xs font-medium text-stone-500">
            CONTROL PLANE
          </p>
          <nav className="space-y-1 text-sm">
            <a className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-stone-600">
              <Plug className="size-4" />
              Integrations{" "}
              <span className="ml-auto rounded bg-stone-200 px-1.5 py-0.5 text-[10px]">
                5
              </span>
            </a>
            <a className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-stone-600">
              <ShieldCheck className="size-4" />
              Policies
            </a>
            <a className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-stone-600">
              <Settings2 className="size-4" />
              Settings
            </a>
          </nav>
          <div className="mt-8 rounded-xl border border-stone-200 bg-white p-3">
            <p className="text-xs font-medium">Safe execution on</p>
            <p className="mt-1 text-xs leading-5 text-stone-500">
              Model proposals are policy-checked, approved, and verified.
            </p>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-5 lg:p-8">
          <div className="mb-6">
            <p className="text-xs font-medium tracking-[.16em] text-emerald-700">
              AI REVENUE OPERATIONS AGENT
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Your recovery queue, handled with evidence.
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Investigate risk, coordinate work, and prove each action landed.
            </p>
          </div>
          <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
            <aside className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>At-risk revenue</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {accounts.map((x) => (
                    <button
                      key={x.id}
                      onClick={() => select(x.id)}
                      className={`w-full rounded-lg border p-3 text-left ${x.id === a.id ? "border-emerald-500 bg-emerald-50" : "border-stone-200 bg-white"}`}
                    >
                      <div className="flex justify-between gap-1">
                        <div>
                          <p className="text-sm font-medium">{x.name}</p>
                          <p className="text-xs text-stone-500">
                            {x.owner} · {x.renewalDays}d to renewal
                          </p>
                        </div>
                        <Badge className={badge(x.risk)}>{x.risk}</Badge>
                      </div>
                      <div className="mt-2 flex justify-between text-xs">
                        <b>{money(x.arr)} ARR</b>
                        <span className="text-red-600">
                          {x.usageChange}% usage
                        </span>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
              <Card className="border-emerald-200 bg-emerald-50">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-emerald-800">
                    THIS WEEK
                  </p>
                  <p className="text-2xl font-semibold">$116,000</p>
                  <p className="text-xs text-emerald-800">
                    under active recovery
                  </p>
                </CardContent>
              </Card>
            </aside>
            <section className="space-y-5">
              <Card>
                <CardHeader className="border-b">
                  <div className="flex justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">{a.name}</CardTitle>
                        <Badge className={badge(a.risk)}>{a.risk} risk</Badge>
                      </div>
                      <p className="mt-1 text-sm text-stone-500">
                        Owner: {a.owner} · Renewal in {a.renewalDays} days
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-stone-500">REVENUE AT RISK</p>
                      <p className="text-2xl font-semibold">{money(a.arr)}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid p-0 lg:grid-cols-[1.35fr_.9fr]">
                  <div className="border-b p-5 lg:border-b-0 lg:border-r">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs tracking-[.16em] text-emerald-700">
                          AGENT RUN
                        </p>
                        <h2 className="text-lg font-semibold">{status}</h2>
                      </div>
                      <Bot className="size-8 text-emerald-700" />
                    </div>
                    <div className="rounded-lg bg-emerald-950 p-4 text-sm text-emerald-50">
                      <p className="mb-2 text-xs text-emerald-300">
                        REVENUE RESCUE
                      </p>
                      {message}
                    </div>
                    <div className="mt-4">
                      {stage === "idle" && (
                        <Button onClick={investigate}>
                          <Bot />
                          Investigate with agent
                        </Button>
                      )}
                      {stage === "reasoning" && (
                        <Button disabled>Reasoning from evidence…</Button>
                      )}
                      {stage === "investigated" && (
                        <Button
                          onClick={() => {
                            setStage("approved");
                            setLog((x) => [...x, "CSM approval recorded"]);
                          }}
                        >
                          <ShieldCheck />
                          Approve exact action bundle
                        </Button>
                      )}
                      {stage === "approved" && (
                        <Button onClick={execute}>
                          <CheckCircle2 />
                          Execute & verify 5 actions
                        </Button>
                      )}
                      {stage === "running" && (
                        <Button disabled>Verifying external actions…</Button>
                      )}
                      {stage === "agent_error" && (
                        <Button variant="outline" onClick={investigate}>
                          Retry reasoning run
                        </Button>
                      )}
                    </div>
                    <p className="mt-3 text-xs text-stone-500">
                      The model proposes; policy and approval decide what can
                      execute.
                    </p>
                  </div>
                  <div className="bg-stone-50 p-5">
                    <p className="text-xs tracking-[.16em] text-stone-500">
                      RUN TRACE
                    </p>
                    <ol className="mt-4 space-y-3">
                      {(log.length
                        ? log
                        : ["Awaiting agent investigation"]
                      ).map((x, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <CheckCircle2
                            className={`mt-0.5 size-4 ${stage === "idle" ? "text-stone-300" : "text-emerald-600"}`}
                          />
                          {x}
                        </li>
                      ))}
                    </ol>
                  </div>
                </CardContent>
              </Card>
              <div className="grid gap-5 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Evidence graph</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sources.map(([n, d, I]) => (
                      <div
                        key={n}
                        className="flex gap-3 border-b py-2 last:border-0"
                      >
                        <span className="grid size-8 place-items-center rounded-md bg-stone-100 text-emerald-700">
                          <I className="size-4" />
                        </span>
                        <div>
                          <p className="text-sm font-medium">{n}</p>
                          <p className="text-xs text-stone-500">{d}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Agent proposal</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {reasoning ? (
                      <>
                        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <b className="text-sm capitalize">
                              {reasoning.recommended_route} recovery
                            </b>
                            <Badge className="border-emerald-200 bg-white text-emerald-800">
                              {reasoning.confidence} confidence
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-emerald-800">
                            {reasoning.approval_rationale}
                          </p>
                        </div>
                        {reasoning.action_bundle.map((action) => (
                          <p
                            key={`${action.tool}-${action.action}`}
                            className="text-sm"
                          >
                            ✓ <b className="capitalize">{action.tool}</b>:{" "}
                            {action.action}
                          </p>
                        ))}
                        <p className="border-t pt-2 text-xs text-stone-500">
                          Rejected:{" "}
                          {reasoning.rejected_alternatives.join(" · ")}
                        </p>
                      </>
                    ) : (
                      <div className="rounded-md border border-dashed border-stone-300 p-4 text-sm text-stone-500">
                        Run the agent to generate an evidence-backed proposal.
                        No scripted fallback is shown.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              {stage === "verified" && (
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardHeader>
                    <CardTitle className="flex gap-2">
                      <FileCheck2 className="text-emerald-700" />
                      Verified external receipts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 md:grid-cols-5">
                    {receipts.map((r) => (
                      <div
                        key={r.connector}
                        className="rounded-md border border-emerald-200 bg-white p-3"
                      >
                        <b className="capitalize">{r.connector}</b>
                        <p className="mt-1 text-xs text-emerald-700">
                          Record {r.id}
                        </p>
                        <p className="mt-2 text-xs text-stone-500">
                          ✓ Re-read verified
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {stage === "blocked" && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="flex gap-3 p-5">
                    <LockKeyhole className="text-amber-700" />
                    <div>
                      <b>No external actions taken</b>
                      <p className="text-sm text-stone-600">
                        Policy prevented the agent from creating recovery work.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {stage === "agent_error" && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-5">
                    <b>Reasoning run unavailable</b>
                    <p className="mt-1 text-sm text-stone-600">
                      {agentError}. RevenueRescue will not replace a missing
                      model result with a scripted plan.
                    </p>
                  </CardContent>
                </Card>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
