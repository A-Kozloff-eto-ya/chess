import type { ServerMessage, ClientMessage } from '~/types'
import { useSharedWebSocket } from './useSharedWebSocket'

export function useChessWebSocket() {
  const { isConnected, initOnce, send, onMessage } = useSharedWebSocket()

  const joinGame = (gameId: string) => send({ type: 'join', gameId })
  const spectateGame = (gameId: string) => send({ type: 'spectate', gameId })
  const sendMove = (gameId: string, move: { from: string; to: string; promotion?: string }) =>
    send({ type: 'move', gameId, move })
  const resign = (gameId: string) => send({ type: 'resign', gameId })
  const abortGame = (gameId: string) => send({ type: 'abort', gameId })
  const offerDraw = (gameId: string) => send({ type: 'offer_draw', gameId })
  const acceptDraw = (gameId: string) => send({ type: 'accept_draw', gameId })
  const offerRematch = (gameId: string) => send({ type: 'offer_rematch', gameId })
  const acceptRematch = (gameId: string) => send({ type: 'accept_rematch', gameId })
  const declineRematch = (gameId: string) => send({ type: 'decline_rematch', gameId })
  const sendChat = (gameId: string, message: string) => send({ type: 'chat', gameId, message })
  const leaveGame = (gameId: string) => send({ type: 'leave_game', gameId })

  onMounted(() => initOnce())

  return {
    isConnected,
    connect: initOnce,
    disconnect: () => {},
    send,
    onMessage,
    joinGame,
    spectateGame,
    sendMove,
    resign,
    abortGame,
    offerDraw,
    acceptDraw,
    offerRematch,
    acceptRematch,
    declineRematch,
    sendChat,
    leaveGame,
  }
}
