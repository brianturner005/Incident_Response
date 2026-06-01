import db from '../db/index'
import { Incident, Severity } from '../../shared/types'

const PRIORITY_MAP: Record<Severity, string> = {
  P1: 'Highest',
  P2: 'High',
  P3: 'Medium',
  P4: 'Low',
}

function getConfig(key: string): string {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? ''
}

function getHeaders(): Record<string, string> {
  const email = getConfig('jira_email')
  const token = getConfig('jira_api_token')
  const creds = Buffer.from(`${email}:${token}`).toString('base64')
  return {
    'Authorization': `Basic ${creds}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
}

export async function createIssue(incident: Incident): Promise<{ key: string; url: string } | null> {
  const baseUrl = getConfig('jira_base_url')
  const projectKey = getConfig('jira_project_key')
  const email = getConfig('jira_email')
  const token = getConfig('jira_api_token')

  if (!baseUrl || !projectKey || !email || !token) {
    console.warn('[Jira] Missing configuration, skipping ticket creation')
    return null
  }

  const body = {
    fields: {
      project: { key: projectKey },
      summary: `[${incident.severity}] ${incident.title}`,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: incident.description || 'No description provided.' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: `Incident ID: ${incident.id}` }],
          },
        ],
      },
      issuetype: { name: 'Bug' },
      priority: { name: PRIORITY_MAP[incident.severity] },
    },
  }

  const url = `${baseUrl.replace(/\/$/, '')}/rest/api/3/issue`
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Jira API error ${res.status}: ${text}`)
  }

  const data = await res.json() as { key: string }
  return {
    key: data.key,
    url: `${baseUrl.replace(/\/$/, '')}/browse/${data.key}`,
  }
}

export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  const baseUrl = getConfig('jira_base_url')
  const email = getConfig('jira_email')
  const token = getConfig('jira_api_token')

  if (!baseUrl || !email || !token) {
    return { success: false, error: 'Missing Jira configuration (base URL, email, or API token)' }
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/rest/api/3/myself`, {
      headers: getHeaders(),
    })
    if (!res.ok) {
      return { success: false, error: `Jira returned ${res.status}` }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
