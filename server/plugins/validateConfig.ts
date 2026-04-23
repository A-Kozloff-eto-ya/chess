export default defineNitroPlugin(() => {
  if (import.meta.prerender) return

  const password = useRuntimeConfig().session.password
  if (!password || password.length < 32) {
    throw new Error(
      'NUXT_SESSION_PASSWORD must be at least 32 characters. ' +
      'Set it in your .env file.'
    )
  }
})
