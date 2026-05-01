<template>
  <div class="flex h-full flex-col gap-4">
    <div v-if="isWaiting" class="rounded-lg border border-dashed border-default p-6 text-center">
      <UIcon name="i-lucide-loader-2" class="mx-auto mb-3 size-8 animate-spin text-muted" />
      <p class="font-semibold">{{ $t('waitingForOpponentTitle') }}</p>
      <p class="mt-2 text-sm text-muted">{{ $t('shareThisCode') }}</p>
      <div class="mt-2 flex items-center justify-center gap-2">
        <code class="rounded bg-elevated px-3 py-1.5 text-xl font-bold tracking-widest text-primary">{{ inviteCode }}</code>
        <UButton icon="i-lucide-copy" size="sm" variant="ghost" aria-label="Copy invite code" @click="$emit('copyInvite')" />
      </div>
      <p class="mt-3 text-xs text-muted">{{ $t('orInviteFriend') }}</p>
      <UButton :label="$t('inviteFriend')" icon="i-lucide-user-plus" variant="outline" size="sm" class="mt-2" @click="$emit('showInvite')" />
    </div>

    <div v-if="!isWaiting && !gameOver" class="text-center text-sm font-medium" :class="isMyTurn ? 'text-success' : 'text-muted'" role="status">
      {{ isMyTurn ? $t('yourTurn') : $t('opponentsTurn') }}
    </div>

    <GameMoveHistory :moves="moves" />
    <GameChat v-if="!isWaiting" :messages="chatMessages" :disabled="gameOver" @send="$emit('send', $event)" />
    <GameControls
      v-if="!isWaiting"
      :can-abort="canAbort"
      :disabled="gameOver"
      @resign="$emit('resign')"
      @abort="$emit('abort')"
      @offer-draw="$emit('offer-draw')"
    />
    <div v-if="gameOver" class="rounded-lg bg-elevated p-4 text-center" role="alert">
      <p class="text-lg font-bold">{{ gameOverText }}</p>
      <div class="mt-3 flex flex-col gap-2">
        <UButton :label="$t('analyzeGame')" icon="i-lucide-microscope" color="neutral" variant="outline" class="w-full" @click="navigateTo(`/analyze/${gameId}`)" />
        <div v-if="!rematchOfferSent && !rematchOfferReceived && !rematchDeclined" class="flex gap-2">
          <UButton :label="$t('rematch')" icon="i-lucide-refresh-cw" class="flex-1" @click="$emit('offerRematch')" />
          <UButton :label="$t('newGame')" variant="outline" class="flex-1" @click="navigateTo('/')" />
        </div>
        <div v-if="rematchOfferSent && !rematchDeclined" class="text-sm text-muted">
          <UIcon name="i-lucide-loader-2" class="mr-1 inline-block animate-spin" />
          {{ $t('rematchOffered') }}
        </div>
        <div v-if="rematchDeclined" class="text-sm text-error">{{ $t('rematchDeclined') }}</div>
        <div v-if="rematchOfferReceived" class="flex flex-col gap-2">
          <p class="text-sm text-primary">{{ $t('opponentWantsRematch') }}</p>
          <div class="flex gap-2">
            <UButton :label="$t('accept')" color="success" class="flex-1" @click="$emit('acceptRematch')" />
            <UButton :label="$t('decline')" variant="outline" class="flex-1" @click="$emit('declineRematch')" />
          </div>
        </div>
        <UButton v-if="rematchOfferSent || rematchDeclined" :label="$t('newGame')" variant="outline" class="w-full" @click="navigateTo('/')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isWaiting: boolean
  gameOver: boolean
  canAbort: boolean
  moves: string[]
  chatMessages: { from: string; message: string; mine: boolean }[]
  inviteCode: string
  isMyTurn: boolean
  gameOverText: string
  rematchOfferSent: boolean
  rematchOfferReceived: boolean
  rematchDeclined: boolean
  gameId: string
}>()

defineEmits<{
  resign: []
  abort: []
  'offer-draw': []
  send: [message: string]
  'offer-rematch': []
  'accept-rematch': []
  'decline-rematch': []
  'show-invite': []
  'copy-invite': []
}>()
</script>
