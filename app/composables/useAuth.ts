export function useAuth() {
  const { clear } = useUserSession()
  const toast = useToast()
  const { t } = useI18n()

  const logout = async (beforeNavigate?: () => void) => {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
      await clear()
      beforeNavigate?.()
      toast.add({ title: t('signedOut'), color: 'success' })
      await navigateTo('/')
    } catch {
      toast.add({ title: t('signedOut'), color: 'success' })
      await clear()
      beforeNavigate?.()
      await navigateTo('/')
    }
  }

  return { logout }
}
