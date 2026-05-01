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

        <div class="flex items-center justify-center gap-3">
          <UTooltip :text="$t('continueWithGitHub')">
            <UButton icon="i-simple-icons-github" variant="outline" size="xl" @click="oauthLogin('github')" />
          </UTooltip>
          <UTooltip :text="$t('continueWithGoogle')">
            <UButton icon="i-simple-icons-google" variant="outline" size="xl" @click="oauthLogin('google')" />
          </UTooltip>
          <UTooltip :text="$t('continueWithYandex')">
            <UButton variant="outline" size="xl" @click="oauthLogin('yandex')">
              <template #leading>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M11.204 2.156c-.84-.012-1.888.36-2.496.936-.708.672-1.056 1.548-1.056 2.604 0 2.16 1.02 3.696 3.048 4.572L5.88 21.42h3.132l4.224-9.54h.072l4.248 9.54H20.7L15.66 10.2c2.04-.876 3.072-2.4 3.072-4.512 0-1.044-.348-1.908-1.044-2.58-.708-.684-1.596-1.008-2.676-.948V6.36c.576.06.948.252 1.164.564.216.324.336.768.336 1.332 0 .816-.264 1.452-.792 1.908-.516.444-1.224.672-2.1.672-.9 0-1.62-.228-2.148-.684-.528-.456-.792-1.104-.792-1.932 0-.552.12-.984.36-1.296.24-.312.612-.504 1.116-.564V2.16c-.192-.004-.388-.008-.584-.012z"/>
                </svg>
              </template>
            </UButton>
          </UTooltip>
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
