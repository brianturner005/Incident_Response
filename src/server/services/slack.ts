import db from '../db/index'
import { Incident, Severity } from '../../shared/types'

const SEVERITY_EMOJI: Record<Severity, string> = {
  P1: '🔴',
  P2: '🟠',
  P3: '🟡',
  P4: '🔵',
}

function getConfig(key: string): string {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? ''
}

function buildBlocks(incident: Incident, action: string) {
  const emoji = SEVERITY_EMOJI[incident.severity]
  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} [${incident.severity}] ${action}: ${incident.title}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Status:*\n${incident.status}` },
          { type: 'mrkdwn', text: `*Severity:*\n${incident.severity}` },
          { type: 'mrkdwn', text: `*ID:*\n${incident.id.slice(0, 8)}` },
          ...(incident.assignee ? [{ type: 'mrkdwn', text: `*Assignee:*\n${incident.assignee}` }] : []),
        ],
      },
      ...(incident.description
        ? [{
            type: 'section',
            text: { type: 'mrkdwn', text: incident.description.slice(0, 300) },
          }]
        : []),
      ...(incident.jiraTicketUrl
        ? [{
            type: 'section',
            text: { type: 'mrkdwn', text: `*Jira:* <${incident.jiraTicketUrl}|${incident.jiraTicketId}>` },
          }]
        : []),
    ],
  }
}

async function send(payload: object): Promise<void> {
  const webhookUrl = getConfig('slack_webhook_url')
  if (!webhookUrl) {
    console.warn('[Slack] No webhook URL configured, skipping notification')
    return
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const body = await res.text()
  if (body !== 'ok') {
    throw new Error(`Slack webhook returned: ${body}`)
  }
}

export async function notifyIncidentCreated(incident: Incident): Promise<void> {
  await send(buildBlocks(incident, 'New Incident'))
}

export async function notifyIncidentResolved(incident: Incident): Promise<void> {
  await send(buildBlocks(incident, '✅ Resolved'))
}

export async function notifyEscalation(incident: Incident, message: string): Promise<void> {
  const payload = {
    ...buildBlocks(incident, '⚠️ Escalated'),
    blocks: [
      ...buildBlocks(incident, '⚠️ Escalated').blocks,
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Escalation note:* ${message}` },
      },
    ],
  }
  await send(payload)
}

export async function sendTestMessage(): Promise<void> {
  await send({
    text: '✅ Test message from Incident Response tool — Slack integration is working!',
  })
}
