<template>
  <UModal v-model:open="open" :title="$t('signInToChess')">
    <template #body>
      <div class="flex flex-col gap-4 p-4">
        <UForm :state="loginState" @submit="onLogin">
          <UFormField :label="$t('email')" name="email">
            <UInput v-model="loginState.email" type="email" />
          </UFormField>
          <UFormField :label="$t('password')" name="password" class="mt-3">
            <UInput v-model="loginState.password" type="password" />
          </UFormField>
          <div class="flex items-center justify-between mt-1">
            <span></span>
            <NuxtLink to="/forgot-password" class="text-xs text-blue-400 hover:text-blue-300" @click="open = false">{{ $t('forgotPasswordLink') }}</NuxtLink>
          </div>
          <UButton type="submit" :label="$t('signIn')" class="mt-3 w-full" :loading="loading" />
        </UForm>

        <USeparator :label="$t('or')" />

        <div class="flex flex-col gap-2">
          <UButton :label="$t('continueWithGitHub')" icon="i-simple-icons-github" variant="outline" @click="oauthLogin('github')" />
          <UButton :label="$t('continueWithGoogle')" icon="i-simple-icons-google" variant="outline" @click="oauthLogin('google')" />
        </div>

        <USeparator />

        <div>
          <p class="mb-2 text-sm text-gray-400">{{ $t('noAccount') }}</p>
          <UForm :state="registerState" @submit="onRegister">
            <UFormField :label="$t('username')" name="username">
              <UInput v-model="registerState.username" />
            </UFormField>
            <UFormField :label="$t('email')" name="email">
              <UInput v-model="registerState.email" type="email" />
            </UFormField>
            <UFormField :label="$t('password')" name="password">
              <UInput v-model="registerState.password" type="password" />
            </UFormField>
            <UButton type="submit" :label="$t('createAccount')" class="mt-3 w-full" variant="outline" :loading="loading" />
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
const { t } = useI18n()
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
    toast.add({ title: t('signedIn'), color: 'success' })
  } catch (e) {
    const err = e as FetchError
    toast.add({ title: err.data?.statusMessage || t('loginFailed'), color: 'error' })
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
    toast.add({ title: t('accountCreated'), color: 'success' })
  } catch (e) {
    const err = e as FetchError
    toast.add({ title: err.data?.statusMessage || t('registrationFailed'), color: 'error' })
  } finally {
    loading.value = false
  }
}

const oauthLogin = (provider: string) => {
  window.location.href = `/auth/${provider}`
}
</script>
