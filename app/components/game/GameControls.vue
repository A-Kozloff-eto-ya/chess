<template>
  <div class="flex gap-2">
    <UButton v-if="canAbort" :label="$t('abort')" icon="i-lucide-x" variant="outline" color="neutral" :disabled="disabled" size="sm" class="flex-1 lg:flex-none lg:size-auto" @click="$emit('abort')" />
    <UButton v-else :label="$t('resign')" icon="i-lucide-flag" variant="outline" color="error" :disabled="disabled" size="sm" class="flex-1 lg:flex-none lg:size-auto" @click="$emit('resign')" />
    <UButton :label="$t('offerDraw')" icon="i-lucide-handshake" variant="outline" :disabled="disabled || canAbort" size="sm" class="flex-1 lg:flex-none lg:size-auto" @click="$emit('offer-draw')" />
  </div>
</template>

<script setup lang="ts">
defineProps<{ disabled?: boolean; canAbort?: boolean }>()
defineEmits<{ resign: []; abort: []; 'offer-draw': [] }>()
</script>
