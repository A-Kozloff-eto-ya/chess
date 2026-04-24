import { restoreRoomsFromDB } from '../utils/gameRooms'

export default defineNitroPlugin(async () => {
  for (let i = 0; i < 30; i++) {
    try {
      await restoreRoomsFromDB()
      return
    } catch (e: any) {
      if (e?.cause?.message?.includes('does not exist')) {
        await new Promise(r => setTimeout(r, 1000))
        continue
      }
      console.error('[GameRooms] Failed to restore rooms from DB:', e)
      return
    }
  }
  console.error('[GameRooms] Timed out waiting for database tables')
})
