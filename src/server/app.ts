import express from 'express'
import cors from 'cors'
import path from 'path'
import incidentsRouter from './routes/incidents'
import configRouter from './routes/config'
import metricsRouter from './routes/metrics'
import webhooksRouter from './routes/webhooks'
import eventsRouter from './routes/events'

const app = express()

app.use(cors())
app.use(express.json())

if (process.env.NODE_ENV === 'production') {
  const helmet = require('helmet')
  app.use(helmet())
}

app.use('/api/incidents', incidentsRouter)
app.use('/api/config', configRouter)
app.use('/api/metrics', metricsRouter)
app.use('/api/webhooks', webhooksRouter)
app.use('/api/events', eventsRouter)

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client')
  app.use(express.static(clientDist, { index: false }))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

export default app
