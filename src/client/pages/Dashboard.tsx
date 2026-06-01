import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, RefreshCw } from 'lucide-react'
import { Incident, MetricsSummary, Severity, IncidentStatus } from '../../shared/types'
import { api, createEventSource } from '../api'
import { MetricsBar } from '../components/MetricsBar'
import { IncidentCard } from '../components/IncidentCard'
import { IncidentForm } from '../components/IncidentForm'

const ALL = ''
const SEVERITIES: Severity[] = ['P1', 'P2', 'P3', 'P4']
const STATUSES: IncidentStatus[] = ['open', 'investigating', 'identified', 'monitoring', 'resolved']

export function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null)
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    try {
      const [inc, met] = await Promise.all([
        api.incidents.list({ search: search || undefined, severity: severity || undefined, status: status || undefined }),
        api.metrics.get(),
      ])
      setIncidents(inc)
      setMetrics(met)
    } finally {
      setLoading(false)
    }
  }, [search, severity, status])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useEffect(() => {
    const es = createEventSource((_type, incident) => {
      setIncidents(prev => {
        const idx = prev.findIndex(i => i.id === incident.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = incident
          return next
        }
        return [incident, ...prev]
      })
      api.metrics.get().then(setMetrics).catch(() => {})
    })
    return () => es.close()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Active Incidents</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> New Incident
        </button>
      </div>

      {metrics && <MetricsBar metrics={metrics} />}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search incidents…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={severity}
          onChange={e => setSeverity(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={ALL}>All severities</option>
          {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={ALL}>All statuses</option>
          {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <button
          onClick={fetchAll}
          className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : incidents.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No incidents found</p>
          <p className="text-sm mt-1">Create one or adjust your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map(incident => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      )}

      {showCreate && (
        <IncidentForm
          onCreated={fetchAll}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
