import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE = 2 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({ statusCode: 400, statusMessage: 'No file provided' })
  }

  const file = formData.find(f => f.name === 'avatar')
  if (!file) {
    throw createError({ statusCode: 400, statusMessage: 'No avatar field' })
  }

  if (!ALLOWED_TYPES.includes(file.type || '')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid file type. Use JPEG, PNG, GIF, or WebP' })
  }

  if (file.data.length > MAX_SIZE) {
    throw createError({ statusCode: 400, statusMessage: 'File too large. Max 2MB' })
  }

  const ext = file.filename?.split('.').pop() || 'jpg'
  const key = `avatars/${session.user.id}_${Date.now()}.${ext}`

  try {
    await blob.put(key, file.data, {
      type: file.type,
      addRandomSuffix: false,
    })
  } catch (e: any) {
    console.error('[Avatar] blob.put failed:', e.message)
    throw createError({ statusCode: 500, statusMessage: 'Failed to save avatar: ' + e.message })
  }

  const url = `/api/users/avatar-serve/${key}`

  await db.update(users).set({ avatar: url }).where(eq(users.id, session.user.id))

  await setUserSession(event, {
    user: {
      id: session.user.id,
      username: session.user.username,
      email: session.user.email,
      avatar: url,
      rating: session.user.rating,
    },
  })

  return { avatar: url }
})
