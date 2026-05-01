<template>
  <div v-if="profile" class="flex flex-col gap-6">
    <UCard>
      <div class="flex gap-4">
        <div class="relative flex-shrink-0">
          <UAvatar :src="profile.avatar || undefined" size="3xl" class="size-20 sm:size-32 md:size-40" />
          <span v-if="isProfileOnline" class="absolute bottom-1 right-1 size-4 rounded-full border-2 border-default bg-success" />
          <span v-else-if="isProfileOffline" class="absolute bottom-1 right-1 size-4 rounded-full border-2 border-default bg-muted" />
        </div>
        <div class="flex flex-col justify-center min-w-0">
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-bold">{{ profile.username }}</h1>
            <span v-if="isProfileOnline" class="text-xs font-medium text-success">{{ $t('online') }}</span>
            <span v-else-if="isProfileOffline" class="text-xs font-medium text-muted">{{ $t('offline') }}</span>
          </div>
          <p class="text-muted">
            {{ $t('rating') }}: <span class="text-primary font-semibold">{{ profile.rating }}</span>
          </p>
          <p v-if="profile.bio" class="mt-1 text-sm text-default">{{ profile.bio }}</p>
          <p class="text-sm text-muted">{{ $t('joined', { date: formatDate(profile.createdAt) }) }}</p>
          <UButton v-if="isOwnProfile && !editing" :label="$t('editProfile')" icon="i-lucide-pencil" size="sm" variant="outline" class="mt-2" @click="startEditing" />
          <div v-if="isFriend" class="mt-2">
            <UButton
              :label="$t('removeFriend')"
              icon="i-lucide-user-minus"
              size="sm"
              color="error"
              variant="ghost"
              :loading="removingFriend"
              @click="removeFriend"
            />
          </div>
          <div v-else-if="friendRequestSent" class="mt-2">
            <UButton
              :label="$t('cancelRequest')"
              icon="i-lucide-x"
              size="sm"
              variant="ghost"
              :loading="cancellingRequest"
              @click="cancelRequest"
            />
          </div>
          <div v-else-if="canAddFriend" class="mt-2">
            <UButton
              :label="friendButtonText"
              :icon="friendButtonIcon"
              size="sm"
              :variant="isFriend ? 'outline' : 'solid'"
              :loading="addingFriend"
              :disabled="isFriend || friendRequestSent"
              @click="sendFriendRequest"
            />
          </div>
        </div>
      </div>
    </UCard>

    <UCard v-if="editing">
      <div class="flex flex-col gap-4">
        <UFormField :label="$t('username')">
          <UInput v-model="editForm.username" :max-length="30" />
        </UFormField>
        <UFormField :label="$t('bio')">
          <UTextarea v-model="editForm.bio" :max-length="200" :rows="3" />
        </UFormField>
        <UFormField :label="$t('avatar')">
          <div class="flex items-center gap-4">
            <UAvatar :src="editForm.avatar || undefined" size="xl" />
            <UButton :label="$t('uploadPhoto')" icon="i-lucide-upload" variant="outline" size="sm" :loading="uploading" @click="avatarInput?.click()" />
            <input ref="avatarInput" type="file" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden" @change="onAvatarUpload" />
          </div>
        </UFormField>
        <div class="flex gap-2">
          <UButton :label="$t('save')" :loading="saving" @click="saveProfile" />
          <UButton :label="$t('cancel')" variant="ghost" @click="editing = false" />
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <span class="font-semibold">{{ $t('gameHistory') }}</span>
      </template>
      <div v-if="games.length === 0" class="py-4 text-center text-muted">
        {{ $t('noGamesPlayed') }}
      </div>
      <div v-else class="flex flex-col gap-2">
        <div
          v-for="game in games"
          :key="game.id"
          class="flex items-center justify-between rounded-lg bg-elevated p-3 cursor-pointer hover:bg-accented transition-colors"
          @click="navigateTo(`/game/${game.id}`)"
        >
          <div class="flex items-center gap-3">
            <span
              class="rounded px-2 py-0.5 text-sm font-medium"
              :class="getResultClass(game)"
            >
              {{ getResultLabel(game) }}
            </span>
            <span class="text-sm text-default">{{ game.timeControl }}</span>
          </div>
          <span class="text-sm text-muted">{{ formatDate(game.createdAt) }}</span>
        </div>
      </div>
    </UCard>
  </div>

  <div v-else class="flex items-center justify-center py-20">
    <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted" />
  </div>
