import { Incident, TimelineEvent } from '../../shared/types'

function formatDuration(startIso: string, endIso?: string): string {
  const start = new Date(startIso).getTime()
  const end = endIso ? new Date(endIso).getTime() : Date.now()
  const diffMs = end - start
  const totalMinutes = Math.floor(diffMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
}

export function generatePostmortem(incident: Incident, timeline: TimelineEvent[]): string {
  const duration = formatDuration(incident.createdAt, incident.resolvedAt)
  const jiraRef = incident.jiraTicketUrl
    ? `[${incident.jiraTicketId}](${incident.jiraTicketUrl})`
    : 'N/A'

  const timelineSection = timeline
    .map(e => `- \`${formatTimestamp(e.createdAt)}\` **[${e.type.replace('_', ' ')}]** ${e.content}`)
    .join('\n')

  return `# Post-Mortem: ${incident.title}

**Incident ID:** ${incident.id}
**Severity:** ${incident.severity}
**Status:** ${incident.status}
**Created:** ${formatTimestamp(incident.createdAt)}
**Resolved:** ${incident.resolvedAt ? formatTimestamp(incident.resolvedAt) : 'Ongoing'}
**Duration:** ${duration}
**Assignee:** ${incident.assignee ?? 'Unassigned'}
**Jira Ticket:** ${jiraRef}

---

## Summary

> TODO: 1-2 sentence summary of what happened and its impact.

## Impact

- **Affected systems:** TODO
- **User impact:** TODO
- **Duration of impact:** ${duration}
- **Severity:** ${incident.severity}

## Timeline

${timelineSection || '- No timeline events recorded.'}

## Root Cause

> TODO: Describe the technical root cause.

## Contributing Factors

- TODO

## Resolution

> TODO: Describe how the incident was resolved.

## Action Items

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| TODO   |       |          | Open   |

## Lessons Learned

> TODO: What did we learn? What went well? What could improve?
`
}
