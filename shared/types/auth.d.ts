declare module '#auth-utils' {
  interface User {
    id: number
    username: string
    email: string
    avatar: string | null
    rating: number
  }

  interface UserSession {
    user: User
  }
}

export {}
