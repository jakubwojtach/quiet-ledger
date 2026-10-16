/**
 * Electron `-webkit-app-region: drag` ignores z-index and steals clicks inside
 * portaled sheets/dialogs. While a modal is open, turn every drag region into
 * no-drag; restore when the last modal closes.
 */
let openCount = 0

export function acquireElectronModalDragLock(): void {
  openCount += 1
  document.documentElement.dataset.electronModal = '1'
}

export function releaseElectronModalDragLock(): void {
  openCount = Math.max(0, openCount - 1)
  if (openCount === 0) {
    delete document.documentElement.dataset.electronModal
  }
}
