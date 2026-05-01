<template>
  <div>
    <div class="flex border-b border-default">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="flex-1 px-3 py-2 text-center text-xs font-medium transition-colors"
        :class="activeTab === tab.key ? 'border-b-2 border-primary text-primary' : 'text-muted'"
        @click="activeTab = tab.key"
      >
        <UIcon :name="tab.icon" class="mb-0.5 mr-1 size-3.5" />
        {{ tab.label }}
      </button>
    </div>

    <div class="max-h-48 overflow-y-auto">
      <div v-if="activeTab === 'moves'">
        <GameMoveHistory :moves="moves" />
      </div>
      <div v-if="activeTab === 'chat'">
        <GameChat :messages="chatMessages" :disabled="gameOver" @send="$emit('send', $event)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  moves: string[]
  chatMessages: { from: string; message: string; mine: boolean }[]
  gameOver: boolean
}>()

defineEmits<{ send: [message: string] }>()

const { t } = useI18n()
const activeTab = ref('moves')

const tabs = computed(() => [
  { key: 'moves', label: t('moves'), icon: 'i-lucide-list' },
  { key: 'chat', label: t('chat'), icon: 'i-lucide-message-square' },
])

watch(() => props.chatMessages.length, () => {
  activeTab.value = 'chat'
})

watch(() => props.moves.length, () => {
  activeTab.value = 'moves'
})
</script>
