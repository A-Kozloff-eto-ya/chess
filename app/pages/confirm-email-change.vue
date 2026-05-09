<template>
  <div class="flex flex-col items-center justify-center gap-4 pt-20">
    <div v-if="status === 'loading'" class="text-center">
      <UIcon name="i-lucide-loader-2" class="mx-auto mb-3 size-8 animate-spin text-primary" />
      <p class="font-semibold">{{ $t('confirmEmailChange') }}...</p>
    </div>
    <div v-else-if="status === 'success'" class="text-center">
      <UIcon name="i-lucide-check-circle" class="mx-auto mb-3 size-8 text-success" />
      <p class="font-semibold">{{ $t('emailChanged') }}</p>
      <UButton :label="$t('goHome')" variant="outline" class="mt-4" @click="navigateTo('/settings')" />
    </div>
    <div v-else class="text-center">
      <UIcon name="i-lucide-alert-triangle" class="mx-auto mb-3 size-8 text-error" />
      <p class="font-semibold">{{ $t('emailChangeFailedToken') }}</p>
      <UButton :label="$t('goHome')" variant="outline" class="mt-4" @click="navigateTo('/settings')" />
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const token = route.query.token as string
const status = ref<'loading' | 'success' | 'error'>('loading')

onMounted(async () => {
  if (!token) {
    status.value = 'error'
    return
  }
  try {
    await $fetch('/api/auth/confirm-email-change', {
      method: 'POST',
      body: { token },
    })
    status.value = 'success'
  } catch {
    status.value = 'error'
  }
})
</script>
