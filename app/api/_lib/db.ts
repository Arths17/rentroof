import { readFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { DatabaseSync } from 'node:sqlite'

const DATA_DIR = join(process.cwd(), '.data')
const DB_PATH = join(DATA_DIR, 'rentproof.sqlite')
const SCHEMA_PATH = join(process.cwd(), 'db', 'migrations', '001_init.sql')

let database: DatabaseSync | null = null

function initializeDatabase(): DatabaseSync {
  if (database) {
    return database
  }

  mkdirSync(DATA_DIR, { recursive: true })
  const sqlite = new DatabaseSync(DB_PATH)
  sqlite.exec('PRAGMA foreign_keys = ON;')
  sqlite.exec(readFileSync(SCHEMA_PATH, 'utf8'))
  database = sqlite
  return sqlite
}

export function getDatabase(): DatabaseSync {
  return initializeDatabase()
}

export function dbAll<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  return getDatabase().prepare(sql).all(...params) as T[]
}

export function dbGet<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
  return getDatabase().prepare(sql).get(...params) as T | undefined
}

export function dbRun(sql: string, params: unknown[] = []): void {
  getDatabase().prepare(sql).run(...params)
}

export function dbTransaction<T>(handler: () => T): T {
  const sqlite = getDatabase()
  sqlite.exec('BEGIN IMMEDIATE')

  try {
    const result = handler()
    sqlite.exec('COMMIT')
    return result
  } catch (error) {
    sqlite.exec('ROLLBACK')
    throw error
  }
}
