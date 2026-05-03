<template>
  <div class="flex flex-col gap-6">
    <h1 class="text-2xl font-bold">{{ $t('friends') }}</h1>

    <UInput
      v-model="searchQuery"
      icon="i-lucide-search"
      :placeholder="$t('searchFriends')"
      size="lg"
    />

    <div v-if="isSearching" class="flex justify-center py-10">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted" />
    </div>

    <template v-else-if="searchQuery.length >= 2">
      <div v-if="searchResults.length === 0" class="py-10 text-center text-muted">
        <UIcon name="i-lucide-search" class="mx-auto mb-3 size-12 text-muted" />
        <p>{{ $t('noPlayersFound') }}</p>
      </div>

      <template v-else>
        <UCard v-if="friendResults.length > 0">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-users" class="size-4 text-muted" />
              <span class="text-sm font-semibold text-muted uppercase tracking-wide">{{ $t('friendsSection') }}</span>
            </div>
          </template>
          <div class="flex flex-col gap-2">
            <div
              v-for="u in friendResults"
              :key="'friend-' + u.id"
              class="flex items-center justify-between rounded-lg bg-elevated p-3 transition-colors hover:bg-accented"
            >
              <NuxtLink :to="`/profile/${u.username}`" class="flex items-center gap-3">
                <div class="relative">
                  <UAvatar :src="resolveAvatar(u.avatar)" size="sm" />
                  <span v-if="isOnline(u.id)" class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-default bg-success" />
                  <span v-else-if="getStatus(u.id)?.online === false" class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-default bg-error" />
                </div>
                <div>
                  <p class="font-medium">{{ u.username }}</p>
                  <p class="text-xs text-muted">{{ u.rating }} {{ $t('eloShort') }}</p>
                </div>
              </NuxtLink>
              <UButton
                icon="i-lucide-user-minus"
                size="xs"
                color="error"
                variant="ghost"
                :loading="removingId === u.id"
                @click="removeFriend(u)"
              />
            </div>
          </div>
        </UCard>

        <UCard v-if="otherResults.length > 0">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-user-search" class="size-4 text-muted" />
              <span class="text-sm font-semibold text-muted uppercase tracking-wide">{{ $t('otherPlayers') }}</span>
            </div>
          </template>
          <div class="flex flex-col gap-2">
            <div
              v-for="u in otherResults"
              :key="'other-' + u.id"
              class="flex items-center justify-between rounded-lg bg-elevated p-3 transition-colors hover:bg-accented"
            >
              <NuxtLink :to="`/profile/${u.username}`" class="flex items-center gap-3">
                <div class="relative">
                  <UAvatar :src="resolveAvatar(u.avatar)" size="sm" />
                  <span v-if="isOnline(u.id)" class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-default bg-success" />
                  <span v-else-if="getStatus(u.id)?.online === false" class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-default bg-error" />
                </div>
                <div>
                  <p class="font-medium">{{ u.username }}</p>
                  <p class="text-xs text-muted">{{ u.rating }} {{ $t('eloShort') }}</p>
                </div>
              </NuxtLink>
              <UButton
                icon="i-lucide-user-plus"
                size="xs"
                variant="ghost"
                :loading="addingId === u.id"
                @click="sendFriendRequest(u)"
              />
            </div>
          </div>
        </UCard>
      </template>
    </template>

    <template v-else>
      <div v-if="loading" class="flex justify-center py-10">
        <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted" />
      </div>

      <template v-else>
        <div v-if="friends.length === 0" class="py-10 text-center text-muted">
          <UIcon name="i-lucide-users" class="mx-auto mb-3 size-12 text-muted" />
          <p>{{ $t('noFriendsYet') }}</p>
          <p class="mt-1 text-sm">{{ $t('searchForPlayers') }}</p>
        </div>

        <div v-else class="flex flex-col gap-2">
          <div
            v-for="friend in friends"
            :key="friend.id"
            class="flex items-center justify-between rounded-lg bg-elevated p-3 transition-colors hover:bg-accented"
          >
            <NuxtLink :to="`/profile/${friend.username}`" class="flex items-center gap-3">
              <div class="relative">
                <UAvatar :src="resolveAvatar(friend.avatar)" size="sm" />
                <span v-if="isOnline(friend.id)" class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-default bg-success" />
                <span v-else-if="getStatus(friend.id)?.online === false" class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-default bg-error" />
              </div>
              <div>
                <p class="font-medium">{{ friend.username }}</p>
                <p v-if="isOnline(friend.id)" class="text-xs text-success">{{ $t('online') }}</p>
                <p v-else-if="getStatus(friend.id)?.lastSeenAt" class="text-xs text-muted">{{ $t('lastSeen', { time: formatLastSeen(getStatus(friend.id)!.lastSeenAt!) }) }}</p>
                <p class="text-xs text-muted">{{ friend.rating }} {{ $t('eloShort') }}</p>
              </div>
            </NuxtLink>
            <UButton
              icon="i-lucide-user-minus"
              size="xs"
              color="error"
              variant="ghost"
              :loading="removingId === friend.id"
              @click="removeFriend(friend)"
            />
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { UserInfo, FriendsResponse, FetchError } from '~/../shared/types'

