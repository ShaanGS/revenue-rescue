import './style.css';
import { chooseRecoveryRoute, evaluatePolicy } from './policy.js';
import { executeRecovery, planRecovery } from './agent.js';
import { createDemoConnectors } from './connectors/memory.js';

const acme = {
  id: 'acme-analytics',
  name: 'Acme Analytics',
  arr: 18000,
  renewalDays: 12,
  usageChange: -62,
  failedPayment: true,
  unresolvedTickets: 2,
  doNotContact: false,
  openLegalEscalation: false
};

const protectedAccount = { ...acme, name: 'Northstar Health', arr: 42000, doNotContact: true, openLegalEscalation: false };
let activeAccount = acme;
let approved = false;
let executed = false;
let executing = false;
let executionError = '';
let integrations = null;

const evidence = [
  ['HubSpot', 'Renewal in 12 days · $18,000 ARR · owner: Maya Chen'],
  ['Stripe', 'Invoice #IN-4821 failed yesterday · $1,500 outstanding'],
  ['Intercom', '2 unresolved tickets · login failure reported 3 days ago'],
  ['PostHog', 'Weekly active seats down 62% · 14 → 5']
];

function formatMoney(value) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value); }

function liveConnectorCount() {
  return integrations ? Object.values(integrations).filter(Boolean).length : 0;
}

async function refreshIntegrations() {
  try {
    const response = await fetch('/api/integrations');
    integrations = response.ok ? await response.json() : {};
  } catch {
    integrations = {};
  }
  render();
}

async function runRecovery() {
  executing = true;
  executionError = '';
  render();
  const runId = crypto.randomUUID();
  const useLiveConnectors = liveConnectorCount() === 5;
  try {
    let result;
    if (useLiveConnectors) {
      const response = await fetch('/api/recovery/execute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: activeAccount, runId, approved: true })
      });
      result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Live connector execution failed.');
    } else {
      result = await executeRecovery(planRecovery(activeAccount, runId), createDemoConnectors(), { approved: true });
    }
    if (result.status !== 'verified') throw new Error(`Recovery run finished with status: ${result.status}`);
    executed = true;
  } catch (error) {
    executionError = error.message;
  } finally {
    executing = false;
    render();
  }
}

