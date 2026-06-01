import {
  Incident,
  TimelineEvent,
  MetricsSummary,
  CreateIncidentPayload,
  UpdateIncidentPayload,
  SSEEvent,
} from '../shared/types'

export type { Incident, TimelineEvent, MetricsSummary, CreateIncidentPayload, UpdateIncidentPayload, SSEEvent }

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  incidents: {
    list: (params?: { status?: string; severity?: string; search?: string }) => {
      const qs = new URLSearchParams()
      if (params?.status) qs.set('status', params.status)
      if (params?.severity) qs.set('severity', params.severity)
      if (params?.search) qs.set('search', params.search)
      const query = qs.toString() ? `?${qs.toString()}` : ''
      return request<Incident[]>(`/incidents${query}`)
    },
    get: (id: string) => request<Incident>(`/incidents/${id}`),
    create: (data: CreateIncidentPayload) =>
      request<Incident>('/incidents', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, patch: UpdateIncidentPayload) =>
      request<Incident>(`/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    resolve: (id: string, actor?: string) =>
      request<Incident>(`/incidents/${id}/resolve`, { method: 'POST', body: JSON.stringify({ actor }) }),
    addNote: (id: string, content: string, actor?: string) =>
      request<TimelineEvent>(`/incidents/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content, actor }),
      }),
    getTimeline: (id: string) => request<TimelineEvent[]>(`/incidents/${id}/timeline`),
    postmortem: (id: string) =>
      request<{ markdown: string }>(`/incidents/${id}/postmortem`, { method: 'POST' }),
  },
  config: {
    get: () => request<Record<string, string>>('/config'),
    update: (config: Record<string, string>) =>
      request<{ success: boolean }>('/config', { method: 'PUT', body: JSON.stringify(config) }),
    testSlack: () =>
      request<{ success: boolean; error?: string }>('/config/test-slack', { method: 'POST' }),
    testJira: () =>
      request<{ success: boolean; error?: string }>('/config/test-jira', { method: 'POST' }),
  },
  metrics: {
    get: () => request<MetricsSummary>('/metrics'),
  },
}

export function createEventSource(
  onEvent: (type: SSEEvent['type'], incident: Incident) => void
): EventSource {
  const es = new EventSource('/api/events')
  const types: SSEEvent['type'][] = ['incident_created', 'incident_updated', 'incident_resolved']
  for (const type of types) {
    es.addEventListener(type, (e: MessageEvent) => {
      try {
        onEvent(type, JSON.parse(e.data) as Incident)
      } catch {}
    })
  }
  return es
}
