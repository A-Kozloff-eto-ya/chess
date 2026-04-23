<template>
  <div class="flex h-screen flex-col bg-gray-950 text-white">
    <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-amber-500 focus:px-4 focus:py-2 focus:text-black">{{ t('skipToContent') }}</a>
    <CommonAppHeader />
    <main id="main-content" role="main" class="min-h-0 flex-1 p-4">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
</script>
