<template>
  <div class="flex flex-col items-center gap-8">
    <div class="text-center">
      <h1 class="text-4xl font-bold">
        <UIcon name="i-lucide-crown" class="mr-2 text-amber-400" />
        {{ $t('chess') }}
      </h1>
      <p class="mt-2 text-gray-400">{{ $t('playChessDesc') }}</p>
    </div>

    <div class="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
      <UCard class="cursor-pointer transition-transform hover:scale-105" @click="showAiModal = true">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-bot" class="size-5 text-blue-400" />
            <span class="font-semibold">{{ $t('playVsAI') }}</span>
          </div>
        </template>
        <p class="text-sm text-gray-400">{{ $t('challengeStockfish') }}</p>
      </UCard>

      <UCard class="cursor-pointer transition-transform hover:scale-105" :class="{ 'opacity-50': !loggedIn }" @click="loggedIn ? showCreateModal = true : showLoginPrompt()">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-swords" class="size-5 text-green-400" />
            <span class="font-semibold">{{ $t('playOnline') }}</span>
          </div>
        </template>
        <p class="text-sm text-gray-400">{{ $t('createGameInvite') }}</p>
        <UButton v-if="loggedIn" :label="$t('joinByCode')" icon="i-lucide-key" variant="ghost" size="xs" class="mt-2" @click.stop="showJoinModal = true" />
      </UCard>

      <UCard class="cursor-pointer transition-transform hover:scale-105" :class="{ 'opacity-50': !loggedIn }">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-eye" class="size-5 text-purple-400" />
            <span class="font-semibold">{{ $t('watchGames') }}</span>
          </div>
        </template>
        <p class="text-sm text-gray-400">{{ $t('spectateFriends') }}</p>
      </UCard>

      <UCard class="cursor-pointer transition-transform hover:scale-105" :class="{ 'opacity-50': !loggedIn }">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-search" class="size-5 text-amber-400" />
            <span class="font-semibold">{{ $t('analyze') }}</span>
          </div>
        </template>
        <p class="text-sm text-gray-400">{{ $t('postGameAnalysis') }}</p>
      </UCard>
    </div>

    <ClientOnly>
      <div v-if="loggedIn" class="w-full max-w-2xl">
      <UCard>
        <template #header>
          <span class="font-semibold">{{ $t('yourStats') }}</span>
        </template>
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <p class="text-2xl font-bold text-amber-400">{{ stats.rating }}</p>
            <p class="text-sm text-gray-400">{{ $t('rating') }}</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-green-400">{{ stats.gamesPlayed }}</p>
            <p class="text-sm text-gray-400">{{ $t('games') }}</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-blue-400">{{ stats.winRate }}%</p>
            <p class="text-sm text-gray-400">{{ $t('winRate') }}</p>
          </div>
        </div>
      </UCard>
      </div>
    </ClientOnly>

    <UModal v-model:open="showJoinModal">
      <template #content>
        <div class="p-6">
          <h2 class="mb-4 text-lg font-semibold">{{ $t('joinGame') }}</h2>
          <UFormField :label="$t('enterGameCode')">
            <div class="flex gap-2">
              <UInput v-model="joinCode" placeholder="ABC123" class="uppercase" :max-length="6" @keyup.enter="joinByCode" />
              <UButton :label="$t('join')" :disabled="joinCode.length < 6" :loading="joining" @click="joinByCode" />
            </div>
          </UFormField>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showCreateModal">
      <template #content>
        <div class="p-6">
          <h2 class="mb-4 text-lg font-semibold">{{ $t('createGame') }}</h2>
          <p class="mb-3 text-sm text-gray-400">{{ $t('chooseTimeControl') }}</p>
          <div class="mb-3 flex gap-2">
            <button
              v-for="cat in timeControlCategories"
              :key="cat.key"
              class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              :class="activeCategory === cat.key ? 'bg-amber-400 text-gray-900' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'"
              @click="activeCategory = cat.key"
            >
              {{ $t(cat.key) }}
            </button>
          </div>
          <div class="mb-4 flex flex-wrap gap-2">
            <button
              v-for="tc in activeOptions"
              :key="tc"
              class="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
              :class="selectedTimeControl === tc ? 'border-amber-400 bg-gray-800 text-amber-400' : 'border-gray-700 text-gray-300 hover:border-gray-500'"
              @click="selectedTimeControl = tc"
            >
              {{ tc }}
            </button>
          </div>
          <p class="mb-3 text-sm text-gray-400">{{ $t('chooseYourColor') }}</p>
          <div class="mb-4 flex gap-3">
            <button
              class="flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors"
              :class="selectedColor === 'white' ? 'border-amber-400 bg-gray-800' : 'border-gray-700 hover:border-gray-500'"
              @click="selectedColor = 'white'"
            >
              <span class="text-4xl">&#9812;</span>
              <span class="text-sm font-medium">{{ $t('white') }}</span>
            </button>
            <button
              class="flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors"
              :class="selectedColor === 'black' ? 'border-amber-400 bg-gray-800' : 'border-gray-700 hover:border-gray-500'"
              @click="selectedColor = 'black'"
            >
              <span class="text-4xl">&#9818;</span>
              <span class="text-sm font-medium">{{ $t('black') }}</span>
            </button>
            <button
              class="flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors"
              :class="selectedColor === 'random' ? 'border-amber-400 bg-gray-800' : 'border-gray-700 hover:border-gray-500'"
              @click="selectedColor = 'random'"
            >
              <UIcon name="i-lucide-shuffle" class="size-8 text-gray-300" />
              <span class="text-sm font-medium">{{ $t('random') }}</span>
            </button>
          </div>
          <UButton :label="$t('createGame')" class="w-full" :loading="creating" @click="createOnlineGame" />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showAiModal">
      <template #content>
        <div class="p-6">
          <h2 class="mb-4 text-lg font-semibold">{{ $t('playVsAI') }}</h2>
          <p class="mb-3 text-sm text-gray-400">{{ $t('chooseDifficulty') }}</p>
          <div class="mb-3 flex flex-wrap gap-2">
            <button
              v-for="preset in eloPresets"
              :key="preset.value"
              class="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
              :class="selectedElo === preset.value ? 'border-amber-400 bg-gray-800 text-amber-400' : 'border-gray-700 text-gray-300 hover:border-gray-500'"
              @click="selectedElo = preset.value"
            >
              {{ preset.label }}
            </button>
          </div>
          <UFormField :label="$t('aiElo')">
            <USlider v-model="selectedElo" :min="1350" :max="3300" :step="50" />
            <div class="mt-1 flex justify-between text-xs text-gray-400">
              <span>1350</span>
              <span>{{ selectedElo }}</span>
              <span>3300</span>
            </div>
          </UFormField>
          <p class="mb-3 mt-4 text-sm text-gray-400">{{ $t('chooseYourColor') }}</p>
          <div class="mb-4 flex gap-3">
            <button
              class="flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors"
              :class="aiColor === 'white' ? 'border-amber-400 bg-gray-800' : 'border-gray-700 hover:border-gray-500'"
              @click="aiColor = 'white'"
            >
              <span class="text-4xl">&#9812;</span>
              <span class="text-sm font-medium">{{ $t('white') }}</span>
            </button>
            <button
              class="flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors"
              :class="aiColor === 'black' ? 'border-amber-400 bg-gray-800' : 'border-gray-700 hover:border-gray-500'"
              @click="aiColor = 'black'"
            >
              <span class="text-4xl">&#9818;</span>
              <span class="text-sm font-medium">{{ $t('black') }}</span>
            </button>
          </div>
          <UButton :label="$t('startGame')" class="w-full" @click="startAiGame" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { FetchError } from '~/../shared/types'
