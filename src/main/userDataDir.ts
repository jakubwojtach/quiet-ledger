import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { basename, join } from 'path'
import { homedir } from 'os'
import {
  APP_ID,
  DATA_DIR_NAME,
  DB_FILE_NAME,
  LEGACY_DATA_DIR_NAMES,
  PRODUCT_NAME,
  type DatabaseInfo
} from '@shared/dataDirs'

export type { DatabaseInfo }

export function userDataDirFor(dirName: string): string {
  const home = homedir()
  if (process.platform === 'darwin') {
    return join(home, 'Library', 'Application Support', dirName)
  }
  if (process.platform === 'win32') {
    return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), dirName)
  }
  return join(process.env.XDG_CONFIG_HOME || join(home, '.config'), dirName)
}

export function resolveUserDataDir(): string {
  return userDataDirFor(DATA_DIR_NAME)
}

export function resolveDatabasePath(): string {
  return join(resolveUserDataDir(), DB_FILE_NAME)
}

export function listLegacyDatabaseFiles(): string[] {
  const found: string[] = []
  for (const name of LEGACY_DATA_DIR_NAMES) {
    const path = join(userDataDirFor(name), DB_FILE_NAME)
    if (existsSync(path)) found.push(path)
  }
  return found
}

/**
 * One-shot: if quiet-ledger has no DB yet but a legacy folder does, copy the
 * SQLite file (+ WAL/SHM) so holdings survive the Quiet Ledger rename.
 */
export function migrateLegacyDatabaseIfNeeded(): void {
  const destDir = resolveUserDataDir()
  const destDb = join(destDir, DB_FILE_NAME)
  if (existsSync(destDb)) return

  for (const name of LEGACY_DATA_DIR_NAMES) {
    const srcDb = join(userDataDirFor(name), DB_FILE_NAME)
    if (!existsSync(srcDb)) continue

    if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true })

    for (const src of [srcDb, `${srcDb}-wal`, `${srcDb}-shm`]) {
      if (!existsSync(src)) continue
      copyFileSync(src, join(destDir, basename(src)))
    }
    console.log(`[quiet-ledger] Migrated SQLite from ${name} → ${DATA_DIR_NAME}`)
    return
  }
}

export function describeDatabase(dbPath: string): DatabaseInfo {
  return {
    appId: APP_ID,
    productName: PRODUCT_NAME,
    userDataDir: resolveUserDataDir(),
    dbPath,
    legacyDbPaths: listLegacyDatabaseFiles()
  }
}