</template>

<script setup lang="ts">
import type { UserInfo, FriendsResponse, FetchError } from '~/../shared/types'

const route = useRoute()
const username = route.params.username as string
const { loggedIn, user } = useUserSession()
const { isOnline, getStatus, fetchOnlineStatus } = useOnlineUsers()
const { t, locale } = useI18n()
const toast = useToast()
const { onFriendshipChange } = useNotifications()

interface ProfileUser {
  id: number
  username: string
  avatar: string | null
  bio: string | null
  rating: number
  createdAt: string
}

interface ProfileGame {
  id: number
  whitePlayerId: number | null
  blackPlayerId: number | null
  result: string | null
  status: string
  timeControl: string
  createdAt: string
}

const profile = ref<ProfileUser | null>(null)
const games = ref<ProfileGame[]>([])
const addingFriend = ref(false)
const removingFriend = ref(false)
const cancellingRequest = ref(false)
const isFriend = ref(false)
const friendRequestSent = ref(false)
const sentRequestId = ref<number | null>(null)

const canAddFriend = computed(() => {
  return loggedIn.value && profile.value && profile.value.id !== user.value?.id
})

const isProfileOnline = computed(() => {
  if (!profile.value) return false
  const status = getStatus(profile.value.id)
  return status?.online === true
})

const isProfileOffline = computed(() => {
  if (!profile.value) return false
  const status = getStatus(profile.value.id)
  return status?.online === false
})

const isOwnProfile = computed(() => {
  return loggedIn.value && profile.value && profile.value.id === user.value?.id
})

const editing = ref(false)
const saving = ref(false)
const uploading = ref(false)
const avatarInput = ref<HTMLInputElement | null>(null)
const editForm = reactive({ username: '', bio: '', avatar: '' })

const startEditing = () => {
  if (!profile.value) return
  editForm.username = profile.value.username
  editForm.bio = profile.value.bio || ''
  editForm.avatar = profile.value.avatar || ''
  editing.value = true
}

const onAvatarUpload = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    toast.add({ title: t('fileTooLarge'), color: 'error' })
    return
  }

  editForm.avatar = URL.createObjectURL(file)

  uploading.value = true
  try {
    const form = new FormData()
    form.append('avatar', file)
    const res = await $fetch<{ avatar: string }>('/api/users/avatar', {
      method: 'POST',
      body: form,
    })
    editForm.avatar = res.avatar
    toast.add({ title: t('avatarUploaded'), color: 'success' })
  } catch (err) {
    const error = err as FetchError
    toast.add({ title: error.data?.statusMessage || t('uploadFailed'), color: 'error' })
  } finally {
    uploading.value = false
  }
}

const saveProfile = async () => {
  saving.value = true
  try {
    const updated = await $fetch('/api/users/me', {
      method: 'PUT',
      body: editForm,
    })
    const { id, username: uname, avatar, bio, rating, createdAt } = updated as any
    profile.value = { ...profile.value!, id, username: uname, avatar, bio, rating, createdAt }
    editing.value = false
    toast.add({ title: t('profileUpdated'), color: 'success' })
    if (editForm.username !== profile.value!.username) {
      navigateTo(`/profile/${editForm.username}`)
    }
  } catch (e) {
    const err = e as FetchError
    toast.add({ title: err.data?.statusMessage || t('failedToUpdate'), color: 'error' })
  } finally {
    saving.value = false
  }
}

const friendButtonText = computed(() => {
  if (isFriend.value) return t('alreadyFriends')
  if (friendRequestSent.value) return t('requestSent')
  return t('addFriend')
})

const friendButtonIcon = computed(() => {
  if (isFriend.value) return 'i-lucide-user-check'
  if (friendRequestSent.value) return 'i-lucide-clock'
  return 'i-lucide-user-plus'
})

