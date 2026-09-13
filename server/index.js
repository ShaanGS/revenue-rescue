import 'dotenv/config';
import express from 'express';
import { integrationStatus } from './connectors.js';
import { planRecovery } from '../src/agent.js';

const app = express();
app.use(express.json());

const demoAccount = {
  id: 'acme-analytics', name: 'Acme Analytics', arr: 18000, renewalDays: 12,
  usageChange: -62, failedPayment: true, unresolvedTickets: 2,
  doNotContact: false, openLegalEscalation: false
};

app.get('/api/health', (_request, response) => response.json({ ok: true }));
app.get('/api/integrations', (_request, response) => response.json(integrationStatus()));
app.post('/api/recovery/plan', (request, response) => response.json(planRecovery({ ...demoAccount, ...request.body })));
app.use(express.static('dist'));
app.get('/{*splat}', (_request, response) => response.sendFile('index.html', { root: 'dist' }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`RevenueRescue server listening at http://localhost:${port}`));
