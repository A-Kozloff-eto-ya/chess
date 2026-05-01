<template>
  <div class="flex flex-col bg-default text-default lg:h-screen">
    <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-inverted">Skip to content</a>
    <CommonAppHeader />
    <main id="main-content" role="main" class="mx-auto w-full flex-1 px-3 py-4 lg:min-h-0 lg:max-w-7xl lg:px-4 lg:py-4">
      <slot />
    </main>
    <ClientOnly>
      <CommonMobileTabBar />
    </ClientOnly>
  </div>
</template>
