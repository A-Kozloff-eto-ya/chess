import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema'

const connectionString = process.env.NUXT_HUB_DATABASE_URL || process.env.DATABASE_URL || ''

let _db: ReturnType<typeof drizzle> | null = null

export function useDatabase() {
  if (_db) return _db

  if (!connectionString) {
    throw new Error('NUXT_HUB_DATABASE_URL or DATABASE_URL must be set')
  }

  const client = postgres(connectionString)
  _db = drizzle(client, { schema })
  return _db
}

export const db = useDatabase()