const { loggedIn } = useUserSession()
const { isOnline, getStatus, fetchOnlineStatus } = useOnlineUsers()
const { resolveAvatar } = useAvatar()
const { t } = useI18n()
const toast = useToast()

const friends = ref<UserInfo[]>([])
const loading = ref(true)
const removingId = ref<number | null>(null)
const addingId = ref<number | null>(null)

const searchQuery = ref('')
const searchResults = ref<(UserInfo & { isFriend: boolean })[]>([])
const isSearching = ref(false)
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const friendResults = computed(() => searchResults.value.filter(r => r.isFriend))
const otherResults = computed(() => searchResults.value.filter(r => !r.isFriend))

const formatLastSeen = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t('justNow')
  if (mins < 60) return t('minutesAgo', { n: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t('hoursAgo', { n: hours })
  const days = Math.floor(hours / 24)
  return t('daysAgo', { n: days })
}

const search = async () => {
  if (searchQuery.value.length < 2) {
    searchResults.value = []
    return
  }
  isSearching.value = true
  try {
    const data = await $fetch<{ results: (UserInfo & { isFriend: boolean })[] }>('/api/friends/search', {
      params: { q: searchQuery.value, limit: 20 },
    })
    searchResults.value = data.results
    if (data.results.length) await fetchOnlineStatus(data.results.map(u => u.id))
  } catch {
    searchResults.value = []
  }
  isSearching.value = false
}

watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(search, 300)
})

const fetchFriends = async () => {
  loading.value = true
  try {
    const data = await $fetch<FriendsResponse>('/api/friends')
    friends.value = data.friends
    await fetchOnlineStatus(data.friends.map(f => f.id))
  } catch {
    toast.add({ title: t('failedToLoadFriends'), color: 'error' })
  }
  loading.value = false
}

const removeFriend = async (friend: UserInfo) => {
  removingId.value = friend.id
  try {
    await $fetch('/api/friends/remove', {
      method: 'POST',
      body: { userId: friend.id },
    })
    friends.value = friends.value.filter(f => f.id !== friend.id)
    searchResults.value = searchResults.value.map(r =>
      r.id === friend.id ? { ...r, isFriend: false } : r
    )
    toast.add({ title: t('removedFromFriends', { username: friend.username }), color: 'success' })
  } catch (e) {
    const err = e as FetchError
    toast.add({ title: err.data?.statusMessage || t('failedToRemoveFriend'), color: 'error' })
  }
  removingId.value = null
}

const sendFriendRequest = async (u: UserInfo) => {
  addingId.value = u.id
  try {
    await $fetch('/api/friends/request', {
      method: 'POST',
      body: { userId: u.id },
    })
    toast.add({ title: t('friendRequestSent'), color: 'success' })
  } catch (e) {
    const err = e as FetchError
    toast.add({ title: err.data?.statusMessage || t('failedToSendRequest'), color: 'error' })
  }
  addingId.value = null
}

onMounted(() => {
  if (!loggedIn.value) {
    navigateTo('/')
    return
  }
  fetchFriends()
})
</script>
