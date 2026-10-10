/** Stable Electron userData folder. Dev and packaged builds both use this name. */
export const DATA_DIR_NAME = 'savings-net-worth'

/**
 * Older builds wrote SQLite somewhere else:
 * - `ev-scaffold` — electron-builder productName from the scaffold
 * - `Electron` — default name when the dev binary never set an app name
 */
export const LEGACY_DATA_DIR_NAMES = ['ev-scaffold', 'Electron'] as const

export const DB_FILE_NAME = 'networth.sqlite'

export const APP_ID = 'com.savings.networth'

export const PRODUCT_NAME = 'Savings Net Worth'

export interface DatabaseInfo {
  appId: string
  productName: string
  userDataDir: string
  dbPath: string
  /** Legacy SQLite files that still exist. This process does not open them. */
  legacyDbPaths: string[]
}
