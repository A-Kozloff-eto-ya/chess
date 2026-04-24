<script setup lang="ts">
const selectedTab = ref('buttons')
const inputValue = ref('')
const textareaValue = ref('')
const selectValue = ref('')
const toggleValue = ref(false)
const sliderValue = ref(50)
const progressValue = ref(65)

const selectItems = [
  { label: 'Option A', value: 'a' },
  { label: 'Option B', value: 'b' },
  { label: 'Option C', value: 'c' }
]

const tabs = [
  { label: 'Buttons', value: 'buttons' },
  { label: 'Inputs', value: 'inputs' },
  { label: 'Feedback', value: 'feedback' },
  { label: 'Data Display', value: 'data' },
  { label: 'Layout', value: 'layout' }
]
</script>

<template>
  <div class="flex flex-col gap-8">
    <div>
      <h1 class="text-3xl font-bold mb-2">Theme Showcase</h1>
      <p class="text-muted text-sm">Use the theme picker in the header to customize colors, radius, and color mode.</p>
    </div>

    <UTabs v-model="selectedTab" :items="tabs">
      <template #buttons>
        <div class="flex flex-col gap-6 mt-4">
          <UCard>
            <template #header><span class="font-semibold">Button Variants</span></template>
            <div class="flex flex-wrap gap-3">
              <UButton label="Solid" variant="solid" />
              <UButton label="Soft" variant="soft" />
              <UButton label="Outline" variant="outline" />
              <UButton label="Ghost" variant="ghost" />
              <UButton label="Subtle" variant="subtle" />
              <UButton label="Link" variant="link" />
            </div>
          </UCard>

          <UCard>
            <template #header><span class="font-semibold">Button Colors</span></template>
            <div class="flex flex-wrap gap-3">
              <UButton label="Primary" color="primary" />
              <UButton label="Secondary" color="secondary" />
              <UButton label="Success" color="success" />
              <UButton label="Info" color="info" />
              <UButton label="Warning" color="warning" />
              <UButton label="Error" color="error" />
              <UButton label="Neutral" color="neutral" />
            </div>
          </UCard>

          <UCard>
            <template #header><span class="font-semibold">Button Sizes</span></template>
            <div class="flex flex-wrap items-center gap-3">
              <UButton label="XS" size="xs" />
              <UButton label="SM" size="sm" />
              <UButton label="MD" size="md" />
              <UButton label="LG" size="lg" />
              <UButton label="XL" size="xl" />
            </div>
          </UCard>

          <UCard>
            <template #header><span class="font-semibold">Button with Icons</span></template>
            <div class="flex flex-wrap gap-3">
              <UButton label="Download" icon="i-lucide-download" />
              <UButton label="Settings" icon="i-lucide-settings" variant="soft" />
              <UButton label="Delete" icon="i-lucide-trash" color="error" variant="outline" />
              <UButton icon="i-lucide-plus" size="md" />
              <UButton icon="i-lucide-heart" color="error" variant="soft" />
            </div>
          </UCard>

          <UCard>
            <template #header><span class="font-semibold">Loading & Disabled</span></template>
            <div class="flex flex-wrap gap-3">
              <UButton label="Loading..." loading />
              <UButton label="Disabled" disabled />
              <UButton label="Disabled" variant="outline" disabled />
            </div>
          </UCard>
        </div>
      </template>

      <template #inputs>
        <div class="flex flex-col gap-6 mt-4">
          <UCard>
            <template #header><span class="font-semibold">Text Inputs</span></template>
            <div class="flex flex-col gap-4">
              <UFormField label="Default Input">
                <UInput v-model="inputValue" placeholder="Type something..." />
              </UFormField>
              <UFormField label="With Icon">
                <UInput icon="i-lucide-search" placeholder="Search..." />
              </UFormField>
              <UFormField label="Textarea">
                <UTextarea v-model="textareaValue" placeholder="Write a message..." :rows="3" />
              </UFormField>
            </div>
          </UCard>

          <UCard>
            <template #header><span class="font-semibold">Select</span></template>
            <div class="flex flex-col gap-4">
              <UFormField label="Choose option">
                <USelect v-model="selectValue" :items="selectItems" placeholder="Select..." class="w-full" />
              </UFormField>
            </div>
          </UCard>

          <UCard>
            <template #header><span class="font-semibold">Toggle & Slider</span></template>
            <div class="flex flex-col gap-4">
              <div class="flex items-center gap-3">
                <USwitch v-model="toggleValue" />
                <span class="text-sm">Toggle is {{ toggleValue ? 'ON' : 'OFF' }}</span>
              </div>
              <UFormField label="Slider">
                <USlider v-model="sliderValue" />
                <div class="flex justify-between text-xs text-muted mt-1">
                  <span>0</span>
                  <span>{{ sliderValue }}</span>
                  <span>100</span>
                </div>
              </UFormField>
            </div>
          </UCard>
        </div>
      </template>

      <template #feedback>
        <div class="flex flex-col gap-6 mt-4">
          <UCard>
            <template #header><span class="font-semibold">Alerts</span></template>
            <div class="flex flex-col gap-3">
              <UAlert title="Success" description="Operation completed successfully." color="success" icon="i-lucide-check-circle" />
              <UAlert title="Info" description="Here is some useful information." color="info" icon="i-lucide-info" />
              <UAlert title="Warning" description="Please review before continuing." color="warning" icon="i-lucide-triangle-alert" />
              <UAlert title="Error" description="Something went wrong." color="error" icon="i-lucide-circle-x" />
              <UAlert title="Primary" description="A primary alert message." color="primary" icon="i-lucide-megaphone" />
            </div>
          </UCard>

          <UCard>
            <template #header><span class="font-semibold">Badges</span></template>
            <div class="flex flex-wrap gap-2">
              <UBadge label="Primary" color="primary" />
              <UBadge label="Secondary" color="secondary" />
              <UBadge label="Success" color="success" />
              <UBadge label="Info" color="info" />
              <UBadge label="Warning" color="warning" />
              <UBadge label="Error" color="error" />
              <UBadge label="Neutral" color="neutral" />
            </div>
            <div class="flex flex-wrap gap-2 mt-3">
              <UBadge label="Solid" variant="solid" />
              <UBadge label="Soft" variant="soft" />
              <UBadge label="Outline" variant="outline" />
              <UBadge label="Subtle" variant="subtle" />
            </div>
          </UCard>

          <UCard>
            <template #header><span class="font-semibold">Progress</span></template>
            <div class="flex flex-col gap-3">
              <UProgress :model-value="progressValue" />
              <div class="flex gap-2">
                <UButton size="xs" label="-10" @click="progressValue = Math.max(0, progressValue - 10)" />
                <UButton size="xs" label="+10" @click="progressValue = Math.min(100, progressValue + 10)" />
              </div>
              <div class="flex flex-col gap-2 mt-2">
                <UProgress :model-value="25" color="success" />
                <UProgress :model-value="50" color="warning" />
                <UProgress :model-value="75" color="error" />
              </div>
            </div>
          </UCard>
        </div>
      </template>

      <template #data>
        <div class="flex flex-col gap-6 mt-4">
          <UCard>
            <template #header><span class="font-semibold">Avatar</span></template>
            <div class="flex gap-3">
              <UAvatar src="https://avatars.githubusercontent.com/u/1?v=4" alt="User" />
              <UAvatar label="JD" />
              <UAvatar label="AB" />
              <UAvatar icon="i-lucide-user" />
            </div>
          </UCard>

          <UCard>
            <template #header><span class="font-semibold">Chip</span></template>
            <div class="flex gap-3">
              <UChip text="3">
                <UButton icon="i-lucide-bell" variant="outline" />
              </UChip>
              <UChip text="99">
                <UButton icon="i-lucide-mail" variant="outline" />
              </UChip>
              <UChip color="success">
                <UButton icon="i-lucide-bell" variant="outline" />
              </UChip>
            </div>
          </UCard>

          <UCard>
            <template #header><span class="font-semibold">Tooltip</span></template>
            <div class="flex gap-3">
              <UTooltip text="Edit item">
                <UButton icon="i-lucide-pen" variant="outline" />
              </UTooltip>
              <UTooltip text="Delete item">
                <UButton icon="i-lucide-trash" variant="outline" color="error" />
              </UTooltip>
              <UTooltip text="Copy to clipboard">
                <UButton icon="i-lucide-copy" variant="outline" />
              </UTooltip>
            </div>
          </UCard>

          <UCard>
            <template #header><span class="font-semibold">Dropdown Menu</span></template>
            <div class="flex gap-3">
              <UDropdownMenu :items="[[{ label: 'Profile', icon: 'i-lucide-user' }, { label: 'Settings', icon: 'i-lucide-settings' }], [{ label: 'Logout', icon: 'i-lucide-log-out', color: 'error' }]]">
                <UButton label="Menu" icon="i-lucide-chevron-down" variant="outline" />
              </UDropdownMenu>
            </div>
          </UCard>
        </div>
      </template>

      <template #layout>
        <div class="flex flex-col gap-6 mt-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UCard>
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-star" class="text-amber-400" />
                  <span class="font-semibold">Card with Header</span>
                </div>
              </template>
              <p class="text-sm text-muted">This card has a header and footer to demonstrate card styling.</p>
              <template #footer>
                <div class="flex gap-2">
                  <UButton label="Action" size="sm" />
                  <UButton label="Cancel" size="sm" variant="outline" />
                </div>
              </template>
            </UCard>

            <UCard>
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-settings" class="text-primary" />
                  <span class="font-semibold">Settings Card</span>
                </div>
              </template>
              <div class="flex flex-col gap-3">
                <div class="flex items-center justify-between">
                  <span class="text-sm">Enable notifications</span>
                  <USwitch />
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm">Dark mode</span>
                  <USwitch :model-value="true" />
                </div>
              </div>
            </UCard>
          </div>

          <UCard>
            <template #header><span class="font-semibold">Typography</span></template>
            <div class="flex flex-col gap-2">
              <h1 class="text-4xl font-bold">Heading 1</h1>
              <h2 class="text-3xl font-bold">Heading 2</h2>
              <h3 class="text-2xl font-bold">Heading 3</h3>
              <h4 class="text-xl font-bold">Heading 4</h4>
              <p class="text-base">Regular paragraph text with <strong>bold</strong> and <em>italic</em> and <code class="bg-elevated rounded px-1 py-0.5 text-sm">inline code</code>.</p>
              <p class="text-sm text-muted">Small muted text for secondary information.</p>
              <p class="text-xs text-dimmed">Extra small dimmed text for tertiary content.</p>
            </div>
          </UCard>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="rounded-lg border border-default bg-primary/10 p-4 text-center">
              <p class="text-2xl font-bold text-primary">128</p>
              <p class="text-xs text-muted mt-1">Primary stat</p>
            </div>
            <div class="rounded-lg border border-default bg-success/10 p-4 text-center">
              <p class="text-2xl font-bold text-success">96%</p>
              <p class="text-xs text-muted mt-1">Success rate</p>
            </div>
            <div class="rounded-lg border border-default bg-warning/10 p-4 text-center">
              <p class="text-2xl font-bold text-warning">7</p>
              <p class="text-xs text-muted mt-1">Warnings</p>
            </div>
            <div class="rounded-lg border border-default bg-error/10 p-4 text-center">
              <p class="text-2xl font-bold text-error">3</p>
              <p class="text-xs text-muted mt-1">Errors</p>
            </div>
          </div>
        </div>
      </template>
    </UTabs>
  </div>
</template>
