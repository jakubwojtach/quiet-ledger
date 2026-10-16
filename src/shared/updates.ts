export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'disabled'; reason: 'dev' }
  | { state: 'checking' }
  | { state: 'available'; version: string; releaseNotes?: string | null }
  | { state: 'not-available'; version: string }
  | { state: 'downloading'; percent: number; transferred: number; total: number }
  | { state: 'ready'; version: string }
  | { state: 'error'; message: string }
