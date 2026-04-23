import { getGameRoom, createGameRoom, withRoomLock, getActiveRooms, broadcastToRoom, persistRoomState } from '../utils/gameRooms'
import { validateMove, isGameOver, generatePgn } from '../utils/chess'
import { calculateNewRating } from '../utils/rating'
import { addPeer as registerPeer, removePeer as unregisterPeer, broadcastToUsers } from '../utils/peerRegistry'
import { games, users, friendships, chatMessages } from '../db/schema'
import { eq, or, and, desc } from 'drizzle-orm'
import type { GameMove, UserInfo } from '../../shared/types'

interface PeerData {
  userId: number
  username: string
  gameId?: string
}

interface DbGameRow {
  id: number
  timeControl: string | null
  whitePlayerId: number | null
  blackPlayerId: number | null
  fen: string | null
  moves: string | null
  whiteTimeMs: number | null
  blackTimeMs: number | null
  lastMoveAt: Date | null
  status: string
}

function parseWsMessage(raw: unknown): string {
  const r = raw as Record<string, unknown>
  if (typeof r.text === 'function') return (r.text as () => string)()
  if (typeof r.text === 'string') return r.text
  if (r.data && typeof (r.data as { toString?: Function }).toString === 'function') return (r.data as { toString: (enc?: string) => string }).toString('utf-8')
  return String(raw)
}

interface WsMessage {
  type: string
  gameId?: string
  move?: { from: string; to: string; promotion?: string }
  message?: string
  toUserId?: number
  inviteCode?: string
}

async function updateRatings(
  whitePlayerId: number | null,
  blackPlayerId: number | null,
  result: string
) {
  if (!whitePlayerId || !blackPlayerId) {
    console.error('[Rating] Missing player IDs:', { whitePlayerId, blackPlayerId })
    return
  }

  const [whiteRow] = await db.select({
    id: users.id,
    rating: users.rating,
  }).from(users).where(eq(users.id, whitePlayerId))

  const [blackRow] = await db.select({
    id: users.id,
    rating: users.rating,
  }).from(users).where(eq(users.id, blackPlayerId))

  if (!whiteRow || !blackRow) {
    console.error('[Rating] Player not found in DB:', { whiteRow, blackRow })
    return
  }

  const whiteResult: 1 | 0.5 | 0 = result === '1-0' ? 1 : result === '0-1' ? 0 : 0.5
  const blackResult: 1 | 0.5 | 0 = result === '0-1' ? 1 : result === '1-0' ? 0 : 0.5

  const newWhiteRating = calculateNewRating(whiteRow.rating ?? 1200, blackRow.rating ?? 1200, whiteResult)
  const newBlackRating = calculateNewRating(blackRow.rating ?? 1200, whiteRow.rating ?? 1200, blackResult)

  try {
    await db.update(users).set({ rating: newWhiteRating }).where(eq(users.id, whitePlayerId))
    await db.update(users).set({ rating: newBlackRating }).where(eq(users.id, blackPlayerId))
    console.log('[Rating] Updated:', {
      white: { id: whitePlayerId, old: whiteRow.rating, new: newWhiteRating },
      black: { id: blackPlayerId, old: blackRow.rating, new: newBlackRating },
      result,
    })
  } catch (e) {
    console.error('[Rating] DB update failed:', e)
  }
}

async function getFriendIds(userId: number): Promise<number[]> {
  const rows = await db
    .select({ requesterId: friendships.requesterId, addresseeId: friendships.addresseeId })
    .from(friendships)
    .where(and(
      or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)),
      eq(friendships.status, 'accepted')
    ))
  return rows.map(r => r.requesterId === userId ? r.addresseeId : r.requesterId)
}

