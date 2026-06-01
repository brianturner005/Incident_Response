import { Router, Request, Response } from 'express'
import db from '../db/index'
import * as slackService from '../services/slack'
import * as jiraService from '../services/jira'

const router = Router()

const SENSITIVE_KEYS = ['jira_api_token']

router.get('/', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT key, value FROM config').all() as { key: string; value: string }[]
  const config: Record<string, string> = {}
  for (const row of rows) {
    config[row.key] = SENSITIVE_KEYS.includes(row.key) && row.value ? '••••••••' : row.value
  }
  res.json(config)
})

router.put('/', (req: Request, res: Response) => {
  const body = req.body as Record<string, string>
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Request body must be a key-value object' })
    return
  }

  const upsert = db.prepare(`INSERT INTO config(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`)

  for (const [key, value] of Object.entries(body)) {
    // Don't overwrite sensitive keys if the value is the masked placeholder
    if (SENSITIVE_KEYS.includes(key) && value === '••••••••') continue
    if (typeof value === 'string') {
      upsert.run(key, value)
    }
  }

  res.json({ success: true })
})

router.post('/test-slack', async (_req: Request, res: Response) => {
  try {
    await slackService.sendTestMessage()
    res.json({ success: true })
  } catch (err) {
    res.json({ success: false, error: String(err) })
  }
})

router.post('/test-jira', async (_req: Request, res: Response) => {
  const result = await jiraService.testConnection()
  res.json(result)
})

export default router
