import { Router, Request, Response } from 'express'
import { getMetrics } from '../services/incident'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const metrics = getMetrics()
  res.json(metrics)
})

export default router
