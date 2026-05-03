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
  const { joinGame, sendMove, resign, offerDraw, acceptDraw, abortGame, offerRematch, acceptRematch, declineRematch, sendChat, leaveGame, on } = useChessWebSocket()
  const { whiteTime, blackTime, formatTime, startTimer, stopTimer, resetClock } = useChessClock()
  const sounds = useSounds()

  const gameData = ref<GameResponse | null>(null)
  const colorReady = ref(false)
  const playerColor = ref<'white' | 'black'>('white')
  const moves = ref<string[]>([])
  const gameOver = ref(false)
  const isWaiting = ref(true)
  const inviteCode = ref('')

  const opponentDisconnected = ref(false)
  const disconnectCountdown = ref(0)
  let disconnectInterval: ReturnType<typeof setInterval> | null = null

  const startDisconnectCountdown = () => {
    stopDisconnectCountdown()
    disconnectCountdown.value = 60
    opponentDisconnected.value = true
    disconnectInterval = setInterval(() => {
      disconnectCountdown.value--
      if (disconnectCountdown.value <= 0) {
        stopDisconnectCountdown()
      }
    }, 1000)
  }

  const stopDisconnectCountdown = () => {
    opponentDisconnected.value = false
    disconnectCountdown.value = 0
    if (disconnectInterval) {
      clearInterval(disconnectInterval)
      disconnectInterval = null
    }
  }

  const boardApi = ref<ReturnType<typeof useChessground> | null>(null)
  const pendingFen = ref<string | null>(null)
  const serverMoveCount = ref(0)
  let pendingLocalMove = false
  let applyingRemoteMove = false

  const executePremove = () => {
    if (!boardApi.value || gameOver.value || isWaiting.value) return

    const turn = boardApi.value.getTurnColor()
    const myTurn = playerColor.value === 'white' ? 'w' : 'b'
    if (turn !== myTurn) return

    const result = boardApi.value.tryPlayPremove()
    if (!result) return

    pendingLocalMove = true
    sendMove(gameId, { from: result.from, to: result.to, promotion: result.promotion })
    if (result.captured) {
      sounds.capture()
    } else {
      sounds.move()
    }
  }

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
    viewOnly: false,
    premovable: { enabled: true },
    movableColor: 'white' as 'white' | 'black' | 'both' | undefined,
    movableEnabled: true,
  })

  watch([isWaiting, gameOver, playerColor], () => {
    boardConfig.movableColor = playerColor.value
    boardConfig.movableEnabled = !isWaiting.value && !gameOver.value
  }, { immediate: true })

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
      const status = (data as any).status
      if (data.result || status === 'completed' || status === 'abandoned') {
        gameOver.value = true
      }
      const tc = parseTimeControl(data.timeControl || '10+0')
      resetClock(tc.base)
    } catch {
      toast.add({ title: t('gameNotFound'), color: 'error' })
      navigateTo('/')
    }
  }

  const onBoardCreated = (api: ReturnType<typeof useChessground>) => {
    boardApi.value = api
    if (pendingFen.value) {
      api.setPosition(pendingFen.value)
      pendingFen.value = null
    }
  }

  const onBoardMove = (move: { from: string; to: string; promotion?: string; san: string; captured?: string }) => {
    if (applyingRemoteMove) return
    if (gameOver.value) return
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

  const cleanups: (() => void)[] = []

  cleanups.push(on('joined', (msg: any) => {
    if (msg.opponent) {
      isWaiting.value = false
    }
    if (msg.whiteTime != null) whiteTime.value = msg.whiteTime
    if (msg.blackTime != null) blackTime.value = msg.blackTime
    if (typeof msg.moveCount === 'number') serverMoveCount.value = msg.moveCount
    if (msg.fen) {
      if (boardApi.value) {
        boardApi.value.setPosition(msg.fen)
      } else {
        pendingFen.value = msg.fen
      }
    }
    if (Array.isArray(msg.moves) && msg.moves.length > 0) {
      moves.value = msg.moves
    }
    if (!isWaiting.value && !gameOver.value) {
      if (msg.lastMoveAt && typeof msg.moveCount === 'number' && msg.moveCount > 0) {
        const elapsed = Date.now() - msg.lastMoveAt
        const turn = msg.moveCount % 2 === 0 ? 'white' : 'black'
        if (turn === 'white' && whiteTime.value > 0) {
          whiteTime.value = Math.max(0, whiteTime.value - elapsed)
        } else if (turn === 'black' && blackTime.value > 0) {
          blackTime.value = Math.max(0, blackTime.value - elapsed)
        }
      }
      startTimer(activeTurn)
    }
    if (msg.chatHistory?.length) {
      const myId = user.value?.id
      chatMessages.value = msg.chatHistory.map((m: any) => ({
        from: m.from,
        message: m.message,
        mine: m.userId === myId,
      }))
    }
    if (msg.rematchOfferedBy && msg.rematchOfferedBy !== user.value?.id) {
      rematchOfferReceived.value = true
    }
  }))

  cleanups.push(on('opponent_joined', (msg: any) => {
    isWaiting.value = false
    stopDisconnectCountdown()
    if (playerColor.value === 'white') {
      gameData.value = { ...gameData.value!, blackPlayer: msg.opponent }
    } else {
      gameData.value = { ...gameData.value!, whitePlayer: msg.opponent }
    }
    if (!gameOver.value) {
      startTimer(activeTurn)
    }
    toast.add({ title: t('joinedGame', { username: msg.opponent.username }), color: 'success' })

    if (!gameOver.value && boardApi.value && playerColor.value === 'white') {
      nextTick(() => executePremove())
    }
  }))

  cleanups.push(on('state_update', (msg: any) => {
    if (msg.moveCount > serverMoveCount.value) {
      serverMoveCount.value = msg.moveCount
      if (msg.lastMove) {
        moves.value.push(msg.lastMove.san)
      }

      if (pendingLocalMove) {
        pendingLocalMove = false
      } else if (msg.lastMove && boardApi.value) {
        boardApi.value.preservePremove()
        if (msg.lastMove.captured) {
          sounds.capture()
        } else {
          sounds.move()
        }
        applyingRemoteMove = true
        boardApi.value.move(
          msg.lastMove.from,
          msg.lastMove.to,
          msg.lastMove.promotion,
        )
        nextTick(() => {
          applyingRemoteMove = false
          executePremove()
        })
      }
    }

    whiteTime.value = msg.whiteTime
    blackTime.value = msg.blackTime
  }))

  cleanups.push(on('move_rejected', (msg: any) => {
    pendingLocalMove = false
    if (boardApi.value?.undoLastMove) {
      boardApi.value.undoLastMove()
    }
    toast.add({ title: msg.reason, color: 'error' })
  }))

  cleanups.push(on('game_over', (msg: any) => {
    gameOver.value = true
    stopDisconnectCountdown()
    gameData.value = { ...gameData.value!, result: msg.result }
    if (msg.reason === 'abort') {
      gameData.value = { ...gameData.value!, result: '*' }
    }
    stopTimer()
    if (msg.result === '1-0' || msg.result === '0-1') {
      sounds.checkmate()
    }
    fetchSession()
  }))

  cleanups.push(on('draw_offered', (msg: any) => {
    toast.add({ title: t('drawOfferedBy', { username: msg.by }), color: 'info', actions: [{
      label: t('accept'),
      onClick: () => acceptDraw(gameId),
    }]})
  }))

  cleanups.push(on('opponent_disconnected', () => {
    toast.add({ title: t('opponentDisconnected'), color: 'warning' })
    startDisconnectCountdown()
  }))

  cleanups.push(on('rematch_offered', () => {
    rematchOfferReceived.value = true
    rematchDeclined.value = false
  }))

  cleanups.push(on('rematch_accepted', (msg: any) => {
    navigateTo(`/play/${msg.newGameId}`)
  }))

  cleanups.push(on('rematch_declined', () => {
    rematchOfferSent.value = false
    rematchDeclined.value = true
  }))

  cleanups.push(on('chat', (msg: any) => {
    chatMessages.value.push({ from: msg.from, message: msg.message, mine: false })
  }))

  cleanups.push(on('clock_sync', (msg: any) => {
    whiteTime.value = msg.whiteTime
    blackTime.value = msg.blackTime
  }))

  onUnmounted(() => {
    stopTimer()
    stopDisconnectCountdown()
    leaveGame(gameId)
    for (const cleanup of cleanups) cleanup()
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
    opponentDisconnected,
    disconnectCountdown,
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
  }
}
