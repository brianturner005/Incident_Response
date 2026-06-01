import { MetricsSummary } from '../../shared/types'

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${highlight ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
      <div className={`text-2xl font-bold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}

function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)}m`
  return `${(min / 60).toFixed(1)}h`
}

export function MetricsBar({ metrics }: { metrics: MetricsSummary }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard label="P1 Open" value={metrics.openBySeverity.P1} highlight={metrics.openBySeverity.P1 > 0} />
      <StatCard label="P2 Open" value={metrics.openBySeverity.P2} />
      <StatCard label="P3 Open" value={metrics.openBySeverity.P3} />
      <StatCard label="P4 Open" value={metrics.openBySeverity.P4} />
      <StatCard label="SLA Breached" value={metrics.slaBreachedCount} highlight={metrics.slaBreachedCount > 0} />
      <StatCard
        label="Avg Resolution"
        value={metrics.avgResolutionMinutes > 0 ? formatMinutes(metrics.avgResolutionMinutes) : '—'}
      />
    </div>
  )
}