import { TIME_CONTROL_CATEGORIES, DEFAULT_TIME_CONTROL } from '~/../shared/constants'

const { loggedIn, user } = useUserSession()
const { t } = useI18n()
const toast = useToast()

  const stats = reactive({
    rating: 1200,
    gamesPlayed: 0,
    winRate: 0,
  })

  onMounted(async () => {
    if (!loggedIn.value) return
    try {
      const data = await $fetch('/api/users/stats')
      stats.rating = data.rating
      stats.gamesPlayed = data.gamesPlayed
      stats.winRate = data.winRate
    } catch (e) {
      console.error('[Index] Failed to load stats:', e)
    }
  })

const createOnlineGame = async () => {
  creating.value = true
  try {
    const data = await $fetch<{ gameId: string }>('/api/games', {
      method: 'POST',
      body: { timeControl: selectedTimeControl.value, color: selectedColor.value },
    })
    showCreateModal.value = false
    navigateTo(`/play/${data.gameId}`)
  } catch (e) {
    const err = e as FetchError
    toast.add({ title: err.data?.statusMessage || t('failedToCreateGame'), color: 'error' })
  } finally {
    creating.value = false
  }
}

const showCreateModal = ref(false)
const showJoinModal = ref(false)
const showAiModal = ref(false)
const selectedColor = ref<'white' | 'black' | 'random'>('random')
const selectedElo = ref(1500)
const aiColor = ref<'white' | 'black'>('white')
const selectedTimeControl = ref(DEFAULT_TIME_CONTROL)
const activeCategory = ref<string>('rapid')
const creating = ref(false)
const joinCode = ref('')
const joining = ref(false)

const eloPresets = computed(() => [
  { label: t('beginner', { elo: 1350 }), value: 1350 },
  { label: t('casual', { elo: 1500 }), value: 1500 },
  { label: t('club', { elo: 1800 }), value: 1800 },
  { label: t('expert', { elo: 2200 }), value: 2200 },
  { label: t('master', { elo: 2700 }), value: 2700 },
  { label: t('superGM', { elo: 3300 }), value: 3300 },
])

const startAiGame = () => {
  showAiModal.value = false
  navigateTo({ path: '/play-ai', query: { elo: selectedElo.value, color: aiColor.value } })
}

const timeControlCategories = TIME_CONTROL_CATEGORIES
const activeOptions = computed(() => {
  return TIME_CONTROL_CATEGORIES.find(c => c.key === activeCategory.value)?.options ?? ['10+0']
})

const joinByCode = async () => {
  if (joinCode.value.length !== 6) return
  joining.value = true
  try {
    const { gameId } = await $fetch('/api/games/join', {
      method: 'POST',
      body: { inviteCode: joinCode.value.toUpperCase() },
    })
    showJoinModal.value = false
    navigateTo(`/play/${gameId}`)
  } catch (e) {
    const err = e as FetchError
    toast.add({ title: err.data?.statusMessage || t('failedToJoin'), color: 'error' })
  } finally {
    joining.value = false
  }
}

const showLoginPrompt = () => {
  toast.add({ title: t('pleaseSignIn'), color: 'info' })
}
</script>
