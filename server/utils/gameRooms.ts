import { Chess } from 'chess.js'
import { games } from '../db/schema'
import { eq, inArray } from 'drizzle-orm'
import { db } from './db'
import type { GameMove } from '../../shared/types'

export interface GameRoom {
  gameId: string
  chess: Chess
  whitePlayerId: number | null
  blackPlayerId: number | null
  moveList: GameMove[]
  timeControl: { base: number; increment: number }
  whiteTime: number
  blackTime: number
  lastMoveAt: number
  status: 'waiting' | 'active' | 'completed' | 'abandoned'
  peers: Map<number, { send: (data: string) => void }>
  rematchOfferedBy: number | null
  rematchAccepted: boolean
  disconnectTimers: Map<number, ReturnType<typeof setTimeout>>
}

const gameRooms = new Map<string, GameRoom>()
const roomLocks = new Map<string, Promise<void>>()

export function getGameRoom(gameId: string): GameRoom | undefined {
  return gameRooms.get(gameId)
}

export function createGameRoom(gameId: string, timeControl: string = '10+0'): GameRoom {
  const [base, inc] = timeControl.split('+').map(Number)
  const room: GameRoom = {
    gameId,
    chess: new Chess(),
    whitePlayerId: null,
    blackPlayerId: null,
    moveList: [],
    timeControl: { base: (base || 10) * 60 * 1000, increment: (inc || 0) * 1000 },
    whiteTime: (base || 10) * 60 * 1000,
    blackTime: (base || 10) * 60 * 1000,
    lastMoveAt: Date.now(),
    status: 'waiting',
    peers: new Map(),
    rematchOfferedBy: null,
    rematchAccepted: false,
    disconnectTimers: new Map(),
  }
  gameRooms.set(gameId, room)
  return room
}

export function clearDisconnectTimer(room: GameRoom, userId: number) {
  const timer = room.disconnectTimers.get(userId)
  if (timer) {
    clearTimeout(timer)
    room.disconnectTimers.delete(userId)
  }
}

export function setDisconnectTimer(room: GameRoom, userId: number, timeoutMs: number, callback: () => void) {
  clearDisconnectTimer(room, userId)
  room.disconnectTimers.set(userId, setTimeout(callback, timeoutMs))
}

export function removeGameRoom(gameId: string): void {
  const room = gameRooms.get(gameId)
  if (room) {
    for (const timer of room.disconnectTimers.values()) clearTimeout(timer)
  }
  gameRooms.delete(gameId)
  roomLocks.delete(gameId)
}

export async function withRoomLock<T>(gameId: string, fn: () => Promise<T>): Promise<T> {
  while (roomLocks.has(gameId)) {
    await roomLocks.get(gameId)
  }
  let resolve!: () => void
  const lock = new Promise<void>((r) => { resolve = r })
  roomLocks.set(gameId, lock)
  try {
    return await fn()
  } finally {
    roomLocks.delete(gameId)
    resolve()
  }
}

export function findPlayerGame(userId: number): GameRoom | undefined {
  for (const room of gameRooms.values()) {
    if (room.whitePlayerId === userId || room.blackPlayerId === userId) {
      return room
    }
  }
  return undefined
}

export function broadcastToRoom(room: GameRoom, message: string | object, excludeUserId?: number) {
  const data = typeof message === 'string' ? message : JSON.stringify(message)
  for (const [uid, peer] of room.peers) {
    if (uid !== excludeUserId) {
      try { peer.send(data) } catch { /* peer already closed */ }
    }
  }
}

export function getActiveRooms(): GameRoom[] {
  return [...gameRooms.values()].filter(r => r.status === 'active')
}

export async function persistRoomState(room: GameRoom): Promise<void> {
  try {
    await db.update(games).set({
      fen: room.chess.fen(),
      moves: JSON.stringify(room.moveList),
      whiteTimeMs: room.whiteTime,
      blackTimeMs: room.blackTime,
      lastMoveAt: new Date(room.lastMoveAt),
      status: room.status,
    }).where(eq(games.id, Number(room.gameId)))
  } catch (e) {
    console.error('[GameRooms] Failed to persist room state:', e)
  }
}

export async function restoreRoomsFromDB(): Promise<void> {
  try {
    const activeGames = await db.select().from(games)
      .where(inArray(games.status, ['waiting', 'active']))

    for (const game of activeGames) {
      if (gameRooms.has(String(game.id))) continue

      const [base, inc] = (game.timeControl || '10+0').split('+').map(Number)
      const room: GameRoom = {
        gameId: String(game.id),
        chess: new Chess(),
        whitePlayerId: game.whitePlayerId,
        blackPlayerId: game.blackPlayerId,
        moveList: [],
        timeControl: { base: (base || 10) * 60 * 1000, increment: (inc || 0) * 1000 },
        whiteTime: game.whiteTimeMs ?? (base || 10) * 60 * 1000,
        blackTime: game.blackTimeMs ?? (base || 10) * 60 * 1000,
        lastMoveAt: game.lastMoveAt ? new Date(game.lastMoveAt).getTime() : Date.now(),
        status: game.status as GameRoom['status'],
        peers: new Map(),
        rematchOfferedBy: null,
        rematchAccepted: false,
        disconnectTimers: new Map(),
      }

      if (game.fen && game.fen !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
        try {
          room.chess.load(game.fen)
        } catch (e) {
          console.error(`[GameRooms] Failed to load FEN for game ${game.id}:`, e)
        }
      }

      try {
        room.moveList = JSON.parse(game.moves || '[]')
      } catch {
        room.moveList = []
      }

      gameRooms.set(String(game.id), room)
    }

    console.log(`[GameRooms] Restored ${activeGames.length} rooms from DB`)
  } catch (e: any) {
    if (!e?.cause?.message?.includes('does not exist')) {
      console.error('[GameRooms] Failed to restore rooms from DB:', e)
    }
  }
}
