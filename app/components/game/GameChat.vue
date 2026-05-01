<template>
  <div class="flex flex-col rounded-lg border border-default">
    <div class="flex items-center justify-between border-b border-default px-3 py-2">
      <span class="text-sm font-medium text-default">{{ $t('chat') }}</span>
      <UButton icon="i-lucide-message-square" variant="ghost" size="sm" @click="expanded = !expanded" />
    </div>
    <div v-if="expanded" class="flex flex-col">
      <div ref="messagesEl" class="flex max-h-48 flex-col gap-1 overflow-y-auto p-3">
        <p v-if="messages.length === 0" class="text-center text-xs text-muted">{{ $t('noMessagesYet') }}</p>
        <div
          v-for="(msg, i) in messages"
          :key="i"
          class="text-sm"
          :class="msg.mine ? 'text-right' : 'text-left'"
        >
          <span :class="msg.mine ? 'text-primary' : 'text-muted'" class="text-xs">{{ msg.from }}:</span>
          <span class="ml-1 text-default">{{ sanitized(msg.message) }}</span>
        </div>
      </div>
      <div class="flex gap-2 border-t border-default p-2">
        <UInput
          v-model="input"
          :placeholder="$t('typeMessage')"
          size="sm"
          class="flex-1"
          :disabled="disabled"
          @keyup.enter="send"
        />
        <UButton icon="i-lucide-send" size="sm" :disabled="!input.trim() || disabled" @click="send" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  messages: { from: string; message: string; mine: boolean }[]
  disabled?: boolean
}>()

const emit = defineEmits<{ send: [message: string] }>()

const input = ref('')
const expanded = ref(true)
const messagesEl = ref<HTMLElement | null>(null)

const sanitized = (text: string) => text.replace(/<[^>]*>/g, '')

const send = () => {
  const text = input.value.trim()
  if (!text) return
  emit('send', text)
  input.value = ''
  nextTick(() => {
    if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  })
}

watch(() => props.messages.length, () => {
  nextTick(() => {
    if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  })
})
</script>
