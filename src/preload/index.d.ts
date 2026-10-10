import type { NetWorthApi } from './index'

declare global {
  interface Window {
    api: NetWorthApi
  }
}

export {}
