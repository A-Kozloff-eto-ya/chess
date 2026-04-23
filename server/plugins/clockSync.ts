import { getActiveRooms, broadcastToRoom, persistRoomState } from '../utils/gameRooms'

export default defineNitroPlugin(() => {
  setInterval(() => {
    const now = Date.now()
    for (const room of getActiveRooms()) {
      const whiteElapsed = now - room.lastMoveAt
      const turn = room.chess.turn() === 'w' ? 'white' : 'black'

      let whiteTime = room.whiteTime
      let blackTime = room.blackTime
      if (turn === 'white') {
        whiteTime -= whiteElapsed
      } else {
        blackTime -= whiteElapsed
      }

      broadcastToRoom(room, JSON.stringify({
        type: 'clock_sync',
        gameId: room.gameId,
        whiteTime,
        blackTime,
      }))

      persistRoomState(room).catch((e) => {
        console.error('[ClockSync] Failed to snapshot room:', room.gameId, e)
      })
    }
  }, 10_000)
})
