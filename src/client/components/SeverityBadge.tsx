import { Severity } from '../../shared/types'

const styles: Record<Severity, string> = {
  P1: 'bg-red-100 text-red-800 border border-red-300',
  P2: 'bg-orange-100 text-orange-800 border border-orange-300',
  P3: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  P4: 'bg-blue-100 text-blue-800 border border-blue-300',
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[severity]}`}>
      {severity}
    </span>
  )
}
