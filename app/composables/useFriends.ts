export function useFriends() {
  const toast = useToast()
  const { t } = useI18n()

  const sendFriendRequest = async (userId: number): Promise<boolean> => {
    try {
      await $fetch('/api/friends/request', {
        method: 'POST',
        body: { userId },
      })
      toast.add({ title: t('friendRequestSent'), color: 'success' })
      return true
    } catch (e: any) {
      const err = e as { data?: { statusMessage?: string } }
      toast.add({ title: err.data?.statusMessage || t('failedToSendRequest'), color: 'error' })
      return false
    }
  }

  const removeFriend = async (userId: number, username: string): Promise<boolean> => {
    try {
      await $fetch('/api/friends/remove', {
        method: 'POST',
        body: { userId },
      })
      toast.add({ title: t('removedFromFriends', { username }), color: 'success' })
      return true
    } catch (e: any) {
      const err = e as { data?: { statusMessage?: string } }
      toast.add({ title: err.data?.statusMessage || t('failedToRemoveFriend'), color: 'error' })
      return false
    }
  }

  return { sendFriendRequest, removeFriend }
}
