<template>
  <UModal v-model:open="open" title="Sign in to Chess">
    <template #body>
      <div class="flex flex-col gap-4 p-4">
        <UForm :state="loginState" @submit="onLogin">
          <UFormField label="Email" name="email">
            <UInput v-model="loginState.email" type="email" />
          </UFormField>
          <UFormField label="Password" name="password" class="mt-3">
            <UInput v-model="loginState.password" type="password" />
          </UFormField>
          <div class="flex items-center justify-between mt-1">
            <span></span>
            <NuxtLink to="/forgot-password" class="text-xs text-blue-400 hover:text-blue-300" @click="open = false">Forgot password?</NuxtLink>
          </div>
          <UButton type="submit" label="Sign in" class="mt-3 w-full" :loading="loading" />
        </UForm>

        <USeparator label="or" />

        <div class="flex flex-col gap-2">
          <UButton label="Continue with GitHub" icon="i-simple-icons-github" variant="outline" @click="oauthLogin('github')" />
          <UButton label="Continue with Google" icon="i-simple-icons-google" variant="outline" @click="oauthLogin('google')" />
        </div>

        <USeparator />

        <div>
          <p class="mb-2 text-sm text-gray-400">Don't have an account?</p>
          <UForm :state="registerState" @submit="onRegister">
            <UFormField label="Username" name="username">
              <UInput v-model="registerState.username" />
            </UFormField>
            <UFormField label="Email" name="email">
              <UInput v-model="registerState.email" type="email" />
            </UFormField>
            <UFormField label="Password" name="password">
              <UInput v-model="registerState.password" type="password" />
            </UFormField>
            <UButton type="submit" label="Create account" class="mt-3 w-full" variant="outline" :loading="loading" />
          </UForm>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { FetchError } from '~/../shared/types'

const open = defineModel<boolean>('open', { default: false })
const { fetch: fetchSession } = useUserSession()
const toast = useToast()
const loading = ref(false)

const loginState = reactive({ email: '', password: '' })
const registerState = reactive({ username: '', email: '', password: '' })

const onLogin = async () => {
  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: loginState,
    })
    await fetchSession()
    open.value = false
    toast.add({ title: 'Signed in', color: 'success' })
  } catch (e) {
    const err = e as FetchError
    toast.add({ title: err.data?.statusMessage || 'Login failed', color: 'error' })
  } finally {
    loading.value = false
  }
}

const onRegister = async () => {
  loading.value = true
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: registerState,
    })
    await fetchSession()
    open.value = false
    toast.add({ title: 'Account created', color: 'success' })
  } catch (e) {
    const err = e as FetchError
    toast.add({ title: err.data?.statusMessage || 'Registration failed', color: 'error' })
  } finally {
    loading.value = false
  }
}

const oauthLogin = (provider: string) => {
  window.location.href = `/auth/${provider}`
}
</script>