function render() {
  const policy = evaluatePolicy(activeAccount);
  const route = chooseRecoveryRoute(activeAccount);
  const app = document.querySelector('#app');
  const actions = route === 'support'
    ? ['Create a P1 GitHub issue for the login failure', 'Alert the CSM and Support Lead in Slack', 'Draft a truthful support update for approval', 'Create a recovery-call calendar hold', 'Update account recovery plan in HubSpot']
    : ['Open billing recovery GitHub issue', 'Alert account owner in Slack', 'Draft payment-recovery email', 'Create follow-up calendar hold', 'Update account recovery plan in HubSpot'];

  app.innerHTML = `
    <main>
      <nav><div class="brand"><span class="mark">R</span> RevenueRescue</div><div class="status"><span></span>${liveConnectorCount() ? `${liveConnectorCount()}/5 live connectors configured` : 'Sandbox connectors online'}</div></nav>
      <section class="hero">
        <div><p class="eyebrow">REVENUE OPERATIONS AGENT</p><h1>Save revenue <em>before</em><br>it disappears.</h1><p class="subhead">Turns scattered churn signals into coordinated, verified recovery work.</p></div>
        <button class="secondary" id="toggle">${activeAccount.doNotContact ? 'Show Acme demo' : 'Show protected-account test'}</button>
      </section>
      <section class="metrics">
        <article><small>REVENUE AT RISK</small><strong>${formatMoney(activeAccount.arr)}</strong><span>annual contract value</span></article>
        <article><small>RENEWAL WINDOW</small><strong>${activeAccount.renewalDays} days</strong><span>before renewal</span></article>
        <article><small>RISK SIGNALS</small><strong>${activeAccount.doNotContact ? 'Protected' : '4'}</strong><span>${activeAccount.doNotContact ? 'outreach blocked' : 'across four systems'}</span></article>
      </section>
      <section class="grid">
        <article class="card account"><div class="card-title"><span>01 — ACCOUNT IN CONTEXT</span><b>${activeAccount.doNotContact ? 'POLICY TEST' : 'HIGH RISK'}</b></div><h2>${activeAccount.name}</h2><p>${activeAccount.doNotContact ? 'This account may not receive autonomous outreach.' : 'A high-value customer with converging billing, support, and adoption risk.'}</p>
          <div class="signals">
            <div><i class="red"></i><span>Product usage</span><strong>${activeAccount.usageChange}%</strong></div>
            <div><i class="amber"></i><span>Payment</span><strong>Failed</strong></div>
            <div><i class="red"></i><span>Open tickets</span><strong>${activeAccount.unresolvedTickets}</strong></div>
          </div>
        </article>
        <article class="card evidence"><div class="card-title"><span>02 — EVIDENCE, NOT GUESSWORK</span><b class="muted">4 SOURCES</b></div>
          ${evidence.map(([source, detail]) => `<div class="evidence-row"><span class="source">${source}</span><p>${detail}</p><span class="check">✓</span></div>`).join('')}
        </article>
      </section>
      <section class="workflow card">
        <div class="card-title"><span>03 — RECOVERY PLAN</span><b class="muted">ROUTE: ${route.toUpperCase()}</b></div>
        ${policy.blocked ? `<div class="blocked"><span>×</span><div><h3>Recovery workflow stopped safely</h3><p>${policy.reasons.join(' ')} No messages, calendar events, or tasks were created.</p></div></div>` : `
          <div class="plan"><div class="reason"><span class="spark">✦</span><p><b>Why this route:</b> The open support issue explains the usage decline, so the agent prioritizes a real fix before customer outreach.</p></div><div class="approval"><span>${approved ? '✓' : '!'}</span><p>${approved ? 'Human approval recorded. The recovery plan can execute.' : 'Enterprise account: external outreach requires one human approval.'}</p></div></div>
          <ol>${actions.map((action, index) => `<li class="${executed ? 'done' : ''}"><span>${executed ? '✓' : index + 1}</span>${action}<small>${executed ? 'Verified' : 'Queued'}</small></li>`).join('')}</ol>
          <div class="actions">${!approved ? '<button id="approve">Approve recovery plan</button>' : !executed ? `<button id="execute" ${executing ? 'disabled' : ''}>${executing ? 'Executing recovery workflow…' : 'Execute & verify 5 actions'}</button>` : '<button disabled>Recovery workflow verified ✓</button>'}<span>${approved ? (liveConnectorCount() === 5 ? 'Live test connectors enabled.' : 'Sandbox mode: no external action has been taken.') : 'No external action has been taken.'}</span></div>
          ${executionError ? `<p class="error">Execution stopped safely: ${executionError}</p>` : ''}`}
      </section>
      ${executed ? `<section class="receipt"><div><p class="eyebrow">VERIFIED RECEIPT</p><h2>Five actions completed.<br><em>Five receipts attached.</em></h2></div><div class="receipt-list"><p>GitHub <b>issue created</b></p><p>Slack <b>#acme-recovery notified</b></p><p>Gmail <b>draft approved & sent</b></p><p>Calendar <b>recovery hold created</b></p><p>HubSpot <b>recovery plan updated</b></p></div></section>` : ''}
      <footer>RevenueRescue · Evidence-backed, approval-gated, idempotent recovery operations</footer>
    </main>`;

  document.querySelector('#toggle').onclick = () => { activeAccount = activeAccount.doNotContact ? acme : protectedAccount; approved = false; executed = false; executionError = ''; render(); };
  document.querySelector('#approve')?.addEventListener('click', () => { approved = true; render(); });
  document.querySelector('#execute')?.addEventListener('click', runRecovery);
}
render();
refreshIntegrations();
