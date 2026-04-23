<template>
  <div class="flex min-h-[60vh] items-center justify-center">
    <UCard class="w-full max-w-md">
      <template #header>
        <h1 class="text-xl font-bold">Reset Password</h1>
      </template>

      <div v-if="success" class="text-center py-4">
        <UIcon name="i-lucide-check-circle" class="size-12 text-green-400 mb-3 mx-auto" />
        <p class="text-gray-300">Password has been reset successfully.</p>
        <UButton label="Sign in" class="mt-4" @click="navigateTo('/')" />
      </div>

      <div v-else-if="invalidToken" class="text-center py-4">
        <UIcon name="i-lucide-x-circle" class="size-12 text-red-400 mb-3 mx-auto" />
        <p class="text-gray-300">This reset link is invalid or has expired.</p>
        <UButton label="Request new link" variant="outline" class="mt-4" @click="navigateTo('/forgot-password')" />
      </div>

      <UForm v-else :state="form" @submit="onSubmit">
        <UFormField label="New Password" name="password">
          <UInput v-model="form.password" type="password" placeholder="Min 8 characters" />
        </UFormField>
        <UFormField label="Confirm Password" name="confirmPassword" class="mt-3">
          <UInput v-model="form.confirmPassword" type="password" />
        </UFormField>
        <UButton type="submit" label="Reset Password" class="mt-4 w-full" :loading="loading" />
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { FetchError } from '~/../shared/types'

const route = useRoute()
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
    toast.add({ title: 'Passwords do not match', color: 'error' })
    return
  }

  loading.value = true
  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { token, password: form.password },
    })
    success.value = true
    toast.add({ title: 'Password reset!', color: 'success' })
  } catch (e) {
    const err = e as FetchError
    if (err.data?.statusCode === 400) {
      invalidToken.value = true
    } else {
      toast.add({ title: err.data?.statusMessage || 'Failed to reset password', color: 'error' })
    }
  } finally {
    loading.value = false
  }
}
</script>
