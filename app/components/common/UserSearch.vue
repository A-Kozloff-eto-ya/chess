<template>
  <div class="relative">
    <UInput
      v-model="query"
      icon="i-lucide-search"
      placeholder="Search players..."
      size="sm"
      class="w-48"
      aria-label="Search players"
      @focus="focused = true"
      @blur="onBlur"
    />

    <div
      v-if="focused && query.length >= 2"
      class="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-gray-700 bg-gray-900 shadow-xl"
    >
      <div v-if="loading" class="px-3 py-4 text-center text-sm text-gray-500">
        Searching...
      </div>
      <div v-else-if="results.length === 0" class="px-3 py-4 text-center text-sm text-gray-500">
        No players found
      </div>
      <div v-else class="flex flex-col py-1">
        <NuxtLink
          v-for="u in results"
          :key="u.id"
          :to="`/profile/${u.username}`"
          class="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 transition-colors"
          @mousedown.prevent="navigateToProfile(u.username)"
        >
          <UAvatar :src="u.avatar || undefined" size="xs" />
          <div>
            <p class="text-sm font-medium">{{ u.username }}</p>
            <p class="text-xs text-gray-400">{{ u.rating }} ELO</p>
          </div>
          <span v-if="isOnline(u.id)" class="ml-auto size-2 rounded-full bg-green-500" />
          <span v-else-if="getStatus(u.id) === false" class="ml-auto size-2 rounded-full bg-gray-500" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserInfo } from '~/../shared/types'

const query = ref('')
const results = ref<UserInfo[]>([])
const loading = ref(false)
const focused = ref(false)
const { isOnline, getStatus, fetchOnlineStatus } = useOnlineUsers()
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const search = async () => {
  if (query.value.length < 2) {
    results.value = []
    return
  }
  loading.value = true
  try {
    const data = await $fetch<{ users: UserInfo[] }>('/api/users/search', {
      params: { q: query.value, limit: 5 },
    })
    results.value = data.users
    if (data.users.length) await fetchOnlineStatus(data.users.map(u => u.id))
  } catch {
    results.value = []
  }
  loading.value = false
}

watch(query, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(search, 300)
})

const onBlur = () => {
  setTimeout(() => { focused.value = false }, 200)
}

const navigateToProfile = (username: string) => {
  query.value = ''
  results.value = []
  focused.value = false
  navigateTo(`/profile/${username}`)
}
</script>
