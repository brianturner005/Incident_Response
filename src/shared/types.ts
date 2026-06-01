export type Severity = 'P1' | 'P2' | 'P3' | 'P4'

export type IncidentStatus =
  | 'open'
  | 'investigating'
  | 'identified'
  | 'monitoring'
  | 'resolved'

export type TimelineEventType =
  | 'created'
  | 'status_change'
  | 'severity_change'
  | 'note'
  | 'jira_linked'
  | 'slack_notified'
  | 'escalated'

export interface Incident {
  id: string
  title: string
  description: string
  severity: Severity
  status: IncidentStatus
  assignee?: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  jiraTicketId?: string
  jiraTicketUrl?: string
  slackMessageTs?: string
  tags: string
}

export interface TimelineEvent {
  id: string
  incidentId: string
  type: TimelineEventType
  content: string
  actor?: string
  createdAt: string
}

export interface SLAPolicy {
  responseMinutes: number
  resolutionMinutes: number
}

export const SLA_TARGETS: Record<Severity, SLAPolicy> = {
  P1: { responseMinutes: 15, resolutionMinutes: 60 },
  P2: { responseMinutes: 30, resolutionMinutes: 240 },
  P3: { responseMinutes: 120, resolutionMinutes: 1440 },
  P4: { responseMinutes: 480, resolutionMinutes: 4320 },
}

export interface SLAStatus {
  responseBreached: boolean
  resolutionBreached: boolean
  responseDeadline: Date
  resolutionDeadline: Date
  isResolved: boolean
}

export interface MetricsSummary {
  openBySeverity: Record<Severity, number>
  slaBreachedCount: number
  avgResolutionMinutes: number
  totalOpen: number
  totalResolved: number
}

export interface SSEEvent {
  type: 'incident_created' | 'incident_updated' | 'incident_resolved'
  payload: Incident
}

export interface CreateIncidentPayload {
  title: string
  description?: string
  severity: Severity
  assignee?: string
  tags?: string
}

export interface UpdateIncidentPayload {
  title?: string
  description?: string
  severity?: Severity
  status?: IncidentStatus
  assignee?: string
  tags?: string
  jiraTicketId?: string
  jiraTicketUrl?: string
  slackMessageTs?: string
}

export interface InboundAlert {
  title: string
  description?: string
  severity?: Severity
  source?: string
  tags?: string[]
}
