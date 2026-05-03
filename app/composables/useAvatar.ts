const DEFAULT_AVATAR = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="20" fill="#71717a"/><circle cx="20" cy="15" r="7" fill="#a1a1aa"/><ellipse cx="20" cy="38" rx="14" ry="14" fill="#a1a1aa"/></svg>`)}`

export function useAvatar() {
  const resolveAvatar = (avatar: string | null | undefined): string => {
    if (avatar && avatar !== '/default-avatar.png') return avatar
    return DEFAULT_AVATAR
  }

  return { resolveAvatar }
}
