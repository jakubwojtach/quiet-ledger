import { existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
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

export function describeDatabase(dbPath: string): DatabaseInfo {
  return {
    appId: APP_ID,
    productName: PRODUCT_NAME,
    userDataDir: resolveUserDataDir(),
    dbPath,
    legacyDbPaths: listLegacyDatabaseFiles()
  }
}
