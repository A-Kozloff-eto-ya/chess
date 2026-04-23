<template>
  <header class="border-b border-gray-800 bg-gray-900">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
      <NuxtLink to="/" class="flex items-center gap-2 text-xl font-bold" aria-label="Chess — Home">
        <UIcon name="i-lucide-crown" class="size-6 text-amber-400" aria-hidden="true" />
        <span>Chess</span>
      </NuxtLink>

      <nav aria-label="Main navigation" class="flex items-center gap-4">
        <CommonUserSearch v-if="loggedIn" />
        <UButton to="/" variant="ghost" label="Home" icon="i-lucide-home" />
        <UButton to="/play-ai" variant="ghost" label="Play AI" icon="i-lucide-bot" />

        <template v-if="loggedIn">
          <CommonNotificationsBell />
          <UButton to="/profile/me" variant="ghost" :label="user?.username || 'Profile'" icon="i-lucide-user" />
          <UDropdownMenu :items="menuItems">
            <UButton icon="i-lucide-menu" variant="ghost" aria-label="Menu" />
          </UDropdownMenu>
        </template>

        <UButton v-else label="Sign in" icon="i-lucide-log-in" @click="showLogin = true" />
      </nav>
    </div>

    <UserLoginModal v-model:open="showLogin" />
  </header>
</template>

<script setup lang="ts">
const { loggedIn, user, clear: clearSession } = useUserSession()
const showLogin = ref(false)
const toast = useToast()

const handleLogout = async () => {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clearSession()
  toast.add({ title: 'Signed out', color: 'success' })
  await navigateTo('/')
}

const menuItems = [
  [{ label: 'Profile', icon: 'i-lucide-user', onSelect: () => navigateTo('/profile/me') }],
  [{ label: 'Friends', icon: 'i-lucide-users', onSelect: () => navigateTo('/friends') }],
  [{ label: 'Sign out', icon: 'i-lucide-log-out', onSelect: handleLogout }],
]
</script>
