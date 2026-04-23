<template>
  <div class="flex min-h-[60vh] items-center justify-center">
    <UCard class="w-full max-w-md">
      <template #header>
        <h1 class="text-xl font-bold">{{ $t('forgotPassword') }}</h1>
      </template>

      <div v-if="submitted" class="text-center py-4">
        <UIcon name="i-lucide-mail" class="size-12 text-blue-400 mb-3 mx-auto" />
        <p class="text-gray-300">{{ $t('resetLinkSent') }}</p>
        <UButton :label="$t('backToLogin')" variant="outline" class="mt-4" @click="navigateTo('/')" />
      </div>

      <UForm v-else :state="form" @submit="onSubmit">
        <p class="text-sm text-gray-400 mb-4">{{ $t('enterEmailReset') }}</p>
        <UFormField :label="$t('email')" name="email">
          <UInput v-model="form.email" type="email" />
        </UFormField>
        <UButton type="submit" :label="$t('sendResetLink')" class="mt-4 w-full" :loading="loading" />
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { FetchError } from '~/../shared/types'

const { t } = useI18n()
const toast = useToast()
const loading = ref(false)
const submitted = ref(false)
const form = reactive({ email: '' })

const onSubmit = async () => {
  loading.value = true
  try {
    await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: form,
    })
    submitted.value = true
  } catch (e) {
    const err = e as FetchError
    toast.add({ title: err.data?.statusMessage || t('failedToSendResetEmail'), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>
