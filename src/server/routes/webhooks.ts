import { Router, Request, Response } from 'express'
import * as incidentService from '../services/incident'
import * as slackService from '../services/slack'
import * as jiraService from '../services/jira'
import { addTimelineEvent } from '../services/incident'
import { Severity, InboundAlert } from '../../shared/types'

const router = Router()

const VALID_SEVERITIES: Severity[] = ['P1', 'P2', 'P3', 'P4']

router.post('/inbound', async (req: Request, res: Response) => {
  const payload = req.body as InboundAlert

  if (!payload.title || typeof payload.title !== 'string') {
    res.status(400).json({ error: 'title is required' })
    return
  }

  const severity: Severity = VALID_SEVERITIES.includes(payload.severity as Severity)
    ? (payload.severity as Severity)
    : 'P2'

  const tagParts: string[] = []
  if (payload.source) tagParts.push(`source:${payload.source}`)
  if (payload.tags?.length) tagParts.push(...payload.tags)
  const tags = tagParts.join(',')

  let incident = incidentService.createIncident({
    title: payload.title.trim(),
    description: payload.description ?? '',
    severity,
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
  }

  if (slackResult.status === 'fulfilled') {
    addTimelineEvent(incident.id, { type: 'slack_notified', content: 'Slack notification sent' })
  }

  res.status(201).json(incident)
})

export default router
