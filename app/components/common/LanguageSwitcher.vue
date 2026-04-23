<template>
  <UDropdownMenu :items="localeItems">
    <UButton :label="currentLabel" icon="i-lucide-languages" variant="ghost" size="sm" />
  </UDropdownMenu>
</template>

<script setup lang="ts">
const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const currentLabel = computed(() => {
  return (locales.value as { code: string; name: string }[]).find(l => l.code === locale.value)?.name || locale.value
})

const localeItems = computed(() =>
  (locales.value as { code: string; name: string }[])
    .filter(l => l.code !== locale.value)
    .map(l => ({
      label: l.name,
      icon: l.code === 'en' ? 'i-lucide-globe' : 'i-lucide-globe-2',
      onSelect: () => { locale.value = l.code },
    }))
)
</script>
