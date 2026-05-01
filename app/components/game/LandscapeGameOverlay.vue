<template>
  <div class="landscape-overlay fixed inset-0 z-50 flex bg-default" :style="{ paddingTop: safeTop, paddingBottom: safeBottom }">
    <div class="flex h-full w-full">
      <div class="flex flex-1 flex-col justify-center">
        <div class="flex items-center justify-between px-2 py-1" :style="{ maxWidth: boardSize + 'px' }">
          <div class="flex items-center gap-1.5">
            <UAvatar :src="opponentAvatar" size="xs" />
            <span class="text-xs font-semibold">{{ opponentName }}</span>
          </div>
          <div class="font-mono text-base" :class="opponentTimeClass">{{ opponentTimeFormatted }}</div>
        </div>

        <div class="board-area mx-auto flex w-full gap-1 px-1" :style="{ maxWidth: (boardSize + 20) + 'px', height: boardSize + 'px' }">
          <GameEvaluationBar v-if="evaluation" :evaluation="evaluation" :flipped="flipped" :compact="true" />
          <div class="flex-1 min-w-0 min-h-0">
            <slot />
          </div>
        </div>

        <div class="flex items-center justify-between px-2 py-1" :style="{ maxWidth: boardSize + 'px' }">
          <div class="flex items-center gap-1.5">
            <UAvatar :src="playerAvatar" size="xs" />
            <span class="text-xs font-semibold">{{ playerName }}</span>
          </div>
          <div class="font-mono text-base" :class="playerTimeClass">{{ playerTimeFormatted }}</div>
        </div>
      </div>

      <div class="flex w-14 flex-col items-center justify-center gap-3 border-l border-default bg-elevated/50">
        <UButton
          v-if="!gameOver"
          icon="i-lucide-flag"
          variant="ghost"
          size="sm"
          :aria-label="$t('resign')"
          @click="$emit('resign')"
        />
        <UButton
          v-if="!gameOver"
          icon="i-lucide-handshake"
          variant="ghost"
          size="sm"
          :aria-label="$t('offerDraw')"
          @click="$emit('offer-draw')"
        />
        <UButton
          icon="i-lucide-message-square"
          variant="ghost"
          size="sm"
          :aria-label="$t('chat')"
          @click="showChat = !showChat"
        />
        <UButton
          icon="i-lucide-x"
          variant="ghost"
          size="sm"
          :aria-label="$t('menu')"
          @click="$emit('close')"
        />
      </div>
    </div>

    <Transition name="slide-up">
      <div v-if="showChat" class="absolute bottom-0 right-14 left-0 max-h-48 rounded-t-lg border-t border-default bg-elevated p-3 shadow-xl">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold">{{ $t('chat') }}</span>
          <UButton icon="i-lucide-x" variant="ghost" size="xs" @click="showChat = false" />
        </div>
        <div ref="chatEl" class="max-h-24 overflow-y-auto text-sm">
          <div v-for="(msg, i) in chatMessages" :key="i" :class="msg.mine ? 'text-right' : 'text-left'">
            <span class="text-xs" :class="msg.mine ? 'text-primary' : 'text-muted'">{{ msg.from }}:</span>
            <span class="ml-1">{{ msg.message }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  boardSize: number
  playerName: string
  opponentName: string
  playerAvatar?: string
  opponentAvatar?: string
  playerTimeFormatted: string
  opponentTimeFormatted: string
  playerTimeClass?: string
  opponentTimeClass?: string
  evaluation: { type: 'cp' | 'mate'; value: number } | null
  flipped?: boolean
  gameOver: boolean
  chatMessages: { from: string; message: string; mine: boolean }[]
}>()

defineEmits<{
  resign: []
  'offer-draw': []
  close: []
}>()

const showChat = ref(false)
const chatEl = ref<HTMLElement | null>(null)
const safeTop = ref('0px')
const safeBottom = ref('0px')

onMounted(() => {
  const update = () => {
    safeTop.value = 'env(safe-area-inset-top, 0px)'
    safeBottom.value = 'env(safe-area-inset-bottom, 0px)'
  }
  update()
})
</script>

<style scoped>
.landscape-overlay .board-area :deep(.main-wrap) {
  width: 100%;
  height: 100%;
  margin: 0;
}
.landscape-overlay .board-area :deep(.main-board) {
  position: relative;
  height: 100%;
  padding-bottom: 0;
  width: auto;
  aspect-ratio: 1;
}
.landscape-overlay .board-area :deep(.cg-wrap) {
  position: relative;
  width: 100%;
  height: 100%;
}
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.2s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
