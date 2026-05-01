<script setup lang="ts">
import colors from 'tailwindcss/colors'

const props = defineProps<{
  label: string
  icon?: string
  chip?: string
  selected?: boolean
}>()

const slots = defineSlots<{
  leading: () => any
}>()

function getColor(color: string, shade: number) {
  return (colors as any)[color]?.[shade] ?? ''
}
</script>

<template>
  <UButton
    size="sm"
    color="neutral"
    variant="outline"
    :icon="icon"
    :label="label"
    class="capitalize ring-default rounded-sm text-[11px]"
    :class="[selected ? 'bg-elevated' : 'hover:bg-elevated/50']"
  >
    <template v-if="chip || !!slots.leading" #leading>
      <slot name="leading">
        <span
          class="block size-2 shrink-0 rounded-full"
          :class="`bg-(--color-light) dark:bg-(--color-dark)`"
          :style="{
            '--color-light': getColor(props.chip!, 500),
            '--color-dark': getColor(props.chip!, 400)
          }"
        />
      </slot>
    </template>
  </UButton>
</template>
