/** Stable Electron userData folder. Dev and packaged builds both use this name. */
export const DATA_DIR_NAME = 'quiet-ledger'

/**
 * Older builds wrote SQLite somewhere else:
 * - `savings-net-worth` — previous product folder before Quiet Ledger rename
 * - `ev-scaffold` — electron-builder productName from the scaffold
 * - `Electron` — default name when the dev binary never set an app name
 */
export const LEGACY_DATA_DIR_NAMES = ['savings-net-worth', 'ev-scaffold', 'Electron'] as const

export const DB_FILE_NAME = 'networth.sqlite'

export const APP_ID = 'com.quietledger.app'

export const PRODUCT_NAME = 'Quiet Ledger'

export interface DatabaseInfo {
  appId: string
  productName: string
  userDataDir: string
  dbPath: string
  /** Legacy SQLite files that still exist. This process does not open them. */
  legacyDbPaths: string[]
}
