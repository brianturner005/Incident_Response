import { SSEEvent } from '../../shared/types'

type SSEListener = (event: SSEEvent) => void

class EventBus {
  private listeners = new Set<SSEListener>()

  subscribe(fn: SSEListener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  publish(event: SSEEvent): void {
    for (const fn of this.listeners) {
      fn(event)
    }
  }
}

export const eventBus = new EventBus()
