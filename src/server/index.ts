import app from './app'

const PORT = parseInt(process.env.PORT ?? '3000', 10)

app.listen(PORT, () => {
  console.log(`Incident Response server running on http://localhost:${PORT}`)
})
