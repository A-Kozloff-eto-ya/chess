<template>
  <UDropdownMenu :items="localeItems">
    <UButton :label="currentLabel" icon="i-lucide-languages" variant="ghost" size="sm" />
  </UDropdownMenu>
</template>

<script setup lang="ts">
const { locale } = useI18n()

const availableLocales = [
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Русский' },
]

const currentLabel = computed(() => {
  return availableLocales.find(l => l.code === locale.value)?.name || locale.value
})

const localeItems = computed(() =>
  availableLocales
    .filter(l => l.code !== locale.value)
    .map(l => ({
      label: l.name,
      icon: l.code === 'en' ? 'i-lucide-globe' : 'i-lucide-globe-2',
      onSelect: () => { locale.value = l.code },
    }))
)
</script>
