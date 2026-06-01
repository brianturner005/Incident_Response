import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, AlertTriangle, MessageSquare, FileText, ExternalLink } from 'lucide-react'
import { Incident, TimelineEvent, Severity, IncidentStatus } from '../../shared/types'
import { api } from '../api'
import { SeverityBadge } from '../components/SeverityBadge'
import { StatusBadge } from '../components/StatusBadge'
import { SLATimer } from '../components/SLATimer'
import { Timeline } from '../components/Timeline'

const SEVERITIES: Severity[] = ['P1', 'P2', 'P3', 'P4']
const STATUSES: IncidentStatus[] = ['open', 'investigating', 'identified', 'monitoring', 'resolved']

function formatDate(iso: string) {
  return new Date(iso).toLocaleString()
}

export function IncidentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [noteText, setNoteText] = useState('')
  const [noteActor, setNoteActor] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [postmortem, setPostmortem] = useState('')
  const [showPostmortem, setShowPostmortem] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    if (!id) return
    try {
      const [inc, tl] = await Promise.all([api.incidents.get(id), api.incidents.getTimeline(id)])
      setIncident(inc)
      setTimeline(tl)
    } catch {
      setError('Incident not found')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleStatusChange(status: IncidentStatus) {
    if (!id || !incident) return
    if (status === 'resolved') {
      if (!confirm('Mark this incident as resolved?')) return
      const updated = await api.incidents.resolve(id)
      setIncident(updated)
    } else {
      const updated = await api.incidents.update(id, { status })
      setIncident(updated)
    }
    const tl = await api.incidents.getTimeline(id)
    setTimeline(tl)
  }

  async function handleSeverityChange(severity: Severity) {
    if (!id) return
    const updated = await api.incidents.update(id, { severity })
    setIncident(updated)
    const tl = await api.incidents.getTimeline(id)
    setTimeline(tl)
  }

  async function handleAddNote() {
    if (!id || !noteText.trim()) return
    await api.incidents.addNote(id, noteText.trim(), noteActor.trim() || undefined)
    setNoteText('')
    setNoteActor('')
    setShowNote(false)
    const tl = await api.incidents.getTimeline(id)
    setTimeline(tl)
  }

  async function handlePostmortem() {
    if (!id) return
    const { markdown } = await api.incidents.postmortem(id)
    setPostmortem(markdown)
    setShowPostmortem(true)
  }

  if (loading) return <div className="p-6 text-gray-400">Loading…</div>
  if (error || !incident) return <div className="p-6 text-red-500">{error || 'Not found'}</div>

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Incident info + actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h1 className="text-xl font-bold text-gray-900">{incident.title}</h1>
              <span className="text-xs text-gray-400 whitespace-nowrap">{incident.id.slice(0, 8)}</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
              <SLATimer incident={incident} />
            </div>

            {incident.description && (
              <p className="text-sm text-gray-600 mb-4">{incident.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Created</span>
                <p className="text-gray-700">{formatDate(incident.createdAt)}</p>
              </div>
              {incident.resolvedAt && (
                <div>
                  <span className="text-gray-400">Resolved</span>
                  <p className="text-gray-700">{formatDate(incident.resolvedAt)}</p>
                </div>
              )}
              {incident.assignee && (
                <div>
                  <span className="text-gray-400">Assignee</span>
                  <p className="text-gray-700">{incident.assignee}</p>
                </div>
              )}
              {incident.tags && (
                <div>
                  <span className="text-gray-400">Tags</span>
                  <p className="text-gray-700">{incident.tags}</p>
                </div>
              )}
              {incident.jiraTicketUrl && (
                <div>
                  <span className="text-gray-400">Jira</span>
                  <a
                    href={incident.jiraTicketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-indigo-600 hover:underline"
                  >
                    {incident.jiraTicketId} <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Actions</h2>

            <div className="flex flex-wrap gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select
                  value={incident.status}
                  onChange={e => handleStatusChange(e.target.value as IncidentStatus)}
                  disabled={incident.status === 'resolved'}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Severity</label>
                <select
                  value={incident.severity}
                  onChange={e => handleSeverityChange(e.target.value as Severity)}
                  disabled={incident.status === 'resolved'}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {incident.status !== 'resolved' && (
                <button
                  onClick={() => handleStatusChange('resolved')}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle size={14} /> Resolve
                </button>
              )}
              <button
                onClick={() => setShowNote(v => !v)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:border-gray-400 transition-colors"
              >
                <MessageSquare size={14} /> Add Note
              </button>
              <button
                onClick={handlePostmortem}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:border-gray-400 transition-colors"
              >
                <FileText size={14} /> Post-Mortem
              </button>
            </div>

            {showNote && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Add a note to the timeline…"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={noteActor}
                    onChange={e => setNoteActor(e.target.value)}
                    placeholder="Your name (optional)"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!noteText.trim()}
                    className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Timeline */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Timeline</h2>
          <Timeline events={timeline} />
        </div>
      </div>

      {/* Post-mortem modal */}
      {showPostmortem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold">Post-Mortem Template</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(postmortem)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                >
                  Copy
                </button>
                <button
                  onClick={() => setShowPostmortem(false)}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                {postmortem}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
