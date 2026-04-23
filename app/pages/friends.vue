<template>
  <div class="flex flex-col gap-6">
    <h1 class="text-2xl font-bold">Friends</h1>

    <div v-if="loading" class="flex justify-center py-10">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-gray-400" />
    </div>

    <template v-else>
      <div v-if="friends.length === 0" class="py-10 text-center text-gray-500">
        <UIcon name="i-lucide-users" class="mx-auto mb-3 size-12 text-gray-600" />
        <p>No friends yet</p>
        <p class="mt-1 text-sm">Search for players and send friend requests!</p>
      </div>

      <div v-else class="flex flex-col gap-2">
        <div
          v-for="friend in friends"
          :key="friend.id"
          class="flex items-center justify-between rounded-lg bg-gray-800 p-3 transition-colors hover:bg-gray-750"
        >
          <NuxtLink :to="`/profile/${friend.username}`" class="flex items-center gap-3">
            <div class="relative">
              <UAvatar :src="friend.avatar || undefined" size="sm" />
              <span v-if="isOnline(friend.id)" class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-gray-800 bg-green-500" />
              <span v-else-if="getStatus(friend.id)?.online === false" class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-gray-800 bg-gray-500" />
            </div>
            <div>
              <p class="font-medium">{{ friend.username }}</p>
              <p v-if="isOnline(friend.id)" class="text-xs text-green-400">Online</p>
              <p v-else-if="getStatus(friend.id)?.lastSeenAt" class="text-xs text-gray-500">Last seen {{ formatLastSeen(getStatus(friend.id)!.lastSeenAt!) }}</p>
              <p class="text-xs text-gray-400">{{ friend.rating }} ELO</p>
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
  </div>
</template>

<script setup lang="ts">
import type { UserInfo, FriendsResponse, FetchError } from '~/../shared/types'

const { loggedIn } = useUserSession()
const { isOnline, getStatus, fetchOnlineStatus } = useOnlineUsers()
const toast = useToast()

const formatLastSeen = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const friends = ref<UserInfo[]>([])
const loading = ref(true)
const removingId = ref<number | null>(null)

const fetchFriends = async () => {
  loading.value = true
  try {
    const data = await $fetch<FriendsResponse>('/api/friends')
    friends.value = data.friends
    await fetchOnlineStatus(data.friends.map(f => f.id))
  } catch {
    toast.add({ title: 'Failed to load friends', color: 'error' })
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
    toast.add({ title: `${friend.username} removed from friends`, color: 'success' })
  } catch (e) {
    const err = e as FetchError
    toast.add({ title: err.data?.statusMessage || 'Failed to remove friend', color: 'error' })
  }
  removingId.value = null
}

onMounted(() => {
  if (!loggedIn.value) {
    navigateTo('/')
    return
  }
  fetchFriends()
})
</script>
