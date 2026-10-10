#!/usr/bin/env node
/**
 * Explicit wipe of local Electron SQLite files (and WAL siblings).
 * Does not run on app start — invoke via `npm run db:reset`.
 *
 * Folder names stay in sync with src/shared/dataDirs.ts:
 *   savings-net-worth — current app
 *   ev-scaffold — old electron-builder productName
 *   Electron — default dev name before the app set its own folder
 */
import { copyFileSync, existsSync, rmSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { join } from 'node:path'

const DIR_NAMES = ['savings-net-worth', 'ev-scaffold', 'Electron']
const DB_FILE_NAME = 'networth.sqlite'

function userDataDir(dirName) {
  const home = homedir()
  switch (platform()) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', dirName)
    case 'win32':
      return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), dirName)
    default:
      return join(process.env.XDG_CONFIG_HOME || join(home, '.config'), dirName)
  }
}

let removed = 0
for (const dirName of DIR_NAMES) {
  const dir = userDataDir(dirName)
  const base = join(dir, DB_FILE_NAME)
  const targets = [base, `${base}-wal`, `${base}-shm`]
  const present = targets.filter((file) => existsSync(file))
  if (present.length === 0) {
    console.log(`No DB under ${dir}`)
    continue
  }
  // Holdings live only in this file, so keep a copy of everything before deleting.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  for (const file of present) {
    const backup = file.replace(DB_FILE_NAME, `${DB_FILE_NAME}.bak-${stamp}`)
    copyFileSync(file, backup)
    console.log(`Backed up ${file} -> ${backup}`)
  }
  for (const file of present) {
    rmSync(file)
    console.log(`Removed ${file}`)
    removed += 1
  }
}

const canonical = join(userDataDir('savings-net-worth'), DB_FILE_NAME)
console.log(`App reads ${canonical}`)
if (removed === 0) {
  console.log('Nothing to reset. Next `npm run dev` creates that file and seeds only Fort Wola and Nefrytowa.')
} else {
  console.log(`Reset complete (${removed} file(s)). Restart with \`npm run dev\` — only Fort Wola and Nefrytowa are seeded.`)
  console.log('Other holdings are in the .bak file. To restore: quit the app, copy the .bak files back over networth.sqlite, -wal and -shm.')
}
