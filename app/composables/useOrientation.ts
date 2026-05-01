import { ref, onMounted, onUnmounted } from 'vue'

export function useOrientation() {
  const isLandscape = ref(false)
  const isMobile = ref(false)

  const update = () => {
    isMobile.value = window.innerWidth < 1024
    isLandscape.value = isMobile.value && window.innerWidth > window.innerHeight
  }

  let mql: MediaQueryList | null = null

  onMounted(() => {
    update()
    mql = window.matchMedia('(orientation: landscape)')
    mql.addEventListener('change', update)
    window.addEventListener('resize', update)
  })

  onUnmounted(() => {
    mql?.removeEventListener('change', update)
    window.removeEventListener('resize', update)
  })

  return { isLandscape, isMobile }
}
