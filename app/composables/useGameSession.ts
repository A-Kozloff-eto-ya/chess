import type { ServerMessage } from '~/types'
import type { BoardApi } from 'vue3-chessboard'
import { parseTimeControl } from '~/../shared/constants'

export interface GameResponse {
  id: number
  whitePlayerId: number | null
  blackPlayerId: number | null
  yourColor: 'white' | 'black'
  inviteCode: string
  result: string | null
  timeControl: string
  whitePlayer?: { id: number; username: string; rating: number; avatar: string | null }
  blackPlayer?: { id: number; username: string; rating: number; avatar: string | null }
}

export function useGameSession(gameId: string) {
  const { user, fetch: fetchSession } = useUserSession()
  const { t } = useI18n()
  const toast = useToast()
  const { joinGame, sendMove, resign, offerDraw, acceptDraw, abortGame, offerRematch, acceptRematch, declineRematch, sendChat, leaveGame, onMessage } = useChessWebSocket()
  const { whiteTime, blackTime, formatTime, startTimer, stopTimer, resetClock } = useChessClock()
  const sounds = useSounds()

  const gameData = ref<GameResponse | null>(null)
  const colorReady = ref(false)
  const playerColor = ref<'white' | 'black'>('white')
  const moves = ref<string[]>([])
  const gameOver = ref(false)
  const isWaiting = ref(true)
  const inviteCode = ref('')

  const boardApi = ref<InstanceType<typeof BoardApi> | null>(null)
  const serverMoveCount = ref(0)
  let pendingLocalMove = false
  let applyingRemoteMove = false

  const playerTime = computed(() => playerColor.value === 'white' ? whiteTime.value : blackTime.value)
  const opponentTime = computed(() => playerColor.value === 'white' ? blackTime.value : whiteTime.value)

  const isMyTurn = computed(() => {
    if (isWaiting.value || gameOver.value) return false
    const turn = serverMoveCount.value % 2 === 0 ? 'white' : 'black'
    return turn === playerColor.value
  })

  const canAbort = computed(() => !gameOver.value && !isWaiting.value && moves.value.length === 0)

  const boardConfig = reactive({
    orientation: 'white' as 'white' | 'black',
    viewOnly: true,
  })

  watch([isWaiting, gameOver], () => {
    boardConfig.viewOnly = isWaiting.value || gameOver.value
  })

  const playerInfo = computed(() => {
    if (!gameData.value || !user.value) return null
    return playerColor.value === 'white' ? gameData.value.whitePlayer : gameData.value.blackPlayer
  })

  const opponentInfo = computed(() => {
    if (!gameData.value) return null
    return playerColor.value === 'white' ? gameData.value.blackPlayer : gameData.value.whitePlayer
  })

  const playerTimeClass = computed(() => {
    if (playerTime.value <= 10000) return 'text-red-400'
    if (playerTime.value <= 30000) return 'text-yellow-400'
    return 'text-white'
  })

  const opponentTimeClass = computed(() => {
    if (opponentTime.value <= 10000) return 'text-red-400'
    if (opponentTime.value <= 30000) return 'text-yellow-400'
    return 'text-white'
  })

  const gameOverText = computed(() => {
    if (!gameData.value?.result) return t('gameOver')
    switch (gameData.value.result) {
      case '1-0': return t('whiteWins')
      case '0-1': return t('blackWins')
      case '1/2-1/2': return t('drawGame')
      case '*': return t('gameAborted')
      default: return t('gameOver')
    }
  })

  const rematchOfferSent = ref(false)
  const rematchOfferReceived = ref(false)
  const rematchDeclined = ref(false)

  const chatMessages = ref<{ from: string; message: string; mine: boolean }[]>([])

  const evaluation = ref<{ type: 'cp' | 'mate'; value: number } | null>(null)
  const evalMoves = ref<string[]>([])
  let evalPending = false

  const fetchEval = async () => {
    if (evalPending || gameOver.value || isWaiting.value) return
    if (evalMoves.value.length === 0) {
      evaluation.value = null
      return
    }
    evalPending = true
    try {
      const res = await $fetch<{ eval: { type: 'cp' | 'mate'; value: number } | null }>('/api/engine/eval', {
        method: 'POST',
        body: { sanMoves: evalMoves.value.join(' '), movetime: 500 },
      })
      evaluation.value = res.eval
    } catch {
      // silently ignore eval errors
    } finally {
      evalPending = false
    }
  }

  const pushEvalMove = (san: string) => {
    evalMoves.value.push(san)
    fetchEval()
  }
  const fetchGame = async () => {
    try {
      const data = await $fetch<GameResponse>(`/api/games/${gameId}`)
      playerColor.value = data.yourColor || 'white'
      boardConfig.orientation = data.yourColor
      colorReady.value = true
      gameData.value = data
      if (data.whitePlayerId && data.blackPlayerId) {
        isWaiting.value = false
      }
      inviteCode.value = data.inviteCode || ''
      const tc = parseTimeControl(data.timeControl || '10+0')
      resetClock(tc.base)
    } catch {
      toast.add({ title: t('gameNotFound'), color: 'error' })
      navigateTo('/')
    }
  }

  const onBoardCreated = (api: InstanceType<typeof BoardApi>) => {
    boardApi.value = api
  }

  const onBoardMove = (move: { from: string; to: string; promotion?: string; san: string; captured?: string }) => {
    if (applyingRemoteMove) return
    if (gameOver.value || isWaiting.value) return
    pendingLocalMove = true
    if (move.captured) {
      sounds.capture()
    } else {
      sounds.move()
    }
    sendMove(gameId, { from: move.from, to: move.to, promotion: move.promotion })
  }

  const activeTurn = () => serverMoveCount.value % 2 === 0 ? 'white' : 'black'

  onMounted(async () => {
    await fetchGame()
    joinGame(gameId)
  })

  const offMessage = onMessage((msg: ServerMessage) => {
    switch (msg.type) {
      case 'joined':
        if (msg.opponent) {
          isWaiting.value = false
        }
        if (msg.whiteTime != null) whiteTime.value = msg.whiteTime
        if (msg.blackTime != null) blackTime.value = msg.blackTime
        if (msg.moveCount) serverMoveCount.value = msg.moveCount
        startTimer(activeTurn)
        if (msg.chatHistory?.length) {
          const myId = user.value?.id
          chatMessages.value = msg.chatHistory.map(m => ({
            from: m.from,
            message: m.message,
            mine: m.userId === myId,
          }))
        }
        break

      case 'opponent_joined':
        isWaiting.value = false
        if (playerColor.value === 'white') {
          gameData.value = { ...gameData.value!, blackPlayer: msg.opponent }
        } else {
          gameData.value = { ...gameData.value!, whitePlayer: msg.opponent }
        }
        startTimer(activeTurn)
        toast.add({ title: t('joinedGame', { username: msg.opponent.username }), color: 'success' })
        break

      case 'state_update':
        if (msg.moveCount > serverMoveCount.value) {
          serverMoveCount.value = msg.moveCount
          if (msg.lastMove) {
            moves.value.push(msg.lastMove.san)
            pushEvalMove(msg.lastMove.san)
          }

          if (pendingLocalMove) {
            pendingLocalMove = false
          } else if (msg.lastMove && boardApi.value) {
            if (msg.lastMove.captured) {
              sounds.capture()
            } else {
              sounds.move()
            }
            applyingRemoteMove = true
            boardApi.value.move({
              from: msg.lastMove.from,
              to: msg.lastMove.to,
              promotion: msg.lastMove.promotion,
            })
            nextTick(() => { applyingRemoteMove = false })
          }
        }

        whiteTime.value = msg.whiteTime
        blackTime.value = msg.blackTime
        break

      case 'move_rejected':
        pendingLocalMove = false
        if (boardApi.value?.undoLastMove) {
          boardApi.value.undoLastMove()
        }
        toast.add({ title: msg.reason, color: 'error' })
        break

      case 'game_over':
        gameOver.value = true
        gameData.value = { ...gameData.value!, result: msg.result }
        if (msg.reason === 'abort') {
          gameData.value = { ...gameData.value!, result: '*' }
        }
        stopTimer()
        if (msg.result === '1-0' || msg.result === '0-1') {
          sounds.checkmate()
        }
        fetchSession()
        break

      case 'draw_offered':
        toast.add({ title: t('drawOfferedBy', { username: msg.by }), color: 'info', actions: [{
          label: t('accept'),
          onClick: () => acceptDraw(gameId),
        }]})
        break

      case 'opponent_disconnected':
        toast.add({ title: t('opponentDisconnected'), color: 'warning' })
        break

      case 'rematch_offered':
        rematchOfferReceived.value = true
        rematchDeclined.value = false
        break

      case 'rematch_accepted':
        navigateTo(`/play/${msg.newGameId}`)
        break

      case 'rematch_declined':
        rematchOfferSent.value = false
        rematchDeclined.value = true
        break

      case 'chat':
        chatMessages.value.push({ from: msg.from, message: msg.message, mine: false })
        break

      case 'clock_sync':
        whiteTime.value = msg.whiteTime
        blackTime.value = msg.blackTime
        break
    }
  })

  onUnmounted(() => {
    stopTimer()
    leaveGame(gameId)
    offMessage()
  })

  return {
    gameData,
    colorReady,
    playerColor,
    moves,
    gameOver,
    isWaiting,
    inviteCode,
    boardApi,
    boardConfig,
    playerTime,
    opponentTime,
    isMyTurn,
    canAbort,
    playerInfo,
    opponentInfo,
    playerTimeClass,
    opponentTimeClass,
    gameOverText,
    rematchOfferSent,
    rematchOfferReceived,
    rematchDeclined,
    offerRematch: () => { rematchOfferSent.value = true; offerRematch(gameId) },
    acceptRematch: () => acceptRematch(gameId),
    declineRematch: () => { rematchOfferReceived.value = false; declineRematch(gameId) },
    chatMessages,
    sendChatMessage: (message: string) => {
      chatMessages.value.push({ from: 'you', message, mine: true })
      sendChat(gameId, message)
    },
    doResign: () => resign(gameId),
    doAbort: () => abortGame(gameId),
    doOfferDraw: () => offerDraw(gameId),
    formatTime,
    onBoardCreated,
    onBoardMove,
    evaluation,
  }
}
