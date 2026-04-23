export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key')
  if (!key || !key.startsWith('avatars/')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid key' })
  }

  return blob.serve(event, key)
})
