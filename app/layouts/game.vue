<template>
  <div class="flex h-screen flex-col bg-default text-default">
    <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-inverted">Skip to content</a>
    <CommonAppHeader />
    <main id="main-content" role="main" class="min-h-0 flex-1 p-4">
      <slot />
    </main>
  </div>
</template>
