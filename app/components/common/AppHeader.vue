<template>
  <header class="border-b border-default bg-default">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 lg:px-4 lg:py-3">
      <NuxtLink to="/" class="flex items-center gap-2 text-xl font-bold" :aria-label="`${$t('chess')} — ${$t('home')}`">
        <UIcon name="i-lucide-crown" class="size-6 text-amber-500" aria-hidden="true" />
        <span class="hidden sm:inline">{{ $t('chess') }}</span>
      </NuxtLink>

      <div class="flex items-center gap-1 sm:gap-2">
        <CommonUserSearch v-if="loggedIn" class="hidden lg:flex" />

        <UButton to="/" variant="ghost" :label="$t('home')" icon="i-lucide-home" class="hidden lg:flex" />

        <CommonNotificationsBell v-if="loggedIn" />

        <template v-if="loggedIn">
          <UDropdownMenu :items="menuItems">
            <UButton icon="i-lucide-menu" variant="ghost" :aria-label="$t('menu')" class="hidden lg:flex" />
          </UDropdownMenu>
        </template>

        <UButton v-else :label="$t('signIn')" icon="i-lucide-log-in" class="hidden lg:flex" @click="showLogin = true" />

        <UButton icon="i-lucide-menu" variant="ghost" size="lg" class="lg:hidden" :aria-label="$t('menu')" @click="drawerOpen = true" />
      </div>
    </div>

    <UserLoginModal v-model:open="showLogin" />
    <CommonMobileDrawer v-model="drawerOpen" />
  </header>
</template>

<script setup lang="ts">
const { loggedIn, user, clear: clearSession } = useUserSession()
const { t } = useI18n()
const showLogin = ref(false)
const drawerOpen = ref(false)
const toast = useToast()

const handleLogout = async () => {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clearSession()
  toast.add({ title: t('signedOut'), color: 'success' })
  await navigateTo('/')
}

const menuItems = computed(() => [
  [{ label: t('profile'), icon: 'i-lucide-user', onSelect: () => navigateTo('/profile/me') }],
  [{ label: t('friends'), icon: 'i-lucide-users', onSelect: () => navigateTo('/friends') }],
  [{ label: t('settings'), icon: 'i-lucide-settings', onSelect: () => navigateTo('/settings') }],
  [{ label: t('signOut'), icon: 'i-lucide-log-out', onSelect: handleLogout }],
])
</script>
