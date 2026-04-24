import { SHMClient } from '@kolapsis/shm-sdk'
import { sql } from 'drizzle-orm'
import { useDatabase } from '../utils/db'
import { users, games, friendships, gameAnalyses, chatMessages } from '../db/schema'

export default defineNitroPlugin(async () => {
  if (import.meta.prerender) return

  const config = useRuntimeConfig()
  const serverUrl = config.shm.serverUrl as string
  const appName = config.shm.appName as string
  const enabled = config.shm.enabled as boolean

  if (!serverUrl || !enabled) return

  const db = useDatabase()

  const telemetry = new SHMClient({
    serverUrl,
    appName,
    appVersion: process.env.npm_package_version || '0.0.0',
    environment: process.env.NODE_ENV || 'production',
    enabled,
  })

  telemetry.setProvider(async () => {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users)
    const [activeGames] = await db.select({ count: sql<number>`count(*)` }).from(games).where(sql`status = 'active'`)
    const [completedGames] = await db.select({ count: sql<number>`count(*)` }).from(games).where(sql`status = 'completed'`)
    const [totalGames] = await db.select({ count: sql<number>`count(*)` }).from(games)
    const [acceptedFriends] = await db.select({ count: sql<number>`count(*)` }).from(friendships).where(sql`status = 'accepted'`)
    const [analyses] = await db.select({ count: sql<number>`count(*)` }).from(gameAnalyses)
    const [messages] = await db.select({ count: sql<number>`count(*)` }).from(chatMessages)

    return {
      users_total: Number(userCount?.count ?? 0),
      games_active: Number(activeGames?.count ?? 0),
      games_completed: Number(completedGames?.count ?? 0),
      games_total: Number(totalGames?.count ?? 0),
      friendships_accepted: Number(acceptedFriends?.count ?? 0),
      analyses_total: Number(analyses?.count ?? 0),
      chat_messages_total: Number(messages?.count ?? 0),
    }
  })

  telemetry.start()

  console.log(`[SHM] Telemetry started -> ${serverUrl} (${appName})`)
})
