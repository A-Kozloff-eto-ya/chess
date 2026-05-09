export function useGameJoin() {
  const toast = useToast()
  const { t } = useI18n()

  const joinByCode = async (code: string): Promise<string | null> => {
    if (code.length !== 6) return null
    try {
      const { gameId } = await $fetch<{ gameId: string }>('/api/games/join', {
        method: 'POST',
        body: { inviteCode: code.toUpperCase() },
      })
      return gameId
    } catch (e: any) {
      const err = e as { data?: { statusMessage?: string } }
      toast.add({ title: err.data?.statusMessage || t('failedToJoin'), color: 'error' })
      return null
    }
  }

  return { joinByCode }
}
