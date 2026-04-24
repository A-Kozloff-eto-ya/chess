<template>
  <div v-if="gameData && colorReady" ref="gameContainer" class="flex h-full gap-4 lg:flex-row">
    <div class="flex flex-1 flex-col items-center gap-2 min-w-0 min-h-0">
      <div class="flex w-full items-center justify-between" :style="{ maxWidth: boardSize + 'px' }">
        <div class="flex items-center gap-2">
          <div class="relative">
            <UAvatar :src="opponentInfo?.avatar || undefined" size="sm" />
            <span v-if="opponentInfo && isOnline(opponentInfo.id)" class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-gray-900 bg-green-500" />
            <span v-else-if="opponentInfo && getStatus(opponentInfo.id)?.online === false" class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-gray-900 bg-gray-500" />
          </div>
          <div>
            <p class="font-semibold">{{ opponentInfo?.username || (isWaiting ? $t('waitingForOpponent') : $t('opponent')) }}</p>
            <p class="text-sm text-gray-400">{{ opponentInfo?.rating || '???' }}</p>
          </div>
        </div>
        <div v-if="!isWaiting" class="font-mono text-lg" :class="opponentTimeClass" role="timer" :aria-label="`Opponent time: ${formatTime(opponentTime)}`">
          {{ formatTime(opponentTime) }}
        </div>
      </div>

      <div class="board-area flex w-full gap-2" :style="{ maxWidth: (boardSize + 36) + 'px', height: boardSize + 'px' }">
        <GameEvaluationBar
          :evaluation="evaluation"
          :flipped="playerColor === 'black'"
        />
        <div class="flex-1 min-w-0 min-h-0">
          <ClientOnly>
            <TheChessboard
              :board-config="boardConfig"
              :player-color="playerColor"
              :reactive-config="true"
              @board-created="onBoardCreated"
              @move="onBoardMove"
            />
          </ClientOnly>
        </div>
      </div>

      <div class="flex w-full items-center justify-between" :style="{ maxWidth: boardSize + 'px' }">
        <div class="flex items-center gap-2">
          <div class="relative">
            <UAvatar :src="playerInfo?.avatar || undefined" size="sm" />
            <span v-if="playerInfo && isOnline(playerInfo.id)" class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-gray-900 bg-green-500" />
            <span v-else-if="playerInfo && getStatus(playerInfo.id)?.online === false" class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-gray-900 bg-gray-500" />
          </div>
          <div>
            <p class="font-semibold">{{ playerInfo?.username || $t('you') }}</p>
            <p class="text-sm text-gray-400">{{ playerInfo?.rating || '???' }}</p>
          </div>
        </div>
        <div v-if="!isWaiting" class="font-mono text-lg" :class="playerTimeClass" role="timer" :aria-label="`Your time: ${formatTime(playerTime)}`">
          {{ formatTime(playerTime) }}
        </div>
      </div>
    </div>

    <div class="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
      <div v-if="isWaiting" class="rounded-lg border border-dashed border-gray-600 p-6 text-center">
        <UIcon name="i-lucide-loader-2" class="mx-auto mb-3 size-8 animate-spin text-gray-400" />
        <p class="font-semibold">{{ $t('waitingForOpponentTitle') }}</p>
        <p class="mt-2 text-sm text-gray-400">{{ $t('shareThisCode') }}</p>
        <div class="mt-2 flex items-center justify-center gap-2">
          <code class="rounded bg-gray-800 px-3 py-1.5 text-xl font-bold tracking-widest text-amber-400">{{ inviteCode }}</code>
          <UButton icon="i-lucide-copy" size="sm" variant="ghost" aria-label="Copy invite code" @click="copyInviteCode" />
        </div>
        <p class="mt-3 text-xs text-gray-500">{{ $t('orInviteFriend') }}</p>
        <UButton :label="$t('inviteFriend')" icon="i-lucide-user-plus" variant="outline" size="sm" class="mt-2" @click="showInviteModal = true" />
      </div>

      <div v-if="!isWaiting && !gameOver" class="text-center text-sm font-medium" :class="isMyTurn ? 'text-green-400' : 'text-gray-400'" role="status">
        {{ isMyTurn ? $t('yourTurn') : $t('opponentsTurn') }}
      </div>

      <GameMoveHistory :moves="moves" />
      <GameChat v-if="!isWaiting" :messages="chatMessages" :disabled="gameOver" @send="sendChatMessage" />
      <GameControls
        v-if="!isWaiting"
        :can-abort="canAbort"
        :disabled="gameOver"
        @resign="doResign"
        @abort="doAbort"
        @offer-draw="doOfferDraw"
      />
      <div v-if="gameOver" class="rounded-lg bg-gray-800 p-4 text-center" role="alert">
        <p class="text-lg font-bold">{{ gameOverText }}</p>
        <div class="mt-3 flex flex-col gap-2">
          <UButton :label="$t('analyzeGame')" icon="i-lucide-microscope" color="neutral" variant="outline" class="w-full" @click="navigateTo(`/analyze/${gameId}`)" />
          <div v-if="!rematchOfferSent && !rematchOfferReceived && !rematchDeclined" class="flex gap-2">
            <UButton :label="$t('rematch')" icon="i-lucide-refresh-cw" class="flex-1" @click="offerRematch" />
            <UButton :label="$t('newGame')" variant="outline" class="flex-1" @click="navigateTo('/')" />
          </div>
          <div v-if="rematchOfferSent && !rematchDeclined" class="text-sm text-gray-400">
            <UIcon name="i-lucide-loader-2" class="mr-1 inline-block animate-spin" />
            {{ $t('rematchOffered') }}
          </div>
          <div v-if="rematchDeclined" class="text-sm text-red-400">
            {{ $t('rematchDeclined') }}
          </div>
          <div v-if="rematchOfferReceived" class="flex flex-col gap-2">
            <p class="text-sm text-amber-400">{{ $t('opponentWantsRematch') }}</p>
            <div class="flex gap-2">
              <UButton :label="$t('accept')" color="success" class="flex-1" @click="acceptRematch" />
              <UButton :label="$t('decline')" variant="outline" class="flex-1" @click="declineRematch" />
            </div>
          </div>
          <UButton v-if="rematchOfferSent || rematchDeclined" :label="$t('newGame')" variant="outline" class="w-full" @click="navigateTo('/')" />
        </div>
      </div>
    </div>

    <GameInviteModal v-model:open="showInviteModal" :game-id="String(gameId)" :invite-code="inviteCode" />
  </div>

  <div v-else class="flex items-center justify-center py-20">
    <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'game' })
import { TheChessboard } from 'vue3-chessboard'
import 'vue3-chessboard/style.css'

const route = useRoute()
const gameId = route.params.id as string
const { t } = useI18n()
const toast = useToast()
const showInviteModal = ref(false)
const { isOnline, getStatus, fetchOnlineStatus } = useOnlineUsers()

const gameContainer = ref<HTMLElement | null>(null)
const { boardSize } = useBoardSize(gameContainer)

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
  sendChatMessage,
  formatTime,
  onBoardCreated,
  onBoardMove,
  evaluation,
} = useGameSession(gameId)

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
.board-area :deep(.main-wrap) {
  width: 100%;
  height: 100%;
  margin: 0;
}
.board-area :deep(.main-board) {
  position: relative;
  height: 100%;
  padding-bottom: 0;
  width: auto;
  aspect-ratio: 1;
}
.board-area :deep(.cg-wrap) {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
