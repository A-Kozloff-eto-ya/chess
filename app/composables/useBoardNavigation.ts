export function useBoardNavigation(options: {
  goNext: () => void
  goPrev: () => void
  goFirst: () => void
  goLast: () => void
}) {
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); options.goNext() }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); options.goPrev() }
    else if (e.key === 'Home') { e.preventDefault(); options.goFirst() }
    else if (e.key === 'End') { e.preventDefault(); options.goLast() }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })

  return { handleKeydown }
}
