<template>
  <div v-if="gameData && colorReady" ref="gameContainer" class="flex h-full flex-col lg:h-full lg:flex-row lg:gap-4 lg:max-w-7xl lg:mx-auto">
    <div class="flex flex-1 flex-col items-center gap-1 min-w-0 min-h-0 lg:gap-2">
      <div class="flex w-full items-center justify-between px-2 lg:px-0" :style="{ maxWidth: boardSize + 'px' }">
        <div class="flex items-center gap-2">
          <div class="relative">
            <UAvatar :src="resolveAvatar(opponentInfo?.avatar)" size="sm" />
            <span v-if="opponentInfo && isOnline(opponentInfo.id)" class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-default bg-success" />
            <span v-else-if="opponentInfo && getStatus(opponentInfo.id)?.online === false" class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-default bg-error" />
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold lg:text-base">{{ opponentInfo?.username || (isWaiting ? $t('waitingForOpponent') : $t('opponent')) }}</p>
            <p class="text-xs text-muted lg:text-sm">
              <span v-if="opponentDisconnected && disconnectCountdown > 0" class="text-warning">{{ disconnectCountdown }}s</span>
              <span v-else>{{ opponentInfo?.rating || '???' }}</span>
            </p>
          </div>
          <GameCapturedPieces :captured="opponentCaptured" :color="playerColor === 'white' ? 'black' : 'white'" :material-diff="captured.materialDiff" />
        </div>
        <div v-if="!isWaiting" class="font-mono text-xl lg:text-lg" :class="opponentTimeClass" role="timer" :aria-label="`Opponent time: ${formatTime(opponentTime)}`">
          {{ formatTime(opponentTime) }}
        </div>
      </div>

      <div class="board-area w-full" :style="{ maxWidth: boardSize + 'px', height: boardSize + 'px' }">
          <ClientOnly>
            <ChessBoard
              :board-config="boardConfig"
              :player-color="playerColor"
              :reactive-config="true"
              :board-theme="settings.boardTheme"
              :piece-theme="settings.pieceTheme"
              @board-created="handleBoardCreated"
              @move="handleBoardMove"
            />
          </ClientOnly>
      </div>

      <div class="flex w-full items-center justify-between px-2 lg:px-0" :style="{ maxWidth: boardSize + 'px' }">
        <div class="flex items-center gap-2">
          <div class="relative">
            <UAvatar :src="resolveAvatar(playerInfo?.avatar)" size="sm" />
            <span v-if="playerInfo && isOnline(playerInfo.id)" class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-default bg-success" />
            <span v-else-if="playerInfo && getStatus(playerInfo.id)?.online === false" class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-default bg-error" />
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold lg:text-base">{{ playerInfo?.username || $t('you') }}</p>
            <p class="text-xs text-muted lg:text-sm">{{ playerInfo?.rating || '???' }}</p>
          </div>
          <GameCapturedPieces :captured="playerCaptured" :color="playerColor" :material-diff="captured.materialDiff" />
        </div>
        <div v-if="!isWaiting" class="font-mono text-xl lg:text-lg" :class="playerTimeClass" role="timer" :aria-label="`Your time: ${formatTime(playerTime)}`">
          {{ formatTime(playerTime) }}
        </div>
      </div>
    </div>

    <GameDesktopSidebar
      v-if="!isMobile"
      :is-waiting="isWaiting"
      :game-over="gameOver"
      :can-abort="canAbort"
      :moves="moves"
      :chat-messages="chatMessages"
      :invite-code="inviteCode"
      :is-my-turn="isMyTurn"
      :game-over-text="gameOverText"
      :rematch-offer-sent="rematchOfferSent"
      :rematch-offer-received="rematchOfferReceived"
      :rematch-declined="rematchDeclined"
      :game-id="gameId"
      @resign="doResign"
      @abort="doAbort"
      @offer-draw="doOfferDraw"
      @send="sendChatMessage"
      @offer-rematch="offerRematch"
      @accept-rematch="acceptRematch"
      @decline-rematch="declineRematch"
      @show-invite="showInviteModal = true"
      @copy-invite="copyInviteCode"
    />

    <div class="mt-2 lg:hidden">
      <div v-if="isWaiting" class="rounded-lg border border-dashed border-default p-4 text-center">
        <UIcon name="i-lucide-loader-2" class="mx-auto mb-2 size-6 animate-spin text-muted" />
        <p class="text-sm font-semibold">{{ $t('waitingForOpponentTitle') }}</p>
        <div class="mt-2 flex items-center justify-center gap-2">
          <code class="rounded bg-elevated px-2 py-1 text-lg font-bold tracking-widest text-primary">{{ inviteCode }}</code>
          <UButton icon="i-lucide-copy" size="sm" variant="ghost" @click="copyInviteCode" />
        </div>
        <UButton :label="$t('inviteFriend')" icon="i-lucide-user-plus" variant="outline" size="sm" class="mt-2" @click="showInviteModal = true" />
      </div>

      <div v-else-if="gameOver" class="rounded-lg bg-elevated p-3 text-center">
        <p class="text-base font-bold">{{ gameOverText }}</p>
        <div class="mt-2 flex flex-col gap-2">
          <UButton :label="$t('analyzeGame')" icon="i-lucide-microscope" color="neutral" variant="outline" size="sm" class="w-full" @click="navigateTo(`/analyze/${gameId}`)" />
          <div v-if="!rematchOfferSent && !rematchOfferReceived && !rematchDeclined" class="flex gap-2">
            <UButton :label="$t('rematch')" icon="i-lucide-refresh-cw" size="sm" class="flex-1" @click="offerRematch" />
            <UButton :label="$t('newGame')" size="sm" variant="outline" class="flex-1" @click="navigateTo('/')" />
          </div>
          <div v-if="rematchOfferReceived" class="flex gap-2">
            <UButton :label="$t('accept')" size="sm" color="success" class="flex-1" @click="acceptRematch" />
            <UButton :label="$t('decline')" size="sm" variant="outline" class="flex-1" @click="declineRematch" />
          </div>
          <div v-if="rematchOfferSent && !rematchDeclined" class="text-xs text-muted">
            <UIcon name="i-lucide-loader-2" class="mr-1 inline-block animate-spin" />
            {{ $t('rematchOffered') }}
          </div>
          <div v-if="rematchDeclined" class="text-xs text-error">{{ $t('rematchDeclined') }}</div>
          <UButton v-if="rematchOfferSent || rematchDeclined" :label="$t('newGame')" size="sm" variant="outline" class="w-full" @click="navigateTo('/')" />
        </div>
      </div>

      <div v-else class="flex flex-col gap-2">
        <div class="text-center text-xs font-medium" :class="isMyTurn ? 'text-success' : 'text-muted'" role="status">
          {{ isMyTurn ? $t('yourTurn') : $t('opponentsTurn') }}
        </div>
        <GameControls
          :can-abort="canAbort"
          :disabled="gameOver"
          @resign="doResign"
          @abort="doAbort"
          @offer-draw="doOfferDraw"
        />
        <GameMobileGameTabs
          :moves="moves"
          :chat-messages="chatMessages"
          :game-over="gameOver"
          @send="sendChatMessage"
        />
      </div>
    </div>

    <GameInviteModal v-model:open="showInviteModal" :game-id="String(gameId)" :invite-code="inviteCode" />
  </div>

  <div v-else class="flex items-center justify-center py-20">
    <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'game' })

