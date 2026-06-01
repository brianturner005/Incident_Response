import { v4 as uuidv4 } from 'uuid'
import db from '../db/index'
import { eventBus } from './eventBus'
import {
  Incident,
  TimelineEvent,
  TimelineEventType,
  Severity,
  SLAStatus,
  SLA_TARGETS,
  MetricsSummary,
  CreateIncidentPayload,
  UpdateIncidentPayload,
} from '../../shared/types'

function rowToIncident(row: Record<string, unknown>): Incident {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    severity: row.severity as Severity,
    status: row.status as Incident['status'],
    assignee: (row.assignee as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    resolvedAt: (row.resolved_at as string) ?? undefined,
    jiraTicketId: (row.jira_ticket_id as string) ?? undefined,
    jiraTicketUrl: (row.jira_ticket_url as string) ?? undefined,
    slackMessageTs: (row.slack_message_ts as string) ?? undefined,
    tags: row.tags as string,
  }
}

function rowToTimelineEvent(row: Record<string, unknown>): TimelineEvent {
  return {
    id: row.id as string,
    incidentId: row.incident_id as string,
    type: row.type as TimelineEventType,
    content: row.content as string,
    actor: (row.actor as string) ?? undefined,
    createdAt: row.created_at as string,
  }
}

export function createIncident(data: CreateIncidentPayload): Incident {
  const id = uuidv4()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO incidents (id, title, description, severity, status, assignee, created_at, updated_at, tags)
    VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?)
  `).run(id, data.title, data.description ?? '', data.severity, data.assignee ?? null, now, now, data.tags ?? '')

  addTimelineEvent(id, { type: 'created', content: `Incident created with severity ${data.severity}` })

  const incident = getIncident(id)!
  eventBus.publish({ type: 'incident_created', payload: incident })
  return incident
}

export function listIncidents(filters: {
  status?: string
  severity?: string
  search?: string
} = {}): Incident[] {
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters.status) {
    conditions.push('status = ?')
    params.push(filters.status)
  }
  if (filters.severity) {
    conditions.push('severity = ?')
    params.push(filters.severity)
  }
  if (filters.search) {
    conditions.push('(title LIKE ? OR description LIKE ?)')
    params.push(`%${filters.search}%`, `%${filters.search}%`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const rows = db.prepare(`SELECT * FROM incidents ${where} ORDER BY created_at DESC`).all(...params) as Record<string, unknown>[]
  return rows.map(rowToIncident)
}

export function getIncident(id: string): Incident | undefined {
  const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? rowToIncident(row) : undefined
}

export function updateIncident(id: string, patch: UpdateIncidentPayload): Incident | undefined {
  const existing = getIncident(id)
  if (!existing) return undefined

  const now = new Date().toISOString()
  const fields: string[] = ['updated_at = ?']
  const params: unknown[] = [now]

  const fieldMap: Record<string, string> = {
    title: 'title',
    description: 'description',
    severity: 'severity',
    status: 'status',
    assignee: 'assignee',
    tags: 'tags',
    jiraTicketId: 'jira_ticket_id',
    jiraTicketUrl: 'jira_ticket_url',
    slackMessageTs: 'slack_message_ts',
  }

  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in patch && (patch as Record<string, unknown>)[key] !== undefined) {
      fields.push(`${col} = ?`)
      params.push((patch as Record<string, unknown>)[key])
    }
  }

  params.push(id)
  db.prepare(`UPDATE incidents SET ${fields.join(', ')} WHERE id = ?`).run(...params)

  if (patch.status && patch.status !== existing.status) {
    addTimelineEvent(id, {
      type: 'status_change',
      content: `Status changed from ${existing.status} to ${patch.status}`,
    })
  }
  if (patch.severity && patch.severity !== existing.severity) {
    addTimelineEvent(id, {
      type: 'severity_change',
      content: `Severity changed from ${existing.severity} to ${patch.severity}`,
    })
  }

  const updated = getIncident(id)!
  eventBus.publish({ type: 'incident_updated', payload: updated })
  return updated
}

export function resolveIncident(id: string, actor?: string): Incident | undefined {
  const existing = getIncident(id)
  if (!existing) return undefined

  const now = new Date().toISOString()
  db.prepare(`UPDATE incidents SET status = 'resolved', resolved_at = ?, updated_at = ? WHERE id = ?`).run(now, now, id)

  addTimelineEvent(id, {
    type: 'status_change',
    content: 'Incident resolved',
    actor,
  })

  const resolved = getIncident(id)!
  eventBus.publish({ type: 'incident_resolved', payload: resolved })
  return resolved
}

export function addNote(incidentId: string, content: string, actor?: string): TimelineEvent {
  return addTimelineEvent(incidentId, { type: 'note', content, actor })
}

export function addTimelineEvent(
  incidentId: string,
  event: { type: TimelineEventType; content: string; actor?: string }
): TimelineEvent {
  const id = uuidv4()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO timeline_events (id, incident_id, type, content, actor, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, incidentId, event.type, event.content, event.actor ?? null, now)

  return {
    id,
    incidentId,
    type: event.type,
    content: event.content,
    actor: event.actor,
    createdAt: now,
  }
}

export function getTimeline(incidentId: string): TimelineEvent[] {
  const rows = db.prepare(
    'SELECT * FROM timeline_events WHERE incident_id = ? ORDER BY created_at ASC'
  ).all(incidentId) as Record<string, unknown>[]
  return rows.map(rowToTimelineEvent)
}

export function computeSLAStatus(incident: Incident): SLAStatus {
  const sla = SLA_TARGETS[incident.severity]
  const createdMs = new Date(incident.createdAt).getTime()
  const responseDeadline = new Date(createdMs + sla.responseMinutes * 60_000)
  const resolutionDeadline = new Date(createdMs + sla.resolutionMinutes * 60_000)
  const now = Date.now()
  const isResolved = incident.status === 'resolved'
  const compareTime = isResolved && incident.resolvedAt ? new Date(incident.resolvedAt).getTime() : now

  return {
    responseBreached: compareTime > responseDeadline.getTime(),
    resolutionBreached: compareTime > resolutionDeadline.getTime(),
    responseDeadline,
    resolutionDeadline,
    isResolved,
  }
}

export function getMetrics(): MetricsSummary {
  const openRows = db.prepare(
    `SELECT severity, COUNT(*) as count FROM incidents WHERE status != 'resolved' GROUP BY severity`
  ).all() as { severity: Severity; count: number }[]

  const openBySeverity: Record<Severity, number> = { P1: 0, P2: 0, P3: 0, P4: 0 }
  let totalOpen = 0
  for (const row of openRows) {
    openBySeverity[row.severity] = row.count
    totalOpen += row.count
  }

  const totalResolvedRow = db.prepare(
    `SELECT COUNT(*) as count FROM incidents WHERE status = 'resolved'`
  ).get() as { count: number }

  const avgRow = db.prepare(
    `SELECT AVG((julianday(resolved_at) - julianday(created_at)) * 1440) as avg_minutes
     FROM incidents WHERE status = 'resolved' AND resolved_at IS NOT NULL`
  ).get() as { avg_minutes: number | null }

  const openIncidents = db.prepare(
    `SELECT * FROM incidents WHERE status != 'resolved'`
  ).all() as Record<string, unknown>[]

  let slaBreachedCount = 0
  for (const row of openIncidents) {
    const incident = rowToIncident(row)
    const sla = computeSLAStatus(incident)
    if (sla.resolutionBreached) slaBreachedCount++
  }

  return {
    openBySeverity,
    slaBreachedCount,
    avgResolutionMinutes: avgRow.avg_minutes ?? 0,
    totalOpen,
    totalResolved: totalResolvedRow.count,
  }
}
