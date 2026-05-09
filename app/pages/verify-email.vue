<template>
  <div class="flex min-h-[60vh] items-center justify-center">
    <div v-if="status === 'loading'" class="text-center">
      <UIcon name="i-lucide-loader-2" class="mx-auto mb-3 size-8 animate-spin text-muted" />
      <p>{{ $t('verifyingEmail') }}</p>
    </div>

    <div v-else-if="status === 'success'" class="text-center">
      <UIcon name="i-lucide-check-circle" class="mx-auto mb-3 size-10 text-success" />
      <h1 class="text-xl font-bold">{{ $t('emailVerified') }}</h1>
      <p class="mt-2 text-sm text-muted">{{ $t('emailVerifiedDesc') }}</p>
      <UButton :label="$t('home')" class="mt-4" @click="navigateTo('/')" />
    </div>

    <div v-else class="text-center">
      <UIcon name="i-lucide-x-circle" class="mx-auto mb-3 size-10 text-error" />
      <h1 class="text-xl font-bold">{{ $t('verificationFailed') }}</h1>
      <p class="mt-2 text-sm text-muted">{{ $t('verificationFailedDesc') }}</p>
      <UButton :label="$t('resendVerification')" variant="outline" class="mt-4" :loading="resending" @click="resendVerification" />
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()
const toast = useToast()

const status = ref<'loading' | 'success' | 'failed'>('loading')
const resending = ref(false)

onMounted(async () => {
  const token = route.query.token as string
  if (!token) {
    status.value = 'failed'
    return
  }

  try {
    await $fetch('/api/auth/verify-email', { method: 'POST', body: { token } })
    status.value = 'success'
  } catch {
    status.value = 'failed'
  }
})

const resendVerification = async () => {
  resending.value = true
  try {
    await $fetch('/api/auth/send-verification', { method: 'POST' })
    toast.add({ title: t('verificationEmailSent'), color: 'success' })
  } catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    toast.add({ title: err.data?.statusMessage || t('failedToSendVerification'), color: 'error' })
  } finally {
    resending.value = false
  }
}
</script>
