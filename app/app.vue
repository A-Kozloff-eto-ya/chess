<script setup lang="ts">
const { style } = useTheme()

useSettings()

useHead({
  style,
  script: [
    {
      innerHTML: `
(function() {
  var primaryColor = localStorage.getItem('nuxt-ui-primary');
  var neutralColor = localStorage.getItem('nuxt-ui-neutral');
  if (!primaryColor && !neutralColor) return;
  function swapColors(el) {
    var html = el.innerHTML;
    if (primaryColor && primaryColor !== 'green') {
      html = html.replace(/(--ui-color-primary-\\d{2,3}:\\s*var\\(--color-)\\w+(-\\d{2,3}[^)]*\\))/g, '$1' + primaryColor + '$2');
    }
    if (neutralColor && neutralColor !== 'slate') {
      var n = neutralColor === 'neutral' ? 'old-neutral' : neutralColor;
      html = html.replace(/(--ui-color-neutral-\\d{2,3}:\\s*var\\(--color-)\\w+(-\\d{2,3}[^)]*\\))/g, '$1' + n + '$2');
    }
    el.innerHTML = html;
  }
  var el = document.querySelector('style#nuxt-ui-colors');
  if (el) swapColors(el);
  else requestAnimationFrame(function() { var e = document.getElementById('nuxt-ui-colors'); if (e) swapColors(e); });
})();
if (localStorage.getItem('nuxt-ui-radius')) {
  var rEl = document.querySelector('style#nuxt-ui-radius');
  if (rEl) rEl.innerHTML = ':root { --ui-radius: ' + localStorage.getItem('nuxt-ui-radius') + 'rem; }';
}
if (localStorage.getItem('nuxt-ui-black-as-primary') === 'true') {
  var bEl = document.querySelector('style#nuxt-ui-black-as-primary');
  if (bEl) bEl.innerHTML = ':root { --ui-primary: black; } .dark { --ui-primary: white; }';
}`,
      tagPriority: -3,
      id: 'nuxt-ui-theme-init'
    }
  ]
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
