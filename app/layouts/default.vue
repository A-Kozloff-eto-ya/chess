<template>
  <div class="flex h-screen flex-col bg-default text-default">
    <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-inverted">Skip to content</a>
    <CommonAppHeader />
    <main id="main-content" role="main" class="mx-auto min-h-0 w-full max-w-7xl flex-1 px-4 py-4">
      <slot />
    </main>
  </div>
</template>
