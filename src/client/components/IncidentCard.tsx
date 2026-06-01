import { useNavigate } from 'react-router-dom'
import { User, Tag } from 'lucide-react'
import { Incident } from '../../shared/types'
import { SeverityBadge } from './SeverityBadge'
import { StatusBadge } from './StatusBadge'
import { SLATimer } from './SLATimer'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function IncidentCard({ incident }: { incident: Incident }) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/incidents/${incident.id}`)}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-gray-300 cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 truncate">{incident.title}</h3>
          {incident.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{incident.description}</p>
          )}
        </div>
        <div className="text-xs text-gray-400 whitespace-nowrap shrink-0">{timeAgo(incident.createdAt)}</div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
        <SLATimer incident={incident} />
        <div className="flex items-center gap-3">
          {incident.assignee && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <User size={12} /> {incident.assignee}
            </span>
          )}
          {incident.tags && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Tag size={12} />
              {incident.tags.split(',').slice(0, 2).join(', ')}
              {incident.tags.split(',').length > 2 && ' …'}
            </span>
          )}
          {incident.jiraTicketId && (
            <span className="text-xs text-indigo-600 font-medium">{incident.jiraTicketId}</span>
          )}
        </div>
      </div>
    </div>
  )
}
