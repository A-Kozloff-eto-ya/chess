<template>
  <USlideover v-model:open="open" side="right">
    <template #content>
      <div class="flex h-full flex-col gap-1 p-4">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-lg font-semibold">{{ $t('menu') }}</span>
          <UButton icon="i-lucide-x" variant="ghost" @click="open = false" />
        </div>

        <div v-if="loggedIn" class="mb-2">
          <CommonUserSearch />
        </div>

        <UButton
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :icon="item.icon"
          :label="item.label"
          variant="ghost"
          class="w-full justify-start"
          size="lg"
          @click="open = false"
        />

        <div class="my-2 h-px bg-accented" />

        <template v-if="loggedIn">
          <UButton
            :to="`/profile/${user?.username || 'me'}`"
            icon="i-lucide-user"
            :label="$t('profile')"
            variant="ghost"
            class="w-full justify-start"
            size="lg"
            @click="open = false"
          />
          <UButton
            to="/friends"
            icon="i-lucide-users"
            :label="$t('friends')"
            variant="ghost"
            class="w-full justify-start"
            size="lg"
            @click="open = false"
          />
          <UButton
            to="/settings"
            icon="i-lucide-settings"
            :label="$t('settings')"
            variant="ghost"
            class="w-full justify-start"
            size="lg"
            @click="open = false"
          />
          <div class="flex-1" />
          <UButton
            icon="i-lucide-log-out"
            :label="$t('signOut')"
            variant="ghost"
            color="error"
            class="w-full justify-start"
            size="lg"
            @click="handleLogout"
          />
        </template>

        <template v-else>
          <div class="flex-1" />
          <UButton
            :label="$t('signIn')"
            icon="i-lucide-log-in"
            class="w-full"
            size="lg"
            @click="showLogin = true; open = false"
          />
        </template>
      </div>
    </template>
  </USlideover>

  <UserLoginModal v-model:open="showLogin" />
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const { loggedIn, user } = useUserSession()
const { t } = useI18n()
const showLogin = ref(false)
const { logout } = useAuth()

const navItems = computed(() => [
  { to: '/', icon: 'i-lucide-home', label: t('home') },
  { to: '/play-ai', icon: 'i-lucide-bot', label: t('playAI') },
])

const handleLogout = () => logout(() => { open.value = false })
</script>