const route = useRoute()
const gameId = route.params.id as string
const { t } = useI18n()
const toast = useToast()
const showInviteModal = ref(false)
const { isOnline, getStatus, fetchOnlineStatus } = useOnlineUsers()
const { resolveAvatar } = useAvatar()
const { settings } = useSettings()

const gameContainer = ref<HTMLElement | null>(null)
const { boardSize, isMobile } = useBoardSize(gameContainer)

const {
  gameData,
  colorReady,
  moves,
  gameOver,
  isWaiting,
  inviteCode,
  boardConfig,
  playerColor,
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
  offerRematch,
  acceptRematch,
  declineRematch,
  doResign,
  doAbort,
  doOfferDraw,
  chatMessages,
  opponentDisconnected,
  disconnectCountdown,
  sendChatMessage,
  formatTime,
  onBoardCreated,
  onBoardMove,
} = useGameSession(gameId)

const localBoardApi = ref<ReturnType<typeof useChessground> | null>(null)
const currentFen = ref('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
const captured = useCapturedPieces(currentFen)

const updateFen = () => {
  if (localBoardApi.value) {
    currentFen.value = localBoardApi.value.getFen()
  }
}

const handleBoardCreated = (api: ReturnType<typeof useChessground>) => {
  localBoardApi.value = api
  onBoardCreated(api)
}

const handleBoardMove = (move: { from: string; to: string; promotion?: string; san: string; captured?: string }) => {
  onBoardMove(move)
  nextTick(updateFen)
}

watch(() => moves.value.length, () => {
  nextTick(updateFen)
})

const playerCaptured = computed(() => playerColor.value === 'white' ? captured.value.white : captured.value.black)
const opponentCaptured = computed(() => playerColor.value === 'white' ? captured.value.black : captured.value.white)

watch([playerInfo, opponentInfo], ([p, o]) => {
  const ids = [p?.id, o?.id].filter((id): id is number => id != null)
  if (ids.length) fetchOnlineStatus(ids)
}, { immediate: true })

const copyInviteCode = () => {
  navigator.clipboard.writeText(inviteCode.value)
  toast.add({ title: t('inviteCodeCopied'), color: 'success' })
}
</script>

<style scoped>
.board-area .chess-board-wrap {
  width: 100%;
  height: 100%;
}
</style>
