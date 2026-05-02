<template>
  <nav class="fixed bottom-0 left-0 right-0 z-40 border-t border-default bg-default lg:hidden" :style="{ paddingBottom: safeAreaBottom }" aria-label="Mobile navigation">
    <div class="flex items-center justify-around" :style="{ height: '56px' }">
      <template v-for="tab in tabs" :key="tab.to">
        <button
          v-if="tab.action"
          class="flex flex-col items-center gap-0.5 px-3 py-2 transition-colors"
          :class="isActive(tab.to) ? 'text-primary' : 'text-muted hover:text-default'"
          @click="tab.action"
        >
          <UIcon :name="tab.icon" class="size-5" />
          <span class="text-[10px] font-medium leading-tight">{{ tab.label }}</span>
        </button>
        <NuxtLink
          v-else
          :to="tab.to"
          class="flex flex-col items-center gap-0.5 px-3 py-2 transition-colors"
          :class="isActive(tab.to) ? 'text-primary' : 'text-muted hover:text-default'"
          active-class=""
        >
          <UIcon :name="tab.icon" class="size-5" />
          <span class="text-[10px] font-medium leading-tight">{{ tab.label }}</span>
        </NuxtLink>
      </template>
    </div>
  </nav>

  <GameAiSetupModal v-model="showAiModal" />
</template>

<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()

const showAiModal = ref(false)

const tabs = computed(() => [
  { to: '/', icon: 'i-lucide-home', label: t('home') },
  { to: '/play-ai', icon: 'i-lucide-bot', label: t('playAI'), action: () => { showAiModal.value = true } },
  { to: '/import', icon: 'i-lucide-upload', label: t('importPGN') },
  { to: '/friends', icon: 'i-lucide-users', label: t('friends') },
])

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const safeAreaBottom = ref('0px')
onMounted(() => {
  const update = () => {
    const env = getComputedStyle(document.documentElement).getPropertyValue('--sab')?.trim()
    safeAreaBottom.value = env || `${window.visualViewport?.offsetTop || 0}px`
  }
  update()
  window.visualViewport?.addEventListener('resize', update)
  onUnmounted(() => window.visualViewport?.removeEventListener('resize', update))
})
</script>
