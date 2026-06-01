import { IncidentStatus } from '../../shared/types'

const styles: Record<IncidentStatus, string> = {
  open: 'bg-gray-100 text-gray-700 border border-gray-300',
  investigating: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  identified: 'bg-orange-100 text-orange-800 border border-orange-300',
  monitoring: 'bg-blue-100 text-blue-800 border border-blue-300',
  resolved: 'bg-green-100 text-green-800 border border-green-300',
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  )
}
