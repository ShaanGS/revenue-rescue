const configured = (key) => Boolean(process.env[key]);

async function api(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${url} failed: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

export function integrationStatus() {
  return {
    github: configured('GITHUB_TOKEN') && configured('GITHUB_REPOSITORY'),
    slack: configured('SLACK_BOT_TOKEN') && configured('SLACK_RECOVERY_CHANNEL'),
    gmail: configured('GOOGLE_ACCESS_TOKEN'),
    calendar: configured('GOOGLE_ACCESS_TOKEN') && configured('GOOGLE_CALENDAR_ID'),
    hubspot: configured('HUBSPOT_ACCESS_TOKEN') && configured('HUBSPOT_COMPANY_ID')
  };
}

export async function createGitHubIssue({ title, body, idempotencyKey }) {
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
  const data = await api(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'X-GitHub-Api-Version': '2026-03-10', 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body: `${body}\n\n<!-- RevenueRescue operation: ${idempotencyKey} -->` })
  });
  return { connector: 'github', id: String(data.number), url: data.html_url, idempotencyKey };
}

export async function verifyGitHubIssue(receipt) {
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
  const data = await api(`https://api.github.com/repos/${owner}/${repo}/issues/${receipt.id}`, { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } });
  return data.html_url === receipt.url;
}

export async function postSlackEscalation({ text, idempotencyKey }) {
  const data = await api('https://slack.com/api/chat.postMessage', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ channel: process.env.SLACK_RECOVERY_CHANNEL, text, client_msg_id: idempotencyKey.slice(0, 36) })
  });
  if (!data.ok) throw new Error(`Slack rejected message: ${data.error}`);
  return { connector: 'slack', channel: data.channel, ts: data.ts, idempotencyKey };
}

export async function verifySlackEscalation(receipt) {
  const data = await api(`https://slack.com/api/conversations.replies?channel=${encodeURIComponent(receipt.channel)}&ts=${encodeURIComponent(receipt.ts)}`, { headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` } });
  return data.ok && data.messages?.some((message) => message.ts === receipt.ts);
}

export async function sendGmailUpdate({ to, subject, text, idempotencyKey }) {
  const raw = Buffer.from([`To: ${to}`, `Subject: ${subject}`, `Message-ID: <${idempotencyKey}@revenuerescue.local>`, 'Content-Type: text/plain; charset="UTF-8"', '', text].join('\r\n')).toString('base64url');
  const data = await api('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw }) });
  return { connector: 'gmail', id: data.id, threadId: data.threadId, idempotencyKey };
}

export async function verifyGmailUpdate(receipt) {
  const data = await api(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${receipt.id}?format=minimal`, { headers: { Authorization: `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}` } });
  return data.id === receipt.id;
}

export async function createCalendarHold({ summary, start, end, attendeeEmail, idempotencyKey }) {
  const eventId = `rr${idempotencyKey.replaceAll(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 48)}`;
  const data = await api(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(process.env.GOOGLE_CALENDAR_ID)}/events`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: eventId, summary, start: { dateTime: start }, end: { dateTime: end }, attendees: [{ email: attendeeEmail }] }) });
  return { connector: 'calendar', id: data.id, url: data.htmlLink, idempotencyKey };
}

export async function verifyCalendarHold(receipt) {
  const data = await api(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(process.env.GOOGLE_CALENDAR_ID)}/events/${receipt.id}`, { headers: { Authorization: `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}` } });
  return data.id === receipt.id;
}

export async function updateHubSpotRecoveryPlan({ note, idempotencyKey }) {
  const data = await api(`https://api.hubapi.com/crm/v3/objects/companies/${process.env.HUBSPOT_COMPANY_ID}`, { method: 'PATCH', headers: { Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ properties: { revenuerescue_last_plan: `${note} [${idempotencyKey}]` } }) });
  return { connector: 'hubspot', id: data.id, idempotencyKey };
}

export async function verifyHubSpotRecoveryPlan(receipt) {
  const data = await api(`https://api.hubapi.com/crm/v3/objects/companies/${receipt.id}?properties=revenuerescue_last_plan`, { headers: { Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}` } });
  return data.id === receipt.id && data.properties.revenuerescue_last_plan.includes(receipt.idempotencyKey);
}
