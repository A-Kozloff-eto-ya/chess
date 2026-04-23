<template>
  <div class="flex gap-2">
    <UButton v-if="canAbort" label="Abort" icon="i-lucide-x" variant="outline" color="neutral" :disabled="disabled" @click="$emit('abort')" />
    <UButton v-else label="Resign" icon="i-lucide-flag" variant="outline" color="error" :disabled="disabled" @click="$emit('resign')" />
    <UButton label="Offer Draw" icon="i-lucide-handshake" variant="outline" :disabled="disabled || canAbort" @click="$emit('offer-draw')" />
  </div>
</template>

<script setup lang="ts">
defineProps<{ disabled?: boolean; canAbort?: boolean }>()
defineEmits<{ resign: []; abort: []; offerDraw: [] }>()
</script>
