import { Router, Request, Response } from 'express'
import { eventBus } from '../services/eventBus'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n')
  }, 30_000)

  const unsubscribe = eventBus.subscribe((event) => {
    res.write(`event: ${event.type}\n`)
    res.write(`data: ${JSON.stringify(event.payload)}\n\n`)
  })

  req.on('close', () => {
    clearInterval(heartbeat)
    unsubscribe()
  })
})

export default router
