<template>
  <div v-if="loggedIn" class="relative">
    <UPopover>
      <UButton icon="i-lucide-bell" variant="ghost" class="relative" aria-label="Notifications">
        <span
          v-if="pendingCount > 0"
          class="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
          aria-label="Unread notifications"
          role="status"
        >
          {{ pendingCount }}
        </span>
      </UButton>

      <template #content>
        <div class="w-72 p-2">
          <p class="mb-2 px-2 text-sm font-semibold text-gray-300">Friend Requests</p>
          <div v-if="friendRequests.length === 0" class="px-2 py-4 text-center text-sm text-gray-500">
            No pending requests
          </div>
          <div v-else class="flex flex-col gap-1">
            <div
              v-for="req in friendRequests"
              :key="req.requestId"
              class="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-gray-800"
            >
              <div class="flex items-center gap-2">
                <div class="relative">
                  <UAvatar :src="req.from.avatar || undefined" size="xs" />
                  <span v-if="isOnline(req.from.id)" class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-gray-900 bg-green-500" />
                  <span v-else-if="getStatus(req.from.id)?.online === false" class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-gray-900 bg-gray-500" />
                </div>
                <div>
                  <p class="text-sm font-medium">{{ req.from.username }}</p>
                  <p class="text-xs text-gray-400">{{ req.from.rating }} ELO</p>
                </div>
              </div>
              <div class="flex gap-1">
                <UButton icon="i-lucide-check" size="xs" color="success" variant="ghost" @click="acceptRequest(req.requestId)" />
                <UButton icon="i-lucide-x" size="xs" color="error" variant="ghost" @click="declineRequest(req.requestId)" />
              </div>
            </div>
          </div>
        </div>
      </template>
    </UPopover>
  </div>
</template>

<script setup lang="ts">
import type { FetchError } from '~/../shared/types'

const { loggedIn } = useUserSession()
const { friendRequests, pendingCount, acceptRequest, declineRequest, onNotification } = useNotifications()
const { isOnline, getStatus, fetchOnlineStatus } = useOnlineUsers()
const toast = useToast()

watch(friendRequests, (reqs) => {
  if (reqs.length) fetchOnlineStatus(reqs.map(r => r.from.id))
}, { immediate: true })

const cleanup = onNotification((msg) => {
  if (msg.type === 'game_invite') {
    toast.add({
      title: `${msg.from.username} invites you to play!`,
      color: 'info',
      duration: 15000,
      actions: [
        {
          label: 'Join',
          onClick: async () => {
            try {
              await $fetch('/api/games/join', {
                method: 'POST',
                body: { inviteCode: msg.inviteCode },
              })
              navigateTo(`/play/${msg.gameId}`)
            } catch (e) {
              const err = e as FetchError
              toast.add({ title: err.data?.statusMessage || 'Failed to join game', color: 'error' })
            }
          },
        },
      ],
    })
  } else if (msg.type === 'friend_request') {
    toast.add({
      title: `${msg.from.username} sent you a friend request`,
      color: 'info',
      duration: 8000,
    })
  }
})

onUnmounted(cleanup)
</script>
