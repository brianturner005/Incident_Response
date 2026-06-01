import { Router, Request, Response } from 'express'
import * as incidentService from '../services/incident'
import * as slackService from '../services/slack'
import * as jiraService from '../services/jira'
import { generatePostmortem } from '../services/postmortem'
import { addTimelineEvent } from '../services/incident'
import { Severity, IncidentStatus } from '../../shared/types'

const router = Router()

const VALID_SEVERITIES: Severity[] = ['P1', 'P2', 'P3', 'P4']
const VALID_STATUSES: IncidentStatus[] = ['open', 'investigating', 'identified', 'monitoring', 'resolved']

type IdParams = { id: string }

router.post('/', async (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = req.body as Record<string, any>
  const title: string | undefined = typeof body.title === 'string' ? body.title : undefined
  const description: string | undefined = typeof body.description === 'string' ? body.description : undefined
  const severity: string | undefined = typeof body.severity === 'string' ? body.severity : undefined
  const assignee: string | undefined = typeof body.assignee === 'string' ? body.assignee : undefined
  const tags: string | undefined = typeof body.tags === 'string' ? body.tags : undefined

  if (!title || !title.trim()) {
    res.status(400).json({ error: 'title is required' })
    return
  }
  if (!severity || !VALID_SEVERITIES.includes(severity as Severity)) {
    res.status(400).json({ error: `severity must be one of: ${VALID_SEVERITIES.join(', ')}` })
    return
  }

  let incident = incidentService.createIncident({
    title: title.trim(),
    description,
    severity: severity as Severity,
    assignee,
    tags,
  })

  const [slackResult, jiraResult] = await Promise.allSettled([
    slackService.notifyIncidentCreated(incident),
    jiraService.createIssue(incident),
  ])

  if (jiraResult.status === 'fulfilled' && jiraResult.value) {
    const { key, url } = jiraResult.value
    incidentService.updateIncident(incident.id, { jiraTicketId: key, jiraTicketUrl: url })
    addTimelineEvent(incident.id, { type: 'jira_linked', content: `Jira ticket created: ${key}` })
    incident = incidentService.getIncident(incident.id)!
  } else if (jiraResult.status === 'rejected') {
    console.error('[Jira] Failed to create ticket:', jiraResult.reason)
  }

  if (slackResult.status === 'fulfilled') {
    addTimelineEvent(incident.id, { type: 'slack_notified', content: 'Slack notification sent' })
  } else {
    console.error('[Slack] Failed to notify:', slackResult.reason)
  }

  res.status(201).json(incident)
})

router.get('/', (req: Request, res: Response) => {
  const q = req.query
  const status = typeof q.status === 'string' ? q.status : undefined
  const severity = typeof q.severity === 'string' ? q.severity : undefined
  const search = typeof q.search === 'string' ? q.search : undefined
  const incidents = incidentService.listIncidents({ status, severity, search })
  res.json(incidents)
})

router.get('/:id', (req: Request<IdParams>, res: Response) => {
  const incident = incidentService.getIncident(req.params.id)
  if (!incident) {
    res.status(404).json({ error: 'Incident not found' })
    return
  }
  res.json(incident)
})

router.patch('/:id', async (req: Request<IdParams>, res: Response) => {
  const incident = incidentService.getIncident(req.params.id)
  if (!incident) {
    res.status(404).json({ error: 'Incident not found' })
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = req.body as Record<string, any>
  const title = typeof body.title === 'string' ? body.title : undefined
  const description = typeof body.description === 'string' ? body.description : undefined
  const severity = typeof body.severity === 'string' ? body.severity : undefined
  const status = typeof body.status === 'string' ? body.status : undefined
  const assignee = typeof body.assignee === 'string' ? body.assignee : undefined
  const tags = typeof body.tags === 'string' ? body.tags : undefined
  const escalationNote = typeof body.escalationNote === 'string' ? body.escalationNote : undefined

  if (severity && !VALID_SEVERITIES.includes(severity as Severity)) {
    res.status(400).json({ error: 'Invalid severity' })
    return
  }
  if (status && !VALID_STATUSES.includes(status as IncidentStatus)) {
    res.status(400).json({ error: 'Invalid status' })
    return
  }

  const prevSeverity = incident.severity
  const updated = incidentService.updateIncident(req.params.id, {
    title,
    description,
    severity: severity as Severity | undefined,
    status: status as IncidentStatus | undefined,
    assignee,
    tags,
  })

  if (updated && severity && severity !== prevSeverity) {
    const sevIndex = VALID_SEVERITIES.indexOf(severity as Severity)
    const prevIndex = VALID_SEVERITIES.indexOf(prevSeverity)
    if (sevIndex < prevIndex) {
      const message = escalationNote ?? `Severity escalated from ${prevSeverity} to ${severity}`
      addTimelineEvent(req.params.id, { type: 'escalated', content: message })
      await slackService.notifyEscalation(updated, message).catch(err =>
        console.error('[Slack] Escalation notify failed:', err)
      )
    }
  }

  res.json(updated)
})

router.post('/:id/resolve', async (req: Request<IdParams>, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = req.body as Record<string, any>
  const actor = typeof body.actor === 'string' ? body.actor : undefined
  const resolved = incidentService.resolveIncident(req.params.id, actor)
  if (!resolved) {
    res.status(404).json({ error: 'Incident not found' })
    return
  }
  await slackService.notifyIncidentResolved(resolved).catch(err =>
    console.error('[Slack] Resolve notify failed:', err)
  )
  addTimelineEvent(req.params.id, { type: 'slack_notified', content: 'Slack resolution notification sent' })
  res.json(resolved)
})

router.post('/:id/notes', (req: Request<IdParams>, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = req.body as Record<string, any>
  const content = typeof body.content === 'string' ? body.content : undefined
  const actor = typeof body.actor === 'string' ? body.actor : undefined

  if (!content || !content.trim()) {
    res.status(400).json({ error: 'content is required' })
    return
  }

  const incident = incidentService.getIncident(req.params.id)
  if (!incident) {
    res.status(404).json({ error: 'Incident not found' })
    return
  }

  const event = incidentService.addNote(req.params.id, content.trim(), actor)
  res.status(201).json(event)
})

router.get('/:id/timeline', (req: Request<IdParams>, res: Response) => {
  const incident = incidentService.getIncident(req.params.id)
  if (!incident) {
    res.status(404).json({ error: 'Incident not found' })
    return
  }
  res.json(incidentService.getTimeline(req.params.id))
})

router.post('/:id/postmortem', (req: Request<IdParams>, res: Response) => {
  const incident = incidentService.getIncident(req.params.id)
  if (!incident) {
    res.status(404).json({ error: 'Incident not found' })
    return
  }
  const timeline = incidentService.getTimeline(req.params.id)
  const markdown = generatePostmortem(incident, timeline)
  res.json({ markdown })
})

export default router
