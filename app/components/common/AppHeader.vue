<template>
  <header class="border-b border-default bg-default">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 lg:px-4 lg:py-3">
      <NuxtLink to="/" class="flex items-center gap-2 text-xl font-bold" :aria-label="`${$t('chess')} — ${$t('home')}`">
        <UIcon name="i-lucide-crown" class="size-6 text-amber-500" aria-hidden="true" />
        <span class="hidden sm:inline">{{ $t('chess') }}</span>
      </NuxtLink>

      <nav aria-label="Main navigation" class="hidden items-center gap-4 lg:flex">
        <CommonUserSearch v-if="loggedIn" />
        <UButton to="/" variant="ghost" :label="$t('home')" icon="i-lucide-home" />
        <UButton to="/play-ai" variant="ghost" :label="$t('playAI')" icon="i-lucide-bot" />

        <template v-if="loggedIn">
          <CommonNotificationsBell />
          <UButton to="/profile/me" variant="ghost" :label="user?.username || $t('profile')" icon="i-lucide-user" />
          <UDropdownMenu :items="menuItems">
            <UButton icon="i-lucide-menu" variant="ghost" :aria-label="$t('menu')" />
          </UDropdownMenu>
        </template>

        <UButton v-else :label="$t('signIn')" icon="i-lucide-log-in" @click="showLogin = true" />

      </nav>

      <div class="flex items-center gap-2 lg:hidden">
        <CommonNotificationsBell v-if="loggedIn" />
        <UButton
          v-if="loggedIn"
          to="/profile/me"
          variant="ghost"
          icon="i-lucide-user"
          size="lg"
          :aria-label="$t('profile')"
        />
        <UButton
          v-else
          :label="$t('signIn')"
          icon="i-lucide-log-in"
          size="lg"
          @click="showLogin = true"
        />
        <UButton icon="i-lucide-menu" variant="ghost" size="lg" :aria-label="$t('menu')" @click="drawerOpen = true" />
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