const checkFriendship = async () => {
  if (!loggedIn.value || !profile.value || profile.value.id === user.value?.id) return
  const pid = profile.value.id
  try {
    const data = await $fetch<FriendsResponse>('/api/friends')
    isFriend.value = data.friends.some((f: UserInfo) => f.id === pid)
    friendRequestSent.value = data.sent.some((s) => s.to.id === pid) ||
      data.pending.some((p) => p.from.id === pid)
    const sentReq = data.sent.find((s) => s.to.id === pid)
    sentRequestId.value = sentReq?.id ?? null
  } catch (e) {
    console.error('[Profile] Failed to check friendship:', e)
  }
}

const sendFriendRequest = async () => {
  if (!profile.value) return
  addingFriend.value = true
  try {
    await $fetch('/api/friends/request', {
      method: 'POST',
      body: { userId: profile.value.id },
    })
    friendRequestSent.value = true
    toast.add({ title: t('friendRequestSent'), color: 'success' })
  } catch (e) {
    const err = e as FetchError
    toast.add({ title: err.data?.statusMessage || t('failedToSendRequest'), color: 'error' })
  } finally {
    addingFriend.value = false
  }
}

const removeFriend = async () => {
  if (!profile.value) return
  removingFriend.value = true
  try {
    await $fetch('/api/friends/remove', {
      method: 'POST',
      body: { userId: profile.value.id },
    })
    isFriend.value = false
    toast.add({ title: t('removedFromFriends', { username: profile.value.username }), color: 'success' })
  } catch (e) {
    const err = e as FetchError
    toast.add({ title: err.data?.statusMessage || t('failedToRemoveFriend'), color: 'error' })
  } finally {
    removingFriend.value = false
  }
}

const cancelRequest = async () => {
  if (!sentRequestId.value) return
  cancellingRequest.value = true
  try {
    await $fetch('/api/friends/cancel', {
      method: 'POST',
      body: { requestId: sentRequestId.value },
    })
    friendRequestSent.value = false
    sentRequestId.value = null
    toast.add({ title: t('friendRequestCancelled'), color: 'success' })
  } catch (e) {
    const err = e as FetchError
    toast.add({ title: err.data?.statusMessage || t('failedToCancelRequest'), color: 'error' })
  } finally {
    cancellingRequest.value = false
  }
}

const fetchProfile = async () => {
  try {
    if (username === 'me') {
      profile.value = await $fetch('/api/users/me')
    } else {
      profile.value = await $fetch(`/api/users/${username}`)
    }
  } catch {
    throw createError({ statusCode: 404, statusMessage: t('userNotFound') })
  }
}

const fetchGames = async () => {
  if (!profile.value) return
  try {
    const data = await $fetch('/api/games', { params: { limit: 20, username: profile.value.username } })
    games.value = data.games
  } catch (e) {
    console.error('[Profile] Failed to load games:', e)
  }
}

const formatDate = (date: string | null | undefined) => {
  if (!date) return 'N/A'
  const d = new Date(date)
  if (isNaN(d.getTime())) return 'N/A'
  return d.toLocaleDateString(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const getResultLabel = (game: ProfileGame) => {
  if (!game.result || game.result === '*') return game.status
  switch (game.result) {
    case '1-0': return t('whiteWon')
    case '0-1': return t('blackWon')
    case '1/2-1/2': return t('draw')
    default: return game.status
  }
}

const getResultClass = (game: ProfileGame) => {
  if (!game.result || game.result === '*') return 'bg-muted'
  switch (game.result) {
    case '1-0': return profile.value?.id === game.whitePlayerId ? 'bg-success' : 'bg-error'
    case '0-1': return profile.value?.id === game.blackPlayerId ? 'bg-success' : 'bg-error'
    case '1/2-1/2': return 'bg-warning'
    default: return 'bg-muted'
  }
}

onMounted(async () => {
  await fetchProfile()
  if (profile.value) {
    await fetchGames()
    await fetchOnlineStatus([profile.value.id])
  }
  await checkFriendship()
})

onFriendshipChange((type, userId) => {
  if (!profile.value || profile.value.id !== userId) return
  if (type === 'friend_accepted') {
    friendRequestSent.value = false
    sentRequestId.value = null
    isFriend.value = true
  } else if (type === 'friend_request') {
    friendRequestSent.value = true
  }
})
</script>
