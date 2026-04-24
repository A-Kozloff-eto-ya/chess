<template>
  <div class="flex min-h-[60vh] items-center justify-center">
    <UCard class="w-full max-w-md">
      <template #header>
        <h1 class="text-xl font-bold">{{ $t('resetPassword') }}</h1>
      </template>

      <div v-if="success" class="text-center py-4">
        <UIcon name="i-lucide-check-circle" class="size-12 text-success mb-3 mx-auto" />
        <p class="text-default">{{ $t('passwordResetSuccess') }}</p>
        <UButton :label="$t('signIn')" class="mt-4" @click="navigateTo('/')" />
      </div>

      <div v-else-if="invalidToken" class="text-center py-4">
        <UIcon name="i-lucide-x-circle" class="size-12 text-error mb-3 mx-auto" />
        <p class="text-default">{{ $t('invalidResetLink') }}</p>
        <UButton :label="$t('requestNewLink')" variant="outline" class="mt-4" @click="navigateTo('/forgot-password')" />
      </div>

      <UForm v-else :state="form" @submit="onSubmit">
        <UFormField :label="$t('newPassword')" name="password">
          <UInput v-model="form.password" type="password" :placeholder="$t('min8Chars')" />
        </UFormField>
        <UFormField :label="$t('confirmPassword')" name="confirmPassword" class="mt-3">
          <UInput v-model="form.confirmPassword" type="password" />
        </UFormField>
        <UButton type="submit" :label="$t('resetPassword')" class="mt-4 w-full" :loading="loading" />
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { FetchError } from '~/../shared/types'

const route = useRoute()
const { t } = useI18n()
const toast = useToast()
const loading = ref(false)
const success = ref(false)
const invalidToken = ref(false)
const form = reactive({ password: '', confirmPassword: '' })

const token = route.query.token as string

if (!token) {
  invalidToken.value = true
}

const onSubmit = async () => {
  if (form.password !== form.confirmPassword) {
    toast.add({ title: t('passwordsDoNotMatch'), color: 'error' })
    return
  }

  loading.value = true
  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { token, password: form.password },
    })
    success.value = true
    toast.add({ title: t('passwordReset'), color: 'success' })
  } catch (e) {
    const err = e as FetchError
    if (err.data?.statusCode === 400) {
      invalidToken.value = true
    } else {
      toast.add({ title: err.data?.statusMessage || t('failedToResetPassword'), color: 'error' })
    }
  } finally {
    loading.value = false
  }
}
</script>
