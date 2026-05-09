<template>
  <div class="flex flex-col items-center justify-center gap-4 pt-20">
    <div v-if="status === 'confirm'" class="flex flex-col items-center gap-4 max-w-sm text-center">
      <UIcon name="i-lucide-link" class="size-10 text-primary" />
      <h1 class="text-xl font-bold">{{ $t('linkAccountTitle') }}</h1>
      <p class="text-sm text-muted">{{ $t('linkAccountDesc', { provider, email }) }}</p>
      <div class="flex flex-col gap-2 w-full">
        <UInput v-model="password" type="password" :placeholder="$t('enterPassword')" />
        <UButton :label="$t('linkAndLogin')" :loading="loading" @click="onConfirm" />
      </div>
    </div>
    <div v-else-if="status === 'no-password'" class="flex flex-col items-center gap-4 max-w-sm text-center">
      <UIcon name="i-lucide-info" class="size-10 text-primary" />
      <h1 class="text-xl font-bold">{{ $t('linkAccountTitle') }}</h1>
      <p class="text-sm text-muted">{{ $t('linkAccountNoPassword', { provider, email }) }}</p>
      <UButton :label="$t('goToLogin')" @click="navigateTo('/')" />
    </div>
    <div v-else-if="status === 'success'" class="flex flex-col items-center gap-4 text-center">
      <UIcon name="i-lucide-check-circle" class="size-10 text-success" />
      <p class="font-semibold">{{ $t('linkedSuccess') }}</p>
      <UButton :label="$t('goHome')" @click="navigateTo('/')" />
    </div>
    <div v-else-if="status === 'error'" class="flex flex-col items-center gap-4 text-center">
      <UIcon name="i-lucide-alert-triangle" class="size-10 text-error" />
      <p class="font-semibold">{{ errorMessage }}</p>
      <UButton :label="$t('goHome')" variant="outline" @click="navigateTo('/')" />
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()
const toast = useToast()

const provider = computed(() => route.query.provider as string || '')
const email = computed(() => route.query.email as string || '')
const providerId = computed(() => route.query.providerId as string || '')
const providerUsername = computed(() => route.query.username as string || '')
const avatar = computed(() => route.query.avatar as string || '')
const profileUrl = computed(() => route.query.profileUrl as string || '')

const status = ref<'confirm' | 'no-password' | 'success' | 'error'>('confirm')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  if (!provider.value || !email.value || !providerId.value) {
    status.value = 'error'
    errorMessage.value = 'Missing parameters'
    return
  }
  const { data } = await useFetch<{ hasPassword: boolean }>('/api/auth/has-password-by-email', {
    query: { email: email.value },
  })
  if (!data.value?.hasPassword) {
    status.value = 'no-password'
  }
})

const onConfirm = async () => {
  loading.value = true
  try {
    await $fetch('/api/auth/link-existing-account', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value,
        provider: provider.value,
        providerId: providerId.value,
        username: providerUsername.value,
        avatar: avatar.value,
        profileUrl: profileUrl.value,
      },
    })
    status.value = 'success'
    toast.add({ title: t('linkedSuccess'), color: 'success' })
  } catch (e: any) {
    errorMessage.value = e.data?.statusMessage || t('linkFailed')
    status.value = 'error'
  } finally {
    loading.value = false
  }
}
</script>
