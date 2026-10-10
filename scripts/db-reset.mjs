#!/usr/bin/env node
/**
 * Explicit wipe of the local Electron SQLite DB (and WAL siblings).
 * Does not run on app start — invoke via `npm run db:reset`.
 */
import { existsSync, rmSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { join } from 'node:path'

function userDataDir() {
  const home = homedir()
  switch (platform()) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'savings-net-worth')
    case 'win32':
      return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'savings-net-worth')
    default:
      return join(process.env.XDG_CONFIG_HOME || join(home, '.config'), 'savings-net-worth')
  }
}

const dir = userDataDir()
const base = join(dir, 'networth.sqlite')
const targets = [base, `${base}-wal`, `${base}-shm`]

let removed = 0
for (const file of targets) {
  if (!existsSync(file)) continue
  rmSync(file)
  console.log(`Removed ${file}`)
  removed += 1
}

if (removed === 0) {
  console.log(`No DB files found under ${dir}`)
  console.log('Nothing to reset — next `npm run dev` will create an empty database.')
} else {
  console.log(`Reset complete (${removed} file(s)). Restart the app with \`npm run dev\`.`)
}
