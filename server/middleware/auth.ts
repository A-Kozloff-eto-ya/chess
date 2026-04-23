export default defineEventHandler(async (event) => {
  const path = event.path
  if (path.startsWith('/api/') && !path.startsWith('/api/auth/') && !path.startsWith('/api/_') && !path.startsWith('/api/engine/') && !path.startsWith('/api/users/avatar-serve/')) {
    await requireUserSession(event)
  }
})