export default defineWebSocketHandler({
  async upgrade(request) {
    try {
      await requireUserSession(request)
    } catch {
      console.error('[WS] Upgrade auth failed')
    }
  },

  async open(peer) {
    try {
      const session = await getUserSession(peer)
      if (!session?.user?.id) {
        peer.close(4001, 'Auth failed')
        return
      }
      ;(peer as unknown as { data: PeerData }).data = { userId: session.user.id, username: session.user.username }
      const wasOffline = registerPeer(session.user.id, peer)
      if (wasOffline) {
        const friendIds = await getFriendIds(session.user.id)
        broadcastToUsers(friendIds, { type: 'user_online', userId: session.user.id })
      }
    } catch {
      peer.close(4001, 'Auth failed')
    }
  },

  async message(peer, raw) {
    let msg: WsMessage
    try {
      msg = JSON.parse(parseWsMessage(raw))
    } catch {
      peer.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }))
      return
    }

    const pd = ((peer as unknown as { data?: PeerData }).data ?? {}) as PeerData
    const userId: number = pd?.userId
    if (!userId) {
      peer.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }))
      return
    }

    switch (msg.type) {
      case 'join': {
        const gameId = msg.gameId!

        await withRoomLock(gameId, async () => {
          let room = getGameRoom(gameId)

          if (!room) {
            const game = await db.select().from(games).where(eq(games.id, Number(gameId))).then(r => r[0] as DbGameRow | undefined)
            if (!game) {
              peer.send(JSON.stringify({ type: 'error', message: 'Game not found' }))
              return
            }
            room = createGameRoom(String(game.id), game.timeControl || '10+0')
            room.whitePlayerId = game.whitePlayerId
            room.blackPlayerId = game.blackPlayerId
            if (game.fen && game.fen !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
              room.chess.load(game.fen)
            }
            try { room.moveList = JSON.parse(game.moves ?? '[]') } catch { room.moveList = [] }
            if (game.whiteTimeMs != null) room.whiteTime = game.whiteTimeMs
            if (game.blackTimeMs != null) room.blackTime = game.blackTimeMs
            if (game.lastMoveAt) room.lastMoveAt = new Date(game.lastMoveAt).getTime()
            if (game.status === 'active' || game.status === 'waiting') room.status = game.status
          }

          let color: 'white' | 'black' | null = null

          if (room.whitePlayerId === userId) {
            color = 'white'
          } else if (room.blackPlayerId === userId) {
            color = 'black'
          } else if (!room.whitePlayerId || !room.blackPlayerId) {
            if (!room.whitePlayerId) {
              room.whitePlayerId = userId
              color = 'white'
              await db.update(games).set({ whitePlayerId: userId, status: 'active' }).where(eq(games.id, Number(gameId)))
            } else {
              room.blackPlayerId = userId
              color = 'black'
              await db.update(games).set({ blackPlayerId: userId, status: 'active' }).where(eq(games.id, Number(gameId)))
            }
            room.status = 'active'
          } else {
            peer.send(JSON.stringify({ type: 'error', message: 'Not your game' }))
            return
          }

          peer.subscribe(`game:${gameId}`)
          pd.gameId = gameId
          room.peers.set(userId, peer)

          const opponentId = color === 'white' ? room.blackPlayerId : room.whitePlayerId
          const opponent = opponentId
            ? await db.select({ id: users.id, username: users.username, rating: users.rating, avatar: users.avatar })
                .from(users).where(eq(users.id, opponentId)).then(r => r[0] as UserInfo | undefined)
            : null

          const chatHistory = await db.select({
            from: chatMessages.username,
            message: chatMessages.message,
            userId: chatMessages.userId,
          }).from(chatMessages)
            .where(eq(chatMessages.gameId, Number(gameId)))
            .orderBy(chatMessages.createdAt)
            .limit(200)

          peer.send(JSON.stringify({
            type: 'joined', gameId, color, opponent,
            whiteTime: room.whiteTime, blackTime: room.blackTime,
            lastMoveAt: room.lastMoveAt, fen: room.chess.fen(),
            moveCount: room.moveList.length,
            turn: room.chess.turn() === 'w' ? 'white' as const : 'black' as const,
            chatHistory,
          }))

          if (opponentId) {
            const player = await db.select({ id: users.id, username: users.username, rating: users.rating, avatar: users.avatar })
              .from(users).where(eq(users.id, userId)).then(r => r[0] as UserInfo | undefined)
            peer.publish(`game:${gameId}`, JSON.stringify({ type: 'opponent_joined', gameId, opponent: player }))
          }
        })

        break
      }

      case 'move': {
        const gameId = msg.gameId!
        const move = msg.move!
        const room = getGameRoom(gameId)
        if (!room) {
          peer.send(JSON.stringify({ type: 'error', message: 'Room not found' }))
          return
        }
        if (room.whitePlayerId !== userId && room.blackPlayerId !== userId) {
          peer.send(JSON.stringify({ type: 'error', message: 'Not your game' }))
          return
        }

        const turn = room.chess.turn() === 'w' ? 'white' : 'black'
        const myColor = room.whitePlayerId === userId ? 'white' : 'black'

        if (turn !== myColor) {
          peer.send(JSON.stringify({ type: 'move_rejected', reason: 'Not your turn', fen: room.chess.fen() }))
          return
        }

        const result = validateMove(room.chess.fen(), move.from, move.to, move.promotion)
        if (!result.valid) {
          peer.send(JSON.stringify({ type: 'move_rejected', reason: result.error, fen: room.chess.fen() }))
          return
        }

        room.chess.move({ from: move.from, to: move.to, promotion: move.promotion })
        room.moveList.push({ from: move.from, to: move.to, promotion: move.promotion, san: result.move.san })

        const now = Date.now()
        if (myColor === 'white') {
          room.whiteTime -= (now - room.lastMoveAt)
          room.whiteTime += room.timeControl.increment
        } else {
          room.blackTime -= (now - room.lastMoveAt)
          room.blackTime += room.timeControl.increment
        }
        room.lastMoveAt = now

        const flaggedPlayer = room.whiteTime <= 0 ? 'white' : room.blackTime <= 0 ? 'black' : null
        if (flaggedPlayer) {
          const flagResult = flaggedPlayer === 'white' ? '0-1' : '1-0'
          const flagPayload = JSON.stringify({ type: 'game_over', gameId, result: flagResult, reason: 'timeout' })
          peer.publish(`game:${gameId}`, flagPayload)
          peer.send(flagPayload)
          room.status = 'completed'
          try {
            await db.update(games).set({
              status: 'completed', result: flagResult, endedAt: new Date(),
              pgn: generatePgn(room.moveList.map((m: GameMove) => m.san)),
              whiteTimeMs: room.whiteTime, blackTimeMs: room.blackTime, lastMoveAt: new Date(room.lastMoveAt),
            }).where(eq(games.id, Number(gameId)))
          } catch (e) { console.error('[WS] Failed to save timeout:', e) }
          await updateRatings(room.whitePlayerId, room.blackPlayerId, flagResult)
          return
        }

        const statePayload = JSON.stringify({
          type: 'state_update',
          gameId,
          fen: room.chess.fen(),
          moveCount: room.moveList.length,
          lastMove: { from: move.from, to: move.to, san: result.move.san },
          turn: room.chess.turn() === 'w' ? 'white' as const : 'black' as const,
          whiteTime: room.whiteTime,
          blackTime: room.blackTime,
          isCheck: room.chess.inCheck(),
        })

        peer.publish(`game:${gameId}`, statePayload)
        peer.send(statePayload)

        await persistRoomState(room)

        const gameState = isGameOver(room.chess.fen())
        if (gameState.gameOver) {
          let gameResult = '*'
          let reason = 'unknown'
          if (gameState.checkmate) { gameResult = myColor === 'white' ? '1-0' : '0-1'; reason = 'checkmate' }
          else if (gameState.stalemate) { gameResult = '1/2-1/2'; reason = 'stalemate' }
          else if (gameState.insufficientMaterial) { gameResult = '1/2-1/2'; reason = 'insufficient_material' }
          else if (gameState.threefoldRepetition) { gameResult = '1/2-1/2'; reason = 'threefold_repetition' }
          else if (gameState.draw) { gameResult = '1/2-1/2'; reason = 'draw' }

          const pgn = generatePgn(room.moveList.map((m: GameMove) => m.san))
          const overPayload = JSON.stringify({ type: 'game_over', gameId, result: gameResult, reason })

          peer.publish(`game:${gameId}`, overPayload)
          peer.send(overPayload)

          room.status = 'completed'
          try {
            await db.update(games).set({
              pgn, result: gameResult, status: 'completed', endedAt: new Date(),
              whiteTimeMs: room.whiteTime, blackTimeMs: room.blackTime, lastMoveAt: new Date(room.lastMoveAt),
            }).where(eq(games.id, Number(gameId)))
          } catch (e) { console.error('[WS] Failed to save game result:', e) }
          await updateRatings(room.whitePlayerId, room.blackPlayerId, gameResult)
        }
        break
      }

      case 'resign': {
        const gameId = msg.gameId!
        const room = getGameRoom(gameId)
        if (!room) return
        const result = room.whitePlayerId === userId ? '0-1' : '1-0'
        const payload = JSON.stringify({ type: 'game_over', gameId, result, reason: 'resignation' })
        peer.publish(`game:${gameId}`, payload)
        peer.send(payload)
        room.status = 'completed'
        try {
          await db.update(games).set({
            status: 'completed', result, endedAt: new Date(),
            pgn: generatePgn(room.moveList.map((m: GameMove) => m.san)),
            whiteTimeMs: room.whiteTime, blackTimeMs: room.blackTime, lastMoveAt: new Date(room.lastMoveAt),
          }).where(eq(games.id, Number(gameId)))
        } catch (e) { console.error('[WS] Failed to save resign:', e) }
        await updateRatings(room.whitePlayerId, room.blackPlayerId, result)
        break
      }

      case 'abort': {
        const gameId = msg.gameId!
        const room = getGameRoom(gameId)
        if (!room) return
        if (room.moveList.length > 0) {
          peer.send(JSON.stringify({ type: 'error', message: 'Cannot abort after first move' }))
          return
        }
        const payload = JSON.stringify({ type: 'game_over', gameId, result: '*', reason: 'abort' })
        peer.publish(`game:${gameId}`, payload)
        peer.send(payload)
        room.status = 'abandoned'
        try {
          await db.update(games).set({
            status: 'abandoned', endedAt: new Date(),
          }).where(eq(games.id, Number(gameId)))
        } catch (e) { console.error('[WS] Failed to save abort:', e) }
        break
      }

      case 'offer_draw': {
        peer.publish(`game:${msg.gameId}`, JSON.stringify({ type: 'draw_offered', by: pd.username }))
        break
      }

      case 'accept_draw': {
        const gameId = msg.gameId!
        const room = getGameRoom(gameId)
        if (!room) return
        const payload = JSON.stringify({ type: 'game_over', gameId, result: '1/2-1/2', reason: 'agreement' })
        peer.publish(`game:${gameId}`, payload)
        peer.send(payload)
        room.status = 'completed'
        try {
          await db.update(games).set({
            status: 'completed', result: '1/2-1/2', endedAt: new Date(),
            pgn: generatePgn(room.moveList.map((m: GameMove) => m.san)),
            whiteTimeMs: room.whiteTime, blackTimeMs: room.blackTime, lastMoveAt: new Date(room.lastMoveAt),
          }).where(eq(games.id, Number(gameId)))
        } catch (e) { console.error('[WS] Failed to save draw:', e) }
        await updateRatings(room.whitePlayerId, room.blackPlayerId, '1/2-1/2')
        break
      }

      case 'offer_rematch': {
        const gameId = msg.gameId!
        const room = getGameRoom(gameId)
        if (!room) return
        if (room.status !== 'completed' && room.status !== 'abandoned') return
        if (room.whitePlayerId !== userId && room.blackPlayerId !== userId) return
        if (room.rematchOfferedBy !== null) {
          peer.send(JSON.stringify({ type: 'error', message: 'Rematch offer already pending' }))
          return
        }
        if (room.rematchAccepted) return
        room.rematchOfferedBy = userId
        peer.publish(`game:${gameId}`, JSON.stringify({ type: 'rematch_offered', by: pd.username }))
        break
      }

      case 'accept_rematch': {
        const gameId = msg.gameId!
        const room = getGameRoom(gameId)
        if (!room) return
        if (room.status !== 'completed' && room.status !== 'abandoned') return
        if (room.whitePlayerId !== userId && room.blackPlayerId !== userId) return
        if (room.rematchOfferedBy === null || room.rematchOfferedBy === userId) {
          peer.send(JSON.stringify({ type: 'error', message: 'No rematch offer to accept' }))
          return
        }
        if (room.rematchAccepted) {
          peer.send(JSON.stringify({ type: 'error', message: 'Rematch already accepted' }))
          return
        }
        room.rematchAccepted = true

        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        let inviteCode = ''
        for (let i = 0; i < 6; i++) inviteCode += chars[Math.floor(Math.random() * chars.length)]

        const newWhite = room.blackPlayerId
        const newBlack = room.whitePlayerId
        const defaultFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

        const tcStr = (room.timeControl.base / 60000) + '+' + (room.timeControl.increment / 1000)

        const newGame = await db.insert(games).values({
          whitePlayerId: newWhite,
          blackPlayerId: newBlack,
          fen: defaultFen,
          timeControl: tcStr,
          status: 'active',
          inviteCode,
        }).returning().then(r => r[0])

        if (!newGame) {
          peer.send(JSON.stringify({ type: 'error', message: 'Failed to create rematch' }))
          room.rematchAccepted = false
          room.rematchOfferedBy = null
          break
        }

        const newRoom = createGameRoom(String(newGame.id), tcStr)
        newRoom.whitePlayerId = newWhite
        newRoom.blackPlayerId = newBlack
        newRoom.status = 'active'

        const payload = JSON.stringify({ type: 'rematch_accepted', gameId, newGameId: String(newGame.id) })
        peer.publish(`game:${gameId}`, payload)
        peer.send(payload)
        break
      }

      case 'decline_rematch': {
        const gameId = msg.gameId!
        const room = getGameRoom(gameId)
        if (room) {
          room.rematchOfferedBy = null
          room.rematchAccepted = false
        }
        peer.publish(`game:${gameId}`, JSON.stringify({ type: 'rematch_declined' }))
        break
      }

      case 'chat': {
        const gameId = msg.gameId!
        const raw = msg.message
        if (!raw || typeof raw !== 'string') break
        const sanitized = raw.slice(0, 500).replace(/</g, '&lt;').replace(/>/g, '&gt;')
        try {
          await db.insert(chatMessages).values({
            gameId: Number(gameId),
            userId,
            username: pd.username,
            message: sanitized,
          })
        } catch (e) { console.error('[WS] Failed to save chat message:', e) }
        peer.publish(`game:${gameId}`, JSON.stringify({ type: 'chat', from: pd.username, message: sanitized }))
        break
      }

      case 'game_invite': {
        const toUserId = msg.toUserId!
        const gameId = msg.gameId!
        const inviteCode = msg.inviteCode!
        const inviter = await db.select({ id: users.id, username: users.username, rating: users.rating, avatar: users.avatar })
          .from(users).where(eq(users.id, userId)).then(r => r[0] as UserInfo | undefined)
        if (!inviter) return
        const delivered = sendToUser(toUserId, { type: 'game_invite', from: inviter, gameId, inviteCode })
        if (!delivered) {
          peer.send(JSON.stringify({ type: 'error', message: 'User is offline' }))
        }
        break
      }

      case 'leave_game': {
        const gameId = msg.gameId!
        const room = getGameRoom(gameId)
        if (room) {
          room.peers.delete(userId)
          if (room.status === 'active') {
            broadcastToRoom(room, JSON.stringify({ type: 'opponent_disconnected', gameId }), userId)
          }
        }
        peer.unsubscribe(`game:${gameId}`)
        delete pd.gameId
        break
      }
    }
  },

  async close(peer) {
    const pd = ((peer as unknown as { data?: PeerData }).data ?? {}) as PeerData
    const gameId = pd?.gameId
    const userId = pd?.userId
    if (userId) {
      const wentOffline = unregisterPeer(userId, peer)
      if (wentOffline) {
        const friendIds = await getFriendIds(userId)
        broadcastToUsers(friendIds, { type: 'user_offline', userId })
      }
    }
    if (gameId) {
      const room = getGameRoom(gameId)
      if (room && room.peers.has(userId)) {
        room.peers.delete(userId)
        if (room.status === 'active') {
          peer.publish(`game:${gameId}`, JSON.stringify({ type: 'opponent_disconnected', gameId }))
        }
      }
      peer.unsubscribe(`game:${gameId}`)
    }
  },
})
