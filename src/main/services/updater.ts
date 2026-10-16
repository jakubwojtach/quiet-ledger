import { BrowserWindow, app } from 'electron'
import { autoUpdater, type UpdateInfo, type ProgressInfo } from 'electron-updater'
import { is } from '@electron-toolkit/utils'
import type { UpdateStatus } from '@shared/updates'

export type { UpdateStatus }

let status: UpdateStatus = { state: 'idle' }
let started = false

function broadcast(next: UpdateStatus): void {
  status = next
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('app:updateStatus', next)
  }
}

export function getUpdateStatus(): UpdateStatus {
  return status
}

export function getAppVersion(): string {
  return app.getVersion()
}

/** Wire events once; safe to call after window exists. */
export function initAutoUpdater(): void {
  if (started) return
  started = true

  if (is.dev || !app.isPackaged) {
    status = { state: 'disabled', reason: 'dev' }
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  // Public GitHub Releases — no token needed for latest*.yml
  autoUpdater.allowPrerelease = false

  autoUpdater.on('checking-for-update', () => {
    broadcast({ state: 'checking' })
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    broadcast({
      state: 'available',
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null
    })
  })

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    broadcast({ state: 'not-available', version: info.version })
  })

  autoUpdater.on('download-progress', (p: ProgressInfo) => {
    broadcast({
      state: 'downloading',
      percent: p.percent,
      transferred: p.transferred,
      total: p.total
    })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    broadcast({ state: 'ready', version: info.version })
  })

  autoUpdater.on('error', (err: Error) => {
    console.warn('[updater]', err.message)
    broadcast({ state: 'error', message: err.message || 'Update failed' })
  })

  // Quiet check a few seconds after launch
  setTimeout(() => {
    void checkForUpdates().catch((err: Error) => {
      console.warn('[updater] startup check failed:', err.message)
    })
  }, 8_000)
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  if (is.dev || !app.isPackaged) {
    const next: UpdateStatus = { state: 'disabled', reason: 'dev' }
    broadcast(next)
    return next
  }
  try {
    broadcast({ state: 'checking' })
    await autoUpdater.checkForUpdates()
    return status
  } catch (err) {
    const next: UpdateStatus = {
      state: 'error',
      message: (err as Error).message || 'Update check failed'
    }
    broadcast(next)
    return next
  }
}

export function quitAndInstall(): void {
  if (is.dev || !app.isPackaged) return
  // isSilent, isForceRunAfter
  autoUpdater.quitAndInstall(false, true)
}
