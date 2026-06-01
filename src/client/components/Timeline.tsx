import {
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  ExternalLink,
  Bell,
  TrendingUp,
} from 'lucide-react'
import { TimelineEvent, TimelineEventType } from '../../shared/types'

const iconMap: Record<TimelineEventType, React.ReactNode> = {
  created: <AlertCircle size={14} />,
  status_change: <RefreshCw size={14} />,
  severity_change: <AlertTriangle size={14} />,
  note: <MessageSquare size={14} />,
  jira_linked: <ExternalLink size={14} />,
  slack_notified: <Bell size={14} />,
  escalated: <TrendingUp size={14} />,
}

const colorMap: Record<TimelineEventType, string> = {
  created: 'bg-blue-500',
  status_change: 'bg-purple-500',
  severity_change: 'bg-orange-500',
  note: 'bg-gray-500',
  jira_linked: 'bg-indigo-500',
  slack_notified: 'bg-green-500',
  escalated: 'bg-red-500',
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-gray-400 py-4">No events yet.</p>
  }

  return (
    <ol className="relative border-l border-gray-200 space-y-6 pl-6">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span className={`absolute -left-[1.625rem] flex items-center justify-center w-6 h-6 rounded-full text-white ${colorMap[event.type]}`}>
            {iconMap[event.type]}
          </span>
          <div className="ml-1">
            <p className="text-sm text-gray-800">{event.content}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400">{formatTime(event.createdAt)}</span>
              {event.actor && (
                <span className="text-xs text-gray-400">· {event.actor}</span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
