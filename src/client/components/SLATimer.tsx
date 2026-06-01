import { useEffect, useState } from 'react'
import { AlertTriangle, Clock } from 'lucide-react'
import { Incident, SLA_TARGETS } from '../../shared/types'

function formatDiff(ms: number): string {
  const abs = Math.abs(ms)
  const totalSec = Math.floor(abs / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function SLATimer({ incident }: { incident: Incident }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (incident.status === 'resolved') return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [incident.status])

  const sla = SLA_TARGETS[incident.severity]
  const createdMs = new Date(incident.createdAt).getTime()
  const deadline = createdMs + sla.resolutionMinutes * 60_000

  if (incident.status === 'resolved' && incident.resolvedAt) {
    const elapsed = new Date(incident.resolvedAt).getTime() - createdMs
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700">
        <Clock size={12} />
        Resolved in {formatDiff(elapsed)}
      </span>
    )
  }

  const diff = deadline - now
  const breached = diff < 0

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${breached ? 'text-red-600' : 'text-gray-500'}`}>
      {breached ? <AlertTriangle size={12} /> : <Clock size={12} />}
      {breached ? `Breached ${formatDiff(diff)} ago` : `${formatDiff(diff)} remaining`}
    </span>
  )
}
