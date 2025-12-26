import configPromise from '@payload-config'
import { getPayload } from 'payload'
import 'server-only'

let cachedPayload: any = null

/**
 * Get the Payload instance for database operations
 * This uses Payload's database adapter directly without Drizzle
 */
export async function getPayloadDb() {
  if (cachedPayload) return cachedPayload

  const payload = await getPayload({ config: configPromise })
  cachedPayload = payload

  return payload
}

/**
 * Execute raw SQL queries using Payload's database connection
 */
export async function executeQuery(query: string, params: any[] = []) {
  const payload = await getPayloadDb()
  // Access the underlying database connection from Payload
  const db = payload.db as any

  if (db.execute) {
    return await db.execute({ sql: query, values: params })
  }

  throw new Error('Database execute method not available')
}
