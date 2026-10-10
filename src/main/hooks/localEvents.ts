/**
 * Thin local-event bus for future Home Assistant / MCP integrations.
 * Main-process only — no network. Listeners can subscribe to domain events.
 */

export type LocalEventName =
  | 'dashboard.updated'
  | 'expense.created'
  | 'income.created'
  | 'month.summary'

type LocalListener = (event: LocalEventName, payload: unknown) => void

const listeners = new Set<LocalListener>()

export function onLocalEvent(listener: LocalListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function emitLocalEvent(event: LocalEventName, payload: unknown): void {
  for (const listener of listeners) {
    try {
      listener(event, payload)
    } catch (err) {
      console.error('[localEvents] listener error', err)
    }
  }
}
