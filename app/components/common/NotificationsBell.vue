<template>
  <div v-if="loggedIn" class="relative">
    <UPopover>
      <UButton icon="i-lucide-bell" variant="ghost" class="relative" aria-label="Notifications">
        <span
          v-if="pendingCount > 0"
          class="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-inverted"
          aria-label="Unread notifications"
          role="status"
        >
          {{ pendingCount }}
        </span>
      </UButton>

      <template #content>
        <div class="w-72 p-2">
          <p class="mb-2 px-2 text-sm font-semibold text-default">{{ $t('friendRequests') }}</p>
          <div v-if="friendRequests.length === 0" class="px-2 py-4 text-center text-sm text-muted">
            {{ $t('noPendingRequests') }}
          </div>
          <div v-else class="flex flex-col gap-1">
            <div
              v-for="req in friendRequests"
              :key="req.requestId"
              class="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-elevated/50"
            >
              <div class="flex items-center gap-2">
                <div class="relative">
                  <UAvatar :src="req.from.avatar || undefined" size="xs" />
                  <span v-if="isOnline(req.from.id)" class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-default bg-success" />
                  <span v-else-if="getStatus(req.from.id)?.online === false" class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-default bg-muted" />
                </div>
                <div>
                  <p class="text-sm font-medium">{{ req.from.username }}</p>
                  <p class="text-xs text-muted">{{ req.from.rating }} {{ $t('eloShort') }}</p>
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
const { friendRequests, friendshipEvents, pendingCount, acceptRequest, declineRequest } = useNotifications()
const { isOnline, getStatus, fetchOnlineStatus } = useOnlineUsers()
const { t } = useI18n()
const toast = useToast()

watch(friendRequests, (reqs) => {
  if (reqs.length) fetchOnlineStatus(reqs.map(r => r.from.id))
}, { immediate: true })

watch(() => friendshipEvents.value.id, () => {
  const ev = friendshipEvents.value
  if (!ev.type) return

  if (ev.type === 'friend_request' && ev.data) {
    toast.add({
      title: t('sentYouFriendRequest', { username: ev.data.from.username }),
      color: 'info',
      duration: 8000,
    })
  } else if (ev.type === 'game_invite' && ev.data) {
    toast.add({
      title: t('invitesYouToPlay', { username: ev.data.from.username }),
      color: 'info',
      duration: 15000,
      actions: [
        {
          label: t('join'),
          onClick: async () => {
            try {
              await $fetch('/api/games/join', {
                method: 'POST',
                body: { inviteCode: ev.data.inviteCode },
              })
              navigateTo(`/play/${ev.data.gameId}`)
            } catch (e) {
              const err = e as FetchError
              toast.add({ title: err.data?.statusMessage || t('failedToJoinGame'), color: 'error' })
            }
          },
        },
      ],
    })
  }
})
</script>
