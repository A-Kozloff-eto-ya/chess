<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6">
        <h2 class="mb-4 text-lg font-semibold">{{ $t('inviteAFriend') }}</h2>

        <div class="mb-4 rounded-lg bg-gray-800 p-3 text-center">
          <p class="mb-1 text-xs text-gray-400">{{ $t('gameCode') }}</p>
          <div class="flex items-center justify-center gap-2">
            <code class="text-2xl font-bold tracking-widest text-amber-400">{{ inviteCode }}</code>
            <UButton icon="i-lucide-copy" size="xs" variant="ghost" @click="copyCode" />
          </div>
        </div>

        <UFormField :label="$t('enterFriendsCode')">
          <div class="flex gap-2">
            <UInput v-model="searchCode" placeholder="ABC123" class="uppercase" :max-length="6" @keyup.enter="joinByCode" />
            <UButton :label="$t('join')" :disabled="searchCode.length < 6" :loading="joining" @click="joinByCode" />
          </div>
        </UFormField>

        <div class="divider my-4 flex items-center gap-3">
          <div class="h-px flex-1 bg-gray-700"></div>
          <span class="text-xs text-gray-500">{{ $t('orInviteAFriend') }}</span>
          <div class="h-px flex-1 bg-gray-700"></div>
        </div>

        <div v-if="loadingFriends" class="py-4 text-center text-gray-400">{{ $t('loadingFriends') }}</div>
        <div v-else-if="friends.length === 0" class="py-4 text-center text-sm text-gray-500">{{ $t('noFriendsYet') }}</div>
        <div v-else class="flex flex-col gap-2 max-h-48 overflow-y-auto">
          <div
            v-for="friend in friends"
            :key="friend.id"
            class="flex items-center justify-between rounded-lg bg-gray-800 p-3"
          >
            <div class="flex items-center gap-2">
              <div class="relative">
                <UAvatar :src="friend.avatar || undefined" size="xs" />
                <span v-if="isOnline(friend.id)" class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-gray-800 bg-green-500" />
                <span v-else-if="getStatus(friend.id)?.online === false" class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-gray-800 bg-gray-500" />
              </div>
              <div>
                <p class="text-sm font-medium">{{ friend.username }}</p>
                <p class="text-xs text-gray-400">{{ friend.rating }} {{ $t('eloShort') }}</p>
              </div>
            </div>
            <UButton
              :label="$t('invite')"
              size="xs"
              variant="outline"
              :disabled="invitingId === friend.id"
              @click="inviteFriend(friend)"
            />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { UserInfo, FriendsResponse, FetchError } from '~/../shared/types'

const props = defineProps<{ open: boolean; gameId: string; inviteCode: string }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const { t } = useI18n()
const toast = useToast()
const { sendGameInvite } = useNotifications()
const { isOnline, getStatus, fetchOnlineStatus } = useOnlineUsers()

const open = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
})

const friends = ref<UserInfo[]>([])
const loadingFriends = ref(false)
const searchCode = ref('')
const joining = ref(false)
const invitingId = ref<number | null>(null)

const copyCode = () => {
  navigator.clipboard.writeText(props.inviteCode)
  toast.add({ title: t('codeCopied'), color: 'success' })
}

const joinByCode = async () => {
  if (searchCode.value.length !== 6) return
  joining.value = true
  try {
    const { gameId } = await $fetch<{ gameId: string }>('/api/games/join', {
      method: 'POST',
      body: { inviteCode: searchCode.value.toUpperCase() },
    })
    open.value = false
    navigateTo(`/play/${gameId}`)
  } catch (e) {
    const err = e as FetchError
    toast.add({ title: err.data?.statusMessage || t('failedToJoin'), color: 'error' })
  } finally {
    joining.value = false
  }
}

const inviteFriend = async (friend: UserInfo) => {
  invitingId.value = friend.id
  try {
    sendGameInvite(friend.id, props.gameId, props.inviteCode)
    toast.add({ title: t('inviteSentTo', { username: friend.username }), color: 'success' })
  } catch {
    toast.add({ title: t('codeSendTo', { code: props.inviteCode, username: friend.username }), color: 'info' })
  }
  invitingId.value = null
}

watch(() => props.open, async (val) => {
  if (val && friends.value.length === 0) {
    loadingFriends.value = true
    try {
      const data = await $fetch<FriendsResponse>('/api/friends')
      friends.value = data.friends
      await fetchOnlineStatus(data.friends.map(f => f.id))
    } catch (e) {
      console.error('[InviteModal] Failed to load friends:', e)
    }
    loadingFriends.value = false
  }
})
</script>
